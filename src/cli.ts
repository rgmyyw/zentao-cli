import { InMemoryCliRegistry, parseCommandInput } from './core/cli-registry.js';
import { registerTools } from './core/tool-registry.js';
import { runInstallCommand, runUpdateCommand } from './install.js';
import type { Role } from './types/common.js';
import { runDailyUpdateProbe } from './update-probe.js';
import { CLI_VERSION } from './version.js';
import { z, type ZodRawShape, type ZodTypeAny } from 'zod';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);

export async function runCli(rawArgs: string[]): Promise<void> {
  const { role, commandName, commandArgs } = parseCliArgs(rawArgs);
  const registry = new InMemoryCliRegistry();
  registerTools(registry, role);
  const builtinCommandNames = ['help', 'list', 'version', 'install', 'update', 'upgrade'];
  const commandNames = [...builtinCommandNames, ...registry.listCommands().map((item) => item.name)]
    .sort((left, right) => left.localeCompare(right));

  if (!commandName || commandName === '--help' || commandName === '-h') {
    ensureNoUnexpectedBuiltinArgs('help', commandArgs);
    printHelp(role, commandNames);
    return;
  }

  if (commandName === 'help') {
    const helpTargets = commandArgs.filter((arg) => arg !== '--help' && arg !== '-h');
    if (helpTargets.length === 0) {
      printHelp(role, commandNames);
      return;
    }

    const normalizedTarget = normalizeCommandInput(helpTargets[0], helpTargets.slice(1));
    const targetCommandName = normalizedTarget.commandName;
    if (!targetCommandName) {
      printHelp(role, commandNames);
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
    const targetCommandDef = registry.getCommand(targetCommandName);
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
      ensureNoUnexpectedBuiltinArgs('list', commandArgs);
      process.stdout.write(`${getBuiltinCommandHelp('list')}\n`);
      return;
    }
    ensureNoUnexpectedBuiltinArgs('list', commandArgs);
    for (const item of commandNames) {
      process.stdout.write(`${item}\n`);
    }
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
  process.stdout.write(`${text}\n`);
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

function printHelp(role: Role, commands: string[]): void {
  process.stdout.write([
    'zentao CLI',
    '',
    `当前 role: ${role}`,
    '',
    '用法：',
    '  zentao [--role full|dev|pm|qa] <command> [--key value ...]',
    '  zentao [--role=full|dev|pm|qa] <command> [--key=value ...]',
    '  zentao list',
    '  zentao help',
    '  zentao version',
    '  zentao update',
    '  zentao update --skip-config-check',
    '  zentao update --cli-only',
    '  zentao update --skill-only',
    '  npx -y @cloudglab/zentao-cli@latest update',
    '  npx -y @cloudglab/zentao-cli@latest install',
    '  zentao install --skill-source npm',
    '',
    '示例：',
    '  zentao install',
    '  zentao install --skill-source npm',
    '  zentao update',
    '  npx -y @cloudglab/zentao-cli@latest update --skip-config-check',
    '  zentao getMyTasks --status all --limit 20',
    '  zentao getMyTasks --status=all --limit=20',
    '  zentao whoami',
    '  zentao who-am-i',
    '  zentao who am i',
    '  zentao --role qa getMyBugs --limit 50',
    '  zentao --role=qa getMyBugs --limit=50',
    '  zentao execution-bug-2130.html',
    '  zentao initZentao --url https://host --username xxx --password yyy',
    '  zentao --version',
    '',
    '运行时要求：Node.js >= 16',
    '',
    '可用命令：',
    ...commands.map((item) => `  - ${item}`),
    '',
  ].join('\n'));
}

function printCommandHelp(commandName: string, schema: ZodRawShape): void {
  const entries = Object.entries(schema);
  const lines = [
    `zentao ${commandName}`,
    '',
    '用法：',
    `  zentao ${commandName}${entries.length > 0 ? ' [--key value ...]' : ''}`,
  ];

  if (entries.length > 0) {
    lines.push(`  zentao ${commandName} [--key=value ...]`);
  }

  lines.push(`  zentao help ${commandName}`, '');

  if (entries.length > 0) {
    lines.push('参数：', ...entries.map(formatParameterHelp), '');
  } else {
    lines.push('参数：', '  此命令无参数。', '');
  }

  process.stdout.write(lines.join('\n'));
}

function getBuiltinCommandHelp(commandName: string): string | undefined {
  const normalized = commandName === 'upgrade'
    ? 'update'
    : commandName === '--version' || commandName === '-v'
      ? 'version'
      : commandName;
  const builtins: Record<string, string> = {
    help: [
      'zentao help',
      '',
      '用法：',
      '  zentao help [command]',
      '',
      '说明：',
      '  不传 command 时输出总帮助；传入命令名时输出该命令的帮助。',
      '',
    ].join('\n'),
    list: [
      'zentao list',
      '',
      '用法：',
      '  zentao list',
      '',
      '说明：',
      '  按字母顺序列出当前 role 可用的全部命令。',
      '',
    ].join('\n'),
    version: [
      'zentao version',
      '',
      '用法：',
      '  zentao version',
      '  zentao --version',
      '  zentao -v',
      '',
      '说明：',
      '  输出当前 CLI 版本号。',
      '',
    ].join('\n'),
    install: [
      'zentao install',
      '',
      '用法：',
      '  zentao install [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check] [--cli-only] [--skill-only]',
      '  zentao install [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check true|false] [--cli-only true|false] [--skill-only true|false]',
      '  zentao install [--skill-source=npm] [--skill-local-path=./skill] [--skip-config-check=true|false] [--cli-only=true|false] [--skill-only=true|false]',
      '',
      '参数：',
      '  --skill-source <local|git|npm> （可选）：skill 安装来源，默认 local。',
      '  --skill-local-path <string> （可选）：直接从本地目录安装 skill。',
      '  --skip-config-check （可选）：安装后跳过禅道配置校验。',
      '  --cli-only （可选）：只安装 CLI，不安装 skill。',
      '  --skill-only （可选）：只安装 skill，不安装 CLI。',
      '',
    ].join('\n'),
    update: [
      'zentao update',
      '',
      '用法：',
      '  zentao update [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check] [--cli-only] [--skill-only]',
      '  zentao update [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check true|false] [--cli-only true|false] [--skill-only true|false]',
      '  zentao update [--skill-source=npm] [--skill-local-path=./skill] [--skip-config-check=true|false] [--cli-only=true|false] [--skill-only=true|false]',
      '  zentao upgrade [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check] [--cli-only] [--skill-only]',
      '  zentao upgrade [--skill-source local|git|npm] [--skill-local-path <path>] [--skip-config-check true|false] [--cli-only true|false] [--skill-only true|false]',
      '  zentao upgrade [--skill-source=npm] [--skill-local-path=./skill] [--skip-config-check=true|false] [--cli-only=true|false] [--skill-only=true|false]',
      '',
      '参数：',
      '  --skill-source <local|git|npm> （可选）：skill 更新来源，默认 local。',
      '  --skill-local-path <string> （可选）：直接从本地目录更新 skill。',
      '  --skip-config-check （可选）：更新后跳过禅道配置校验。',
      '  --cli-only （可选）：只更新 CLI，不更新 skill。',
      '  --skill-only （可选）：只更新 skill，不更新 CLI。',
      '',
    ].join('\n'),
  };

  return builtins[normalized];
}

function formatParameterHelp([key, fieldSchema]: [string, ZodTypeAny]): string {
  const description = fieldSchema.description ? `：${fieldSchema.description}` : '';
  return `  --${key} <${describeSchema(fieldSchema)}>${isOptionalSchema(fieldSchema) ? ' （可选）' : ' （必填）'}${description}`;
}

function describeSchema(schema: ZodTypeAny): string {
  const unwrapped = unwrapSchema(schema);
  if (unwrapped instanceof z.ZodNumber) return 'number';
  if (unwrapped instanceof z.ZodBoolean) return 'boolean';
  if (unwrapped instanceof z.ZodArray) return 'array';
  if (unwrapped instanceof z.ZodEnum) return unwrapped.options.join('|');
  return 'string';
}

function isOptionalSchema(schema: ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault || schema instanceof z.ZodNullable;
}

function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return unwrapSchema(schema.unwrap());
  if (schema instanceof z.ZodDefault) return unwrapSchema((schema._def as { innerType: ZodTypeAny }).innerType);
  if (schema instanceof z.ZodEffects) return unwrapSchema(schema.innerType());
  return schema;
}
