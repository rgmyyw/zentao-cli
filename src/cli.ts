import { InMemoryCliRegistry, parseCommandInput } from './core/cli-registry.js';
import { registerTools } from './core/tool-registry.js';
import type { Role } from './types/common.js';
import { CLI_VERSION } from './version.js';

const VALID_ROLES = new Set<Role>(['full', 'dev', 'pm', 'qa']);

export async function runCli(rawArgs: string[]): Promise<void> {
  const { role, commandName, commandArgs } = parseCliArgs(rawArgs);
  const registry = new InMemoryCliRegistry();
  registerTools(registry, role);

  if (!commandName || commandName === 'help' || commandName === '--help' || commandName === '-h') {
    printHelp(role, registry.listCommands().map((item) => item.name));
    return;
  }

  if (commandName === '--version' || commandName === '-v' || commandName === 'version') {
    process.stdout.write(`${CLI_VERSION}\n`);
    return;
  }

  if (commandName === 'list') {
    for (const item of registry.listCommands()) {
      process.stdout.write(`${item.name}\n`);
    }
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

  const commandName = args.shift();
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
    '',
    '示例：',
    '  zentao getMyTasks --status all --limit 20',
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
