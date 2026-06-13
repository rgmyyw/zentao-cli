import { parseCommandInput } from './core/cli-registry.js';
import { loadChangelogRaw, loadChangelogSections } from './core/changelog.js';
import { getApi } from './core/api-provider.js';
import { buildRegistryForCommand, getAvailableCommandNames } from './core/manifest.js';
import { runInstallCommand, runUninstallCommand, runUpdateCommand } from './install.js';
import type { Role } from './types/common.js';
import { runDailyUpdateProbe } from './update-probe.js';
import { CLI_VERSION } from './version.js';
import { z, type ZodRawShape, type ZodTypeAny } from 'zod';

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

interface ChangelogOptions {
  limit: number | 'all';
  version?: string;
  since?: string;
  raw: boolean;
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

async function renderChangelog(options: ChangelogOptions): Promise<string> {
  if (options.raw) {
    return loadChangelogRaw();
  }

  const sections = await loadChangelogSections();
  if (sections.length === 0) {
    throw new Error('CHANGELOG.md 中没有版本记录');
  }

  let selected = sections;
  if (options.version) {
    selected = sections.filter((section) => section.version === options.version);
    if (selected.length === 0) {
      throw new Error(`未找到版本 ${options.version} 的更新记录`);
    }
  } else if (options.since) {
    const sinceIndex = sections.findIndex((section) => section.version === options.since);
    if (sinceIndex === -1) {
      throw new Error(`未找到起始版本 ${options.since}`);
    }
    selected = sections.slice(0, sinceIndex + 1);
  } else if (options.limit !== 'all') {
    selected = sections.slice(0, options.limit);
  }

  const header = options.version
    ? `zentao CLI ${options.version} 更新内容`
    : `zentao CLI 最近更新（共 ${sections.length} 个版本）`;

  return [header, '', ...selected.map((section) => section.content)].join('\n').trimEnd() + '\n';
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
  const recommended = getRecommendedCommands(role, commands);
  process.stdout.write([
    'zentao CLI',
    '',
    `当前 role: ${role}`,
    '适配版本：优先适配禅道 18.5 REST v1 API；部分旧版页面 JSON 能力作为补充。',
    '运行时要求：Node.js >= 16；已安装或可通过 npx 临时运行。',
    '',
    '用法：',
    '  zentao [--role full|dev|pm|qa] <command> [--key value ...]',
    '  zentao [--role=full|dev|pm|qa] <command> [--key=value ...]',
    '  zentao list',
    '  zentao help',
    '  zentao list',
    '  zentao version',
    '  zentao changelog',
    '  zentao update',
    '  zentao update --skip-config-check',
    '  zentao update --cli-only',
    '  zentao update --skill-only',
    '  zentao uninstall',
    '  zentao uninstall --confirm true',
    '  npx -y @cloudglab/zentao-cli@latest update',
    '  npx -y @cloudglab/zentao-cli@latest install',
    '  npx -y @cloudglab/zentao-cli@latest uninstall --confirm true',
    '  zentao install --skill-source npm',
    '',
    '示例：',
    '  zentao install',
    '  zentao install --skill-source npm',
    '  zentao update',
    '  npx -y @cloudglab/zentao-cli@latest update --skip-config-check',
    '  npx -y @cloudglab/zentao-cli@latest uninstall --confirm true --keep-config true',
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
    '常用命令：',
    ...recommended.map((item) => `  - ${item.name.padEnd(24)} ${item.description}`),
    '',
    '查看更多：',
    '  zentao list                  按场景查看命令说明',
    '  zentao list --raw            仅输出命令名，适合脚本处理',
    '  zentao help <command>        查看某个命令的参数',
    '',
  ].join('\n'));
}

function printCommandList(role: Role, commandNames: string[], builtinCommandNames: string[]): void {
  const allCommandNames = [...builtinCommandNames, ...commandNames]
    .sort((left, right) => left.localeCompare(right));
  const groups = buildCommandGroups(allCommandNames);

  const lines = [
    'zentao 可用命令',
    '',
    `当前 role: ${role}`,
    `命令数量：${allCommandNames.length}`,
    '',
  ];

  for (const group of groups) {
    if (group.commands.length === 0) continue;
    lines.push(`${group.title}：`);
    for (const commandName of group.commands) {
      lines.push(`  - ${commandName.padEnd(28)} ${describeCommand(commandName)}`);
    }
    lines.push('');
  }

  lines.push(
    '下一步：',
    '  - 查看参数：zentao help <command>，例如 zentao help getMyTasks',
    '  - 快速校验账号：zentao whoami',
    '  - 查看脚本友好命令名：zentao list --raw',
    '  - 切换角色命令集：zentao --role qa list 或 zentao --role pm list',
    '',
  );

  process.stdout.write(lines.join('\n'));
}

interface CommandListGroup {
  title: string;
  match: (commandName: string) => boolean;
  commands: string[];
}

function buildCommandGroups(commandNames: string[]): CommandListGroup[] {
  const groups: CommandListGroup[] = [
    { title: '开始使用', match: (name) => ['help', 'list', 'version', 'changelog', 'install', 'update', 'upgrade', 'uninstall', 'remove', 'initZentao', 'whoami', 'who-am-i', 'getMyProfile'].includes(name), commands: [] },
    { title: '我的工作', match: (name) => ['getMyTasks', 'getMyBugs', 'getMyTaskStatistics', 'getMyBugStatistics', 'getMyWeeklyActivity'].includes(name), commands: [] },
    { title: '测试 / 构建 / 发布', match: (name) => /Test|Case|Build|Release/.test(name), commands: [] },
    { title: '任务 / Bug / 需求', match: (name) => /Task|Bug|Story|Stories/.test(name), commands: [] },
    { title: '执行 / 项目 / 产品 / 计划', match: (name) => /Execution|Project|Product|Program|Plan/.test(name), commands: [] },
    { title: '评论 / 动态 / 统计 / 搜索', match: (name) => /Comment|Dynamic|Statistic|Statistics|Activity|Search|Context|Related|Resource/.test(name), commands: [] },
    { title: '其他', match: () => true, commands: [] },
  ];

  for (const commandName of commandNames) {
    const group = groups.find((item) => item.match(commandName));
    group?.commands.push(commandName);
  }

  return groups;
}

function getRecommendedCommands(role: Role, commandNames: string[]): Array<{ name: string; description: string }> {
  const candidates = [
    { name: 'whoami', description: '查看当前禅道账号' },
    { name: 'getMyTasks', description: '查看我的任务' },
    { name: 'getMyBugs', description: '查看我的 Bug' },
    { name: 'getMyWeeklyActivity', description: '生成阶段性工作清单' },
    { name: role === 'qa' ? 'getProductTestCases' : 'getProductStories', description: role === 'qa' ? '查看产品用例' : '查看产品需求' },
    { name: 'getExecutionDailyBugStats', description: '查看执行每日迭代统计' },
  ];

  return candidates.filter((item) => commandNames.includes(item.name));
}

function describeCommand(commandName: string): string {
  const descriptions: Record<string, string> = {
    help: '查看总帮助或指定命令参数',
    list: '按场景列出可用命令',
    version: '查看 CLI 版本',
    changelog: '查看 CLI 更新日志',
    install: '安装 CLI 和 zentao skill',
    update: '更新 CLI 和 zentao skill',
    upgrade: 'update 的别名',
    uninstall: '卸载 CLI / skill / 配置',
    remove: 'uninstall 的别名',
    initZentao: '初始化或校验禅道连接配置',
    whoami: '友好展示当前禅道账号',
    'who-am-i': 'whoami 的别名',
    getMyProfile: '输出当前账号原始资料',
    getMyTasks: '查看我的任务列表',
    getTaskDetail: '查看任务详情',
    updateTask: '更新任务字段',
    finishTask: '完成任务',
    getMyBugs: '查看指派给我的 Bug',
    getProductBugs: '查看产品 Bug',
    getBugDetail: '查看 Bug 详情',
    resolveBug: '解决 Bug',
    getStoryDetail: '查看需求详情',
    getProductStories: '查看产品需求',
    searchStories: '搜索需求',
    searchStoriesByProductName: '按产品名搜索需求',
    updateStory: '更新需求字段',
    changeStory: '变更需求',
    getExecutionDetail: '查看执行详情',
    getProjectExecutions: '查看项目执行列表',
    getExecutionBugs: '查看执行 Bug 列表',
    getExecutionBuilds: '查看执行构建列表',
    getExecutionDynamic: '查看执行动态',
    getExecutionDailyBugStats: '生成执行每日 Bug / 任务统计',
    getProducts: '查看产品列表',
    getProductDetail: '查看产品详情',
    getProjects: '查看项目列表',
    getProjectDetail: '查看项目详情',
    getProductPlans: '查看产品计划列表',
    getPlanDetail: '查看计划详情',
    getProductTestCases: '查看产品测试用例',
    getTestCaseDetail: '查看测试用例详情',
    getTestTasks: '查看测试单列表',
    getTestTaskDetail: '查看测试单详情',
    createTestCase: '创建测试用例',
    updateTestCase: '更新测试用例',
    createTestTask: '创建测试单',
    updateTestTask: '更新测试单',
    getProjectBuilds: '查看项目构建列表',
    getBuildDetail: '查看构建详情',
    createBuild: '创建构建',
    updateBuild: '更新构建',
    getProjectReleases: '查看项目发布列表',
    getComments: '查看对象评论',
    addComment: '添加对象评论',
    search: '搜索禅道对象',
    getDevelopmentContext: '查看需求 / Bug 开发上下文',
    getStoryRelatedBugs: '查看需求关联 Bug',
    getBugRelatedStory: '查看 Bug 关联需求',
    createTaskFromStory: '从需求创建任务',
    createTaskFromBug: '从 Bug 创建任务',
    linkStoriesToPlan: '关联需求到计划',
    unlinkStoriesFromPlan: '从计划移除需求',
    linkBugsToPlan: '关联 Bug 到计划',
    unlinkBugsFromPlan: '从计划移除 Bug',
    getMyTaskStatistics: '统计我的任务',
    getMyBugStatistics: '统计我的 Bug',
    getMyWeeklyActivity: '生成我的阶段性工作清单',
  };

  return descriptions[commandName] ?? '查看参数：zentao help ' + commandName;
}

async function formatCommandOutput(commandName: string, text: string): Promise<string> {
  if (commandName !== 'whoami' && commandName !== 'who-am-i') return text;

  try {
    return formatWhoami(JSON.parse(text) as Record<string, unknown>, await loadWhoamiStats());
  } catch {
    return text;
  }
}

interface WhoamiStats {
  tasks?: PersonalListStats;
  bugs?: PersonalListStats;
  warnings: string[];
}

interface PersonalListStats {
  total: number;
  items: Array<Record<string, unknown>>;
  scanned?: number;
  products: string[];
  sprints: string[];
  statusCounts: Record<string, number>;
}

async function loadWhoamiStats(): Promise<WhoamiStats> {
  const api = getApi();
  const warnings: string[] = [];

  const [tasksResult, bugsResult] = await Promise.allSettled([
    api.task?.getMyTasks?.({ status: 'all', limit: 100 }),
    api.bug?.getMyBugs?.({ limit: 100 }),
  ]);

  if (tasksResult.status === 'rejected') warnings.push(`任务统计暂不可用：${formatErrorMessage(tasksResult.reason)}`);
  if (bugsResult.status === 'rejected') warnings.push(`Bug 统计暂不可用：${formatErrorMessage(bugsResult.reason)}`);

  return {
    tasks: tasksResult.status === 'fulfilled' ? summarizePersonalList(tasksResult.value, ['productName', 'product', 'productTitle'], ['executionName', 'execution', 'executionTitle', 'sprintName']) : undefined,
    bugs: bugsResult.status === 'fulfilled' ? summarizePersonalList(bugsResult.value, ['productName', 'product', 'productTitle'], ['executionName', 'execution', 'executionTitle', 'sprintName']) : undefined,
    warnings,
  };
}

function formatWhoami(profile: Record<string, unknown>, stats: WhoamiStats): string {
  const root = unwrapProfile(profile);
  const realname = firstString(root.realname, root.realName, root.name, root.account, root.username) ?? '朋友';
  const account = firstString(root.account, root.username, root.user) ?? '-';
  const roleName = firstString(
    readPath(root, ['role', 'name']),
    readPath(root, ['role', 'title']),
    root.roleName,
    root.role,
    root.position,
    root.group,
  ) ?? '禅道';
  const deptName = firstString(
    readPath(root, ['dept', 'name']),
    readPath(root, ['department', 'name']),
    root.deptName,
    root.department,
  );
  const email = firstString(root.email, root.mail);
  const visits = firstString(root.visits, root.visit, root.lastVisits, root.loginCount);
  const projectNames = mergeUnique(collectProfileNames(root, ['view.projects', 'projects', 'projectList']));
  const productNames = mergeUnique(
    collectProfileNames(root, ['view.products', 'products', 'productList']),
    stats.tasks?.products ?? [],
    stats.bugs?.products ?? [],
  );
  const sprintNames = mergeUnique(
    collectProfileNames(root, ['view.sprints', 'sprints', 'executionList']),
    stats.tasks?.sprints ?? [],
    stats.bugs?.sprints ?? [],
  );
  const taskTotal = stats.tasks?.total ?? 0;
  const bugTotal = stats.bugs?.total ?? 0;
  const level = resolveWhoamiLevel(projectNames.length, productNames.length, sprintNames.length);

  const lines = [
    `${getTimeGreeting()}，${realname}。`,
    `你现在是 ${level.label} · ${roleName} 工程师。`,
    '',
    '账号信息：',
    `  - 账号：${account}`,
  ];

  if (deptName) lines.push(`  - 部门：${deptName}`);
  if (email) lines.push(`  - 邮箱：${email}`);
  if (visits) lines.push(`  - 感谢您的第 ${visits} 次访问`);

  lines.push(
    '',
    '工作概览：',
    `  - 任务：${taskTotal} 个${formatStatusSummary(stats.tasks?.statusCounts)}`,
    `  - Bug：${bugTotal} 个${formatStatusSummary(stats.bugs?.statusCounts)}`,
    `  - 参与项目：${formatNamePreview(projectNames, '暂无可识别项目')}`,
    `  - 参与产品：${formatNamePreview(productNames, '暂无可识别产品')}`,
    `  - 参与 Sprint / 执行：${formatNamePreview(sprintNames, '暂无可识别执行')}`,
    `  - 等级依据：项目 ${projectNames.length} / 产品 ${productNames.length} / Sprint ${sprintNames.length}`,
    '',
    '小分析：',
    `  - ${buildWorkloadInsight(taskTotal, bugTotal)}`,
    `  - ${buildFocusInsight(projectNames.length, productNames.length, sprintNames.length, level.rank)}`,
  );

  if (stats.warnings.length > 0) {
    lines.push('', '提示：', ...stats.warnings.map((warning) => `  - ${warning}`));
  }

  lines.push('', '快捷入口：', '  - 我的任务：zentao getMyTasks --limit 10', '  - 我的 Bug：zentao getMyBugs --limit 10', '  - 阶段清单：zentao getMyWeeklyActivity --week this');

  return lines.join('\n');
}

function summarizePersonalList(value: unknown, productKeys: string[], sprintKeys: string[]): PersonalListStats {
  const record = isRecord(value) ? value : {};
  const items = extractListItems(value);

  return {
    total: toNonNegativeNumber(record.total) ?? items.length,
    scanned: toNonNegativeNumber(record.scanned),
    items,
    products: collectUniqueFieldValues(items, productKeys),
    sprints: collectUniqueFieldValues(items, sprintKeys),
    statusCounts: countByStatus(items),
  };
}

function unwrapProfile(value: Record<string, unknown>): Record<string, unknown> {
  const nested = value.profile;
  return isRecord(nested) ? nested : value;
}

function collectProfileNames(profile: Record<string, unknown>, keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const raw = readPath(profile, key.split('.'));
    if (typeof raw !== 'string') continue;
    for (const part of raw.split(',').map((item) => item.trim()).filter(Boolean)) {
      if (!values.includes(part)) values.push(part);
    }
  }

  return values;
}

function formatNamePreview(values: string[], emptyText: string): string {
  if (values.length === 0) return emptyText;
  const preview = values.slice(0, 5).join('、');
  return values.length > 5 ? `${preview} 等 ${values.length} 个` : preview;
}

function extractListItems(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  const items = value.items;
  if (Array.isArray(items)) return items.filter(isRecord);
  return [];
}

function collectUniqueFieldValues(items: Array<Record<string, unknown>>, keys: string[]): string[] {
  const values: string[] = [];

  for (const item of items) {
    const value = firstString(...keys.map((key) => readPath(item, key.split('.'))));
    if (value && !values.includes(value)) values.push(value);
  }

  return values;
}

function countByStatus(items: Array<Record<string, unknown>>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const status = firstString(item.status, item.state) ?? 'unknown';
    result[status] = (result[status] ?? 0) + 1;
  }

  return result;
}

function formatStatusSummary(statusCounts?: Record<string, number>): string {
  if (!statusCounts || Object.keys(statusCounts).length === 0) return '';
  const parts = Object.entries(statusCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([status, count]) => `${translateStatus(status)} ${count}`);

  return `（${parts.join('，')}）`;
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    wait: '未开始',
    doing: '进行中',
    done: '已完成',
    closed: '已关闭',
    cancel: '已取消',
    cancelled: '已取消',
    active: '激活',
    resolved: '已解决',
    assigned: '已指派',
    unknown: '未知',
  };

  return map[status] ?? status;
}

function buildWorkloadInsight(taskTotal: number, bugTotal: number): string {
  if (taskTotal === 0 && bugTotal === 0) return '当前没有识别到待办任务或 Bug，可以先查看项目/产品上下文。';
  if (bugTotal > taskTotal) return 'Bug 数量高于任务数量，建议优先清理阻塞和高严重级别问题。';
  if (taskTotal >= 10) return '任务池较满，建议按截止时间和执行优先级拆分今日重点。';
  if (bugTotal > 0) return '仍有 Bug 需要关注，建议先处理可快速验证的问题。';
  return '任务量看起来比较可控，适合推进计划内开发。';
}

interface WhoamiLevel {
  label: string;
  rank: number;
}

function resolveWhoamiLevel(projectCount: number, productCount: number, sprintCount: number): WhoamiLevel {
  const scopeScore = projectCount * 2 + productCount + sprintCount;
  if (scopeScore >= 300) return { label: '王者', rank: 8 };
  if (scopeScore >= 180) return { label: '钻石', rank: 7 };
  if (scopeScore >= 120) return { label: '翡翠', rank: 6 };
  if (scopeScore >= 75) return { label: '铂金', rank: 5 };
  if (scopeScore >= 40) return { label: '黄金', rank: 4 };
  if (scopeScore >= 20) return { label: '白银', rank: 3 };
  if (scopeScore >= 8) return { label: '青铜', rank: 2 };
  return { label: '黑铁', rank: 1 };
}

function buildFocusInsight(projectCount: number, productCount: number, sprintCount: number, levelRank: number): string {
  if (levelRank >= 7) return '参与范围很大，建议优先看项目节奏和跨团队协作。';
  if (projectCount >= 4 || productCount >= 4 || sprintCount >= 4) return '参与范围较广，建议用 zentao list 找到统计命令做每日聚合。';
  if (productCount > 0 || sprintCount > 0) return '参与范围比较集中，适合按产品或 Sprint 做批量处理。';
  return '暂未从任务和 Bug 中识别产品 / Sprint，可继续用详情命令补充上下文。';
}

function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return '早上好';
  if (hour >= 10 && hour < 13) return '中午好';
  if (hour >= 13 && hour < 17) return '下午好';
  if (hour >= 17 && hour < 20) return '傍晚好';
  if (hour >= 20 && hour < 23) return '深夜好';
  return '凌晨好';
}

function mergeUnique(...groups: string[][]): string[] {
  const result: string[] = [];
  for (const group of groups) {
    for (const value of group) {
      if (!result.includes(value)) result.push(value);
    }
  }

  return result;
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }

  return undefined;
}

function toNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
    : commandName === 'remove'
      ? 'uninstall'
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
      '  zentao list --raw',
      '',
      '说明：',
      '  默认按场景列出当前 role 可用命令，并给出每个命令的简短说明。',
      '  需要脚本处理时使用 --raw，仅按字母顺序输出命令名。',
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
    changelog: [
      'zentao changelog',
      '',
      '用法：',
      '  zentao changelog',
      '  zentao changelog --limit 5',
      '  zentao changelog --limit all',
      '  zentao changelog --version 0.1.23',
      '  zentao changelog --since 0.1.20',
      '  zentao changelog --raw',
      '',
      '说明：',
      '  查看 CLI 更新日志。默认展示最近 5 个版本；使用 --raw 输出完整 Markdown。',
      '',
      '参数：',
      '  --limit <number|all> （可选）：展示的版本数量，默认 5；all 表示全部。',
      '  --version <string> （可选）：只展示指定版本的更新内容。',
      '  --since <string> （可选）：展示从指定版本到当前最新的所有更新。',
      '  --raw （可选）：输出完整 CHANGELOG.md 原文。',
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
    uninstall: [
      'zentao uninstall',
      '',
      '用法：',
      '  zentao uninstall [--confirm true] [--keep-config] [--cli-only] [--skill-only]',
      '  zentao uninstall [--confirm=true] [--keep-config=true|false] [--cli-only=true|false] [--skill-only=true|false]',
      '  zentao remove [--confirm true] [--keep-config] [--cli-only] [--skill-only]',
      '  npx -y @cloudglab/zentao-cli@latest uninstall --confirm true',
      '',
      '说明：',
      '  默认只打印卸载预览；真实卸载必须传 --confirm true。',
      '',
      '参数：',
      '  --confirm true （必填执行）：确认真实卸载。',
      '  --keep-config （可选）：保留 ~/.zentao/config.json。',
      '  --cli-only （可选）：只卸载 CLI，不卸载 skill。',
      '  --skill-only （可选）：只卸载 skill，不卸载 CLI 和配置。',
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
