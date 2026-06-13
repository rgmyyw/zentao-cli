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
import { buildRegistryForCommand, getAvailableCommandNames } from './core/manifest.js';
import { runInstallCommand, runUninstallCommand, runUpdateCommand } from './install.js';
import type { Role } from './types/common.js';
import { runDailyUpdateProbe } from './update-probe.js';
import { CLI_VERSION } from './version.js';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);

const BUILTIN_COMMAND_NAMES = ['help', 'list', 'version', 'changelog', 'install', 'uninstall', 'remove', 'update', 'upgrade'];

export async function runCli(rawArgs: string[]): Promise<void> {
  const { role, commandName, commandArgs } = parseCliArgs(rawArgs);
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

    const normalizedTarget = normalizeCommandInput(helpTargets[0], helpTargets.slice(1));
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
    printCommandHelp(targetCommandDef.name, targetCommandDef.schema);
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

  const registry = await buildRegistryForCommand(role, commandName);
  const command = registry.getCommand(commandName);
  if (!command) {
    throw new Error(`未找到命令: ${commandName}`);
  }

  if (hasHelpFlag(commandArgs)) {
    printCommandHelp(command.name, command.schema);
    return;
  }

  await runDailyUpdateProbe(commandName);

  const input = parseCommandInput(command.schema, commandArgs);
  const result = await command.handler(input);
  const text = result.content[0]?.text ?? '';
  process.stdout.write(`${await formatCommandOutput(command.name, text)}\n`);
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

function parseCliArgs(rawArgs: string[]): { role: Role; commandName?: string; commandArgs: string[] } {
  const args = [...rawArgs];
  let role: Role = 'full';

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

  const normalized = normalizeCommandInput(args.shift(), args);
  let commandName = normalized.commandName;
  if (normalized.consumedArgs > 0) {
    args.splice(0, normalized.consumedArgs);
  }
  if (normalized.prependedArgs.length > 0) {
    args.unshift(...normalized.prependedArgs);
  }

  return { role, commandName, commandArgs: args };
}

function normalizeCommandInput(
  commandName?: string,
  args: string[] = [],
): { commandName?: string; consumedArgs: number; prependedArgs: string[] } {
  const normalizedAlias = normalizeCommandAlias(commandName, args);
  const shortcut = parseLegacyPageShortcut(normalizedAlias.commandName);

  return {
    commandName: shortcut?.commandName ?? normalizedAlias.commandName,
    consumedArgs: normalizedAlias.consumedArgs,
    prependedArgs: shortcut?.commandArgs ?? [],
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

function parseLegacyPageShortcut(input?: string): { commandName: string; commandArgs: string[] } | undefined {
  const fileName = extractLegacyPageFileName(input);
  if (!fileName) return undefined;

  const mappings: Array<{ pattern: RegExp; commandName: string; buildArgs: (id: string) => string[] }> = [
    {
      pattern: /^execution-bug-(\d+)\.html$/i,
      commandName: 'getExecutionBugs',
      buildArgs: (id) => ['--executionId', id, '--limit', '100'],
    },
    {
      pattern: /^execution-build-(\d+)\.html$/i,
      commandName: 'getExecutionBuilds',
      buildArgs: (id) => ['--executionId', id],
    },
    {
      pattern: /^execution-dynamic-(\d+)\.html$/i,
      commandName: 'getExecutionDynamic',
      buildArgs: (id) => ['--executionId', id],
    },
    {
      pattern: /^bug-view-(\d+)\.html$/i,
      commandName: 'getBugDetail',
      buildArgs: (id) => ['--bugId', id],
    },
    {
      pattern: /^task-view-(\d+)\.html$/i,
      commandName: 'getTaskDetail',
      buildArgs: (id) => ['--taskId', id],
    },
    {
      pattern: /^story-view-(\d+)\.html$/i,
      commandName: 'getStoryDetail',
      buildArgs: (id) => ['--storyId', id],
    },
    {
      pattern: /^testcase-view-(\d+)\.html$/i,
      commandName: 'getTestCaseDetail',
      buildArgs: (id) => ['--testCaseId', id],
    },
    {
      pattern: /^testtask-view-(\d+)\.html$/i,
      commandName: 'getTestTaskDetail',
      buildArgs: (id) => ['--testTaskId', id],
    },
    {
      pattern: /^build-view-(\d+)\.html$/i,
      commandName: 'getBuildDetail',
      buildArgs: (id) => ['--buildId', id],
    },
  ];

  for (const mapping of mappings) {
    const matched = fileName.match(mapping.pattern);
    if (matched) {
      return { commandName: mapping.commandName, commandArgs: mapping.buildArgs(matched[1]) };
    }
  }

  return undefined;
}

function extractLegacyPageFileName(input?: string): string | undefined {
  if (!input) return undefined;

  try {
    if (/^[a-z]+:\/\//i.test(input)) {
      const url = new URL(input);
      const fromPath = url.pathname.split('/').filter(Boolean).pop();
      return fromPath ?? undefined;
    }
  } catch {
  }

  return input.split(/[?#]/, 1)[0]?.split(/[\\/]/).filter(Boolean).pop();
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
