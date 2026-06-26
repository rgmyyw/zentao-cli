import { parseCommandInput } from './core/cli-registry.js';
import {
  formatCommandOutput,
  getBuiltinCommandHelp,
  printCommandHelp,
  printCommandList,
  printHelp,
  renderChangelog,
  type ChangelogOptions,
} from './core/cli-output.js';
import { loadConfig } from './core/config.js';
import { buildRegistryForCommand, buildRegistryForRole, getAvailableCommandNames } from './core/manifest.js';
import { getRequestCount, getLastRequestDurationMs } from './core/http-metrics.js';
import { looksLikeUrlIntentInput, parseUrlIntent, resolveExecutableUrlIntent, type ParsedUrlIntent } from './core/url-intent.js';
import { resolveRecommendations } from './core/recommendations.js';
import { runInstallCommand, runUninstallCommand, runUpdateCommand } from './install.js';
import { setGlobalOutputMode, type OutputMode } from './tools/shared.js';
import type { Role } from './types/common.js';
import { runDailyUpdateProbe } from './update-probe.js';
import { CLI_VERSION } from './version.js';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);

const BUILTIN_COMMAND_NAMES = ['help', 'list', 'version', 'changelog', 'install', 'uninstall', 'remove', 'update', 'upgrade'];

export async function runCli(rawArgs: string[]): Promise<void> {
  const { role, commandName, commandArgs, outputMode, directIntent, recommend } = parseCliArgs(rawArgs);
  setGlobalOutputMode(outputMode);
  const registeredCommandNames = await getAvailableCommandNames(role);
  const commandNames = [...BUILTIN_COMMAND_NAMES, ...registeredCommandNames]
    .sort((left, right) => left.localeCompare(right));

  if (!commandName || commandName === '--help' || commandName === '-h') {
    ensureNoUnexpectedBuiltinArgs('help', commandArgs);
    printHelp(role, registeredCommandNames);
    return;
  }

  if (commandName === 'help') {
    const helpTargets = commandArgs.filter((arg) => arg !== '--help' && arg !== '-h');
    if (helpTargets.length === 0) {
      printHelp(role, registeredCommandNames);
      return;
    }

    const normalizedTarget = normalizeCommandInput(helpTargets[0], helpTargets.slice(1), role);
    if (normalizedTarget.directIntent && normalizedTarget.directIntent.action !== 'execute') {
      process.stdout.write(`${JSON.stringify(normalizedTarget.directIntent)}\n`);
      return;
    }
    const targetCommandName = normalizedTarget.commandName;
    if (!targetCommandName) {
      printHelp(role, registeredCommandNames);
      return;
    }
    const remainingTargetArgs = helpTargets.slice(1 + normalizedTarget.consumedArgs);
    if (remainingTargetArgs.length > 0) {
      throw new Error(`help 只支持一个命令目标，检测到多余参数: ${remainingTargetArgs.join(' ')}`);
    }
    const builtinHelp = getBuiltinCommandHelp(targetCommandName);
    if (builtinHelp) {
      process.stdout.write(`${builtinHelp}\n`);
      return;
    }
    const targetRegistry = await buildRegistryForCommand(role, targetCommandName);
    const targetCommandDef = targetRegistry.getCommand(targetCommandName);
    if (!targetCommandDef) {
      throw new Error(`未找到命令: ${targetCommandName}`);
    }
    printCommandHelp(targetCommandDef.name, targetCommandDef.schema, targetCommandDef.metadata);
    return;
  }

  if (commandName === '--version' || commandName === '-v' || commandName === 'version') {
    if (hasHelpFlag(commandArgs)) {
      ensureNoUnexpectedBuiltinArgs('version', commandArgs);
      process.stdout.write(`${getBuiltinCommandHelp('version')}\n`);
      return;
    }
    ensureNoUnexpectedBuiltinArgs('version', commandArgs);
    process.stdout.write(`${CLI_VERSION}\n`);
    return;
  }

  if (commandName === 'list') {
    if (hasHelpFlag(commandArgs)) {
      ensureNoUnexpectedBuiltinArgs('list', commandArgs.filter((arg) => arg !== '--raw'));
      process.stdout.write(`${getBuiltinCommandHelp('list')}\n`);
      return;
    }
    const listOptions = parseListOptions(commandArgs);
    if (listOptions.raw) {
      for (const item of commandNames) {
        process.stdout.write(`${item}\n`);
      }
      return;
    }
    printCommandList(role, registeredCommandNames, BUILTIN_COMMAND_NAMES);
    return;
  }

  if (commandName === 'changelog') {
    if (hasHelpFlag(commandArgs)) {
      ensureNoUnexpectedBuiltinArgs('changelog', commandArgs);
      process.stdout.write(`${getBuiltinCommandHelp('changelog')}\n`);
      return;
    }
    const options = parseChangelogOptions(commandArgs);
    process.stdout.write(`${await renderChangelog(options)}\n`);
    return;
  }

  if (commandName === 'install') {
    if (hasHelpFlag(commandArgs)) {
      process.stdout.write(`${getBuiltinCommandHelp('install')}\n`);
      return;
    }
    await runInstallCommand(commandArgs);
    return;
  }

  if (commandName === 'update' || commandName === 'upgrade') {
    if (hasHelpFlag(commandArgs)) {
      process.stdout.write(`${getBuiltinCommandHelp(commandName)}\n`);
      return;
    }
    await runUpdateCommand(commandArgs);
    return;
  }

  if (commandName === 'uninstall' || commandName === 'remove') {
    if (hasHelpFlag(commandArgs)) {
      process.stdout.write(`${getBuiltinCommandHelp(commandName)}\n`);
      return;
    }
    await runUninstallCommand(commandArgs);
    return;
  }

  if (directIntent && directIntent.action !== 'execute') {
    process.stdout.write(`${JSON.stringify(directIntent)}\n`);
    return;
  }

  const registry = await buildRegistryForCommand(role, commandName);
  const command = registry.getCommand(commandName);
  if (!command) {
    throw new Error(`未找到命令: ${commandName}`);
  }

  if (hasHelpFlag(commandArgs)) {
    printCommandHelp(command.name, command.schema, command.metadata);
    return;
  }

  await runDailyUpdateProbe(commandName);

  const requestCountBefore = getRequestCount();
  const input = parseCommandInput(command.schema, commandArgs);
  const result = await command.handler(input);
  let text = result.content[0]?.text ?? '';
  if (recommend) {
    text = await injectRecommendations(text, command, input, registeredCommandNames, role);
  }
  process.stdout.write(`${await formatCommandOutput(command.name, appendCommandMeta(text, requestCountBefore))}\n`);
}

async function injectRecommendations(
  text: string,
  command: { name: string; metadata?: import('./core/cli-registry.js').CliCommandMetadata },
  input: Record<string, unknown>,
  registeredCommandNames: string[],
  role: Role,
): Promise<string> {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return text;
  }

  const fullRegistry = await buildRegistryForRole(role);
  const next = resolveRecommendations({
    command: { metadata: command.metadata },
    input,
    payload,
    availableCommandNames: registeredCommandNames,
    registry: fullRegistry,
  });

  if (next.length === 0) return text;

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return text;
  }

  const record = payload as Record<string, unknown>;
  const existingMeta = typeof record.meta === 'object' && record.meta !== null && !Array.isArray(record.meta)
    ? record.meta as Record<string, unknown>
    : {};
  record.meta = { ...existingMeta, next };
  return JSON.stringify(record);
}

function appendCommandMeta(text: string, requestCountBefore: number): string {
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;
    const requestCountAfter = getRequestCount();
    payload.meta = {
      ...(typeof payload.meta === 'object' && payload.meta !== null ? payload.meta as Record<string, unknown> : {}),
      requestCount: Math.max(requestCountAfter - requestCountBefore, 0),
      durationMs: getLastRequestDurationMs(),
    };
    return JSON.stringify(payload);
  } catch {
    return text;
  }
}

function parseListOptions(args: string[]): { raw: boolean } {
  const unexpectedArgs = args.filter((arg) => arg !== '--raw');
  if (unexpectedArgs.length > 0) {
    throw new Error(`list 不支持额外参数: ${unexpectedArgs.join(' ')}`);
  }

  return { raw: args.includes('--raw') };
}

function parseChangelogOptions(args: string[]): ChangelogOptions {
  const options: ChangelogOptions = { limit: 5, raw: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--raw') {
      options.raw = true;
      continue;
    }

    if (arg === '--limit' || arg.startsWith('--limit=')) {
      const value = arg.startsWith('--limit=') ? arg.slice('--limit='.length) : args[++index];
      if (value === undefined) {
        throw new Error('changelog --limit 需要一个值');
      }
      if (value === 'all') {
        options.limit = 'all';
        continue;
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`changelog --limit 必须是正整数或 all，收到: ${value}`);
      }
      options.limit = parsed;
      continue;
    }

    if (arg === '--version' || arg.startsWith('--version=')) {
      const value = arg.startsWith('--version=') ? arg.slice('--version='.length) : args[++index];
      if (!value) {
        throw new Error('changelog --version 需要一个值');
      }
      options.version = value;
      continue;
    }

    if (arg === '--since' || arg.startsWith('--since=')) {
      const value = arg.startsWith('--since=') ? arg.slice('--since='.length) : args[++index];
      if (!value) {
        throw new Error('changelog --since 需要一个值');
      }
      options.since = value;
      continue;
    }

    throw new Error(`changelog 不支持参数: ${arg}`);
  }

  return options;
}

function parseCliArgs(rawArgs: string[]): { role: Role; commandName?: string; commandArgs: string[]; outputMode: OutputMode; directIntent?: ParsedUrlIntent; recommend: boolean } {
  const args = [...rawArgs];
  let role: Role = 'full';
  let outputMode: OutputMode = 'compact';
  let recommend = false;

  const inlineRoleArg = args[0];
  if (inlineRoleArg?.startsWith('--role=') || inlineRoleArg?.startsWith('-r=')) {
    const roleValue = inlineRoleArg.startsWith('--role=')
      ? inlineRoleArg.slice('--role='.length)
      : inlineRoleArg.slice('-r='.length);
    if (!roleValue || !VALID_ROLES.has(roleValue as Role)) {
      throw new Error(`无效 role: ${String(roleValue)}`);
    }
    role = roleValue as Role;
    args.shift();
  }

  if (args[0] === '--role' || args[0] === '-r') {
    const roleValue = args[1];
    if (!roleValue || !VALID_ROLES.has(roleValue as Role)) {
      throw new Error(`无效 role: ${String(roleValue)}`);
    }
    role = roleValue as Role;
    args.splice(0, 2);
  } else if (args[0] && VALID_ROLES.has(args[0] as Role)) {
    role = args.shift() as Role;
  }

  const inlineOutputArgIndex = args.findIndex((arg) => arg.startsWith('--output='));
  if (inlineOutputArgIndex >= 0) {
    const value = args[inlineOutputArgIndex].slice('--output='.length) as OutputMode;
    assertOutputMode(value);
    outputMode = value;
    args.splice(inlineOutputArgIndex, 1);
  }

  const outputArgIndex = args.findIndex((arg) => arg === '--output');
  if (outputArgIndex >= 0) {
    const value = args[outputArgIndex + 1] as OutputMode | undefined;
    if (!value) throw new Error('--output 需要一个值');
    assertOutputMode(value);
    outputMode = value;
    args.splice(outputArgIndex, 2);
  }

  const recommendInlineIndex = args.findIndex((arg) => arg === '--recommend' || arg.startsWith('--recommend='));
  if (recommendInlineIndex >= 0) {
    const token = args[recommendInlineIndex];
    if (token.startsWith('--recommend=')) {
      const value = token.slice('--recommend='.length).trim().toLowerCase();
      recommend = value === 'true' || value === '1' || value === 'yes' || value === 'on';
    } else {
      recommend = true;
    }
    args.splice(recommendInlineIndex, 1);
  } else if (args[0] === '--recommend') {
    recommend = true;
    args.shift();
  }

  const normalized = normalizeCommandInput(args.shift(), args, role);
  let commandName = normalized.commandName;
  if (normalized.consumedArgs > 0) {
    args.splice(0, normalized.consumedArgs);
  }
  if (normalized.prependedArgs.length > 0) {
    args.unshift(...normalized.prependedArgs);
  }

  return { role, commandName, commandArgs: args, outputMode, directIntent: normalized.directIntent, recommend };
}

function assertOutputMode(value: string): asserts value is OutputMode {
  if (!['compact', 'normal', 'verbose'].includes(value)) {
    throw new Error(`无效 output: ${value}`);
  }
}

function normalizeCommandInput(
  commandName?: string,
  args: string[] = [],
  role?: Role,
): { commandName?: string; consumedArgs: number; prependedArgs: string[]; directIntent?: ParsedUrlIntent } {
  const normalizedAlias = normalizeCommandAlias(commandName, args);
  const directIntent = normalizedAlias.commandName && looksLikeUrlIntentInput(normalizedAlias.commandName)
    ? parseUrlIntent(normalizedAlias.commandName, { serverUrl: loadConfig()?.url, role })
    : undefined;
  const executableIntent = directIntent ? resolveExecutableUrlIntent(directIntent) : undefined;

  return {
    commandName: executableIntent?.commandName ?? normalizedAlias.commandName,
    consumedArgs: normalizedAlias.consumedArgs,
    prependedArgs: executableIntent?.commandArgs ?? [],
    directIntent,
  };
}

function normalizeCommandAlias(
  commandName?: string,
  args: string[] = [],
): { commandName?: string; consumedArgs: number } {
  if (commandName === 'who' && args[0] === 'am' && args[1] === 'i') {
    return { commandName: 'whoami', consumedArgs: 2 };
  }

  return { commandName, consumedArgs: 0 };
}

function hasHelpFlag(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function ensureNoUnexpectedBuiltinArgs(commandName: string, args: string[]): void {
  const unexpectedArgs = args.filter((arg) => arg !== '--help' && arg !== '-h');
  if (unexpectedArgs.length > 0) {
    throw new Error(`${commandName} 不支持额外参数: ${unexpectedArgs.join(' ')}`);
  }
}
