import { InMemoryCliRegistry, parseCommandInput } from './core/cli-registry.js';
import { registerTools } from './core/tool-registry.js';
import { runInstallCommand, runUpdateCommand } from './install.js';
import type { Role } from './types/common.js';
import { CLI_VERSION } from './version.js';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);

export async function runCli(rawArgs: string[]): Promise<void> {
  const { role, commandName, commandArgs } = parseCliArgs(rawArgs);
  const registry = new InMemoryCliRegistry();
  registerTools(registry, role);
  const builtinCommandNames = ['help', 'list', 'version', 'install', 'update'];
  const commandNames = [...builtinCommandNames, ...registry.listCommands().map((item) => item.name)];

  if (!commandName || commandName === 'help' || commandName === '--help' || commandName === '-h') {
    printHelp(role, commandNames);
    return;
  }

  if (commandName === '--version' || commandName === '-v' || commandName === 'version') {
    process.stdout.write(`${CLI_VERSION}\n`);
    return;
  }

  if (commandName === 'list') {
    for (const item of commandNames) {
      process.stdout.write(`${item}\n`);
    }
    return;
  }

  if (commandName === 'install') {
    await runInstallCommand(commandArgs);
    return;
  }

  if (commandName === 'update' || commandName === 'upgrade') {
    await runUpdateCommand(commandArgs);
    return;
  }

  const command = registry.getCommand(commandName);
  if (!command) {
    throw new Error(`未找到命令: ${commandName}`);
  }

  const input = parseCommandInput(command.schema, commandArgs);
  const result = await command.handler(input);
  const text = result.content[0]?.text ?? '';
  process.stdout.write(`${text}\n`);
}

function parseCliArgs(rawArgs: string[]): { role: Role; commandName?: string; commandArgs: string[] } {
  const args = [...rawArgs];
  let role: Role = 'full';

  const roleIndex = args.findIndex((arg) => arg === '--role' || arg === '-r');
  if (roleIndex >= 0) {
    const roleValue = args[roleIndex + 1];
    if (!roleValue || !VALID_ROLES.has(roleValue as Role)) {
      throw new Error(`无效 role: ${String(roleValue)}`);
    }
    role = roleValue as Role;
    args.splice(roleIndex, 2);
  } else if (args[0] && VALID_ROLES.has(args[0] as Role)) {
    role = args.shift() as Role;
  }

  let commandName = args.shift();
  if (commandName === 'who' && args[0] === 'am' && args[1] === 'i') {
    commandName = 'whoami';
    args.splice(0, 2);
  }
  return { role, commandName, commandArgs: args };
}

function printHelp(role: Role, commands: string[]): void {
  process.stdout.write([
    'zentao CLI',
    '',
    `当前 role: ${role}`,
    '',
    '用法：',
    '  zentao [--role full|dev|pm|qa] <command> [--key value ...]',
    '  zentao list',
    '  zentao help',
    '  zentao version',
    '  zentao update',
    '  npx -y @cloudglab/zentao-cli@latest install',
    '  zentao install --skill-source npm',
    '',
    '示例：',
    '  zentao install',
    '  zentao install --skill-source npm',
    '  zentao update',
    '  zentao getMyTasks --status all --limit 20',
    '  zentao whoami',
    '  zentao who am i',
    '  zentao --role qa getMyBugs --limit 50',
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
