import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCliRegistry, parseCommandInput } from '../../src/core/cli-registry.js';
import { setApi } from '../../src/core/api-provider.js';
import { registerTools } from '../../src/core/tool-registry.js';

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text) as unknown;
}

describe('registerTools', () => {
  beforeEach(() => {
    delete process.env.ZENTAO_ENABLE_WRITE;
    delete process.env.ZENTAO_DISABLE_WRITE;
  });

  it('registers the full role command surface', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');

    expect(registry.listCommands().map((command) => command.name)).toEqual([
      'activateBug',
      'activateExecution',
      'activateStory',
      'activateTask',
      'activateTodo',
      'addComment',
      'analyzeBugResources',
      'analyzeTaskResources',
      'assignBug',
      'assignStory',
      'assignTask',
      'changeStory',
      'closeBug',
      'closeExecution',
      'closeStory',
      'closeTask',
      'confirmBug',
      'createBug',
      'createBuild',
      'createStory',
      'createTaskFromBug',
      'createTaskFromStory',
      'createTestCase',
      'createTestTask',
      'createTodo',
      'deleteBug',
      'deleteTask',
      'deleteTodo',
      'finishTask',
      'finishTodo',
      'getBugDetail',
      'getBugRelatedStory',
      'getBuildDetail',
      'getComments',
      'getDevelopmentContext',
      'getExecutionBugs',
      'getExecutionBuilds',
      'getExecutionDailyBugStats',
      'getExecutionDetail',
      'getExecutionDynamic',
      'getMyBugs',
      'getMyBugStatistics',
      'getMyProfile',
      'getMyTasks',
      'getMyTaskStatistics',
      'getMyTodos',
      'getMyWeeklyActivity',
      'getPlanDetail',
      'getProductBugs',
      'getProductDetail',
      'getProductPlans',
      'getProducts',
      'getProductStories',
      'getProductTestCases',
      'getProgramDetail',
      'getPrograms',
      'getProjectBuilds',
      'getProjectDetail',
      'getProjectExecutions',
      'getProjectReleases',
      'getProjects',
      'getReleaseDetail',
      'getStoryDetail',
      'getStoryRelatedBugs',
      'getTaskDetail',
      'getTestCaseDetail',
      'getTestTaskDetail',
      'getTestTasks',
      'getTodoDetail',
      'initZentao',
      'linkBugsToPlan',
      'linkStoriesToPlan',
      'okBug',
      'pauseTask',
      'putoffExecution',
      'recordTaskEstimate',
      'resolveBug',
      'restartTask',
      'reviewStory',
      'searchStories',
      'searchStoriesByProductName',
      'startExecution',
      'startTask',
      'suspendExecution',
      'unlinkBugsFromPlan',
      'unlinkStoriesFromPlan',
      'updateBug',
      'updateBuild',
      'updateExecution',
      'updateStory',
      'updateTask',
      'updateTestCase',
      'updateTestTask',
      'updateTodo',
      'who-am-i',
      'whoami',
    ]);
  });

  it('filters commands by role', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'pm');

    const names = registry.listCommands().map((command) => command.name);
    expect(names).toContain('getProducts');
    expect(names).toContain('getProductStories');
    expect(names).toContain('getProductPlans');
    expect(names).not.toContain('getMyBugs');
    expect(names).not.toContain('getProductTestCases');
  });

  it('parses CLI args and calls read handlers through the API provider', async () => {
    const registry = new InMemoryCliRegistry();
    const getMyTasks = vi.fn(async (input: unknown) => ({ ok: true, input }));
    setApi({ task: { getMyTasks } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');
    expect(command).toBeDefined();

    const input = parseCommandInput(command!.schema, ['--status', 'doing', '--page', '2', '--limit', '5']);
    const result = await command!.handler(input);

    expect(getMyTasks).toHaveBeenCalledWith({ status: 'doing', page: 2, limit: 5 });
    expect(parseResult(result)).toEqual({ ok: true, input: { status: 'doing', page: 2, limit: 5 } });
  });

  it('rejects unknown CLI args instead of silently ignoring them', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { getMyTasks: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');

    expect(() => parseCommandInput(command!.schema, ['--statsu', 'doing'])).toThrow('未知参数: --statsu');
  });

  it('parses getProductBugs search keyword', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { getProductBugs: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('getProductBugs');

    expect(parseCommandInput(command!.schema, ['--productId', '87', '--status', 'all', '--limit', '100', '--order', 'id_desc', '--search', '浙江'])).toMatchObject({
      productId: 87,
      status: 'all',
      limit: 100,
      order: 'id_desc',
      search: '浙江',
    });
  });

  it('parses getProductBugs module alias keyword', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { getProductBugs: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('getProductBugs');

    expect(parseCommandInput(command!.schema, ['--productId', '87', '--module', 'Yj'])).toMatchObject({
      productId: 87,
      module: 'Yj',
    });
  });

  it('parses updateBug project, execution, plan and openedBuild args', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { updateBug: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('updateBug');

    expect(parseCommandInput(command!.schema, ['--bugId', '84733', '--project', '1772', '--execution', '2140', '--plan', '2140', '--openedBuild', 'trunk'])).toMatchObject({
      bugId: 84733,
      project: 1772,
      execution: 2140,
      plan: 2140,
      openedBuild: 'trunk',
      confirm: false,
    });
  });

  it('parses recordTaskEstimate args', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { recordEstimate: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('recordTaskEstimate');

    expect(parseCommandInput(command!.schema, ['--taskId', '79945', '--date', ' 2026-06-12 ', '--consumed', '2', '--left', '18', '--work', ' 今天处理联调 '])).toMatchObject({
      taskId: 79945,
      date: '2026-06-12',
      consumed: 2,
      left: 18,
      work: '今天处理联调',
      confirm: false,
    });
  });

  it('parses inline --key=value CLI args', () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { getMyTasks: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');

    expect(parseCommandInput(command!.schema, ['--status=doing', '--page=2', '--limit=5'])).toEqual({
      status: 'doing',
      page: 2,
      limit: 5,
    });
  });

  it('accepts legacyBaseUrl in initZentao args', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const command = registry.getCommand('initZentao');

    expect(parseCommandInput(command!.schema, ['--url', 'https://host', '--username', 'u', '--password', 'p', '--legacyBaseUrl', 'https://host/custom'])).toMatchObject({
      url: 'https://host',
      username: 'u',
      password: 'p',
      legacyBaseUrl: 'https://host/custom',
      save: false,
    });

    expect(parseCommandInput(command!.schema, ['--url', ' https://host ', '--username', ' u ', '--password', ' p ', '--legacyBaseUrl', ' https://host/custom '])).toMatchObject({
      url: 'https://host',
      username: 'u',
      password: ' p ',
      legacyBaseUrl: 'https://host/custom',
    });

    expect(parseCommandInput(command!.schema, ['--apiVersion', ' v2 '])).toMatchObject({
      apiVersion: 'v2',
      save: false,
    });

    expect(parseCommandInput(command!.schema, ['--url', '   ', '--username', '   ', '--apiVersion', '   '])).toMatchObject({
      url: undefined,
      username: undefined,
      apiVersion: undefined,
      save: false,
    });

    expect(() => parseCommandInput(command!.schema, ['--url', '   ', '--username', 'u', '--password', 'p']))
      .not.toThrow();
  });

  it('trims todo and comment write strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const createTodoCommand = registry.getCommand('createTodo');
    const updateTodoCommand = registry.getCommand('updateTodo');
    const addCommentCommand = registry.getCommand('addComment');

    expect(parseCommandInput(createTodoCommand!.schema, ['--name', ' todo ', '--desc', ' note '])).toMatchObject({
      name: 'todo',
      desc: 'note',
      confirm: false,
    });
    expect(parseCommandInput(updateTodoCommand!.schema, ['--todoId', '1', '--name', ' next '])).toMatchObject({
      todoId: 1,
      name: 'next',
      confirm: false,
    });
    expect(parseCommandInput(addCommentCommand!.schema, ['--objectType', 'bug', '--objectID', '1', '--comment', ' hi '])).toMatchObject({
      objectType: 'bug',
      objectID: 1,
      comment: 'hi',
      confirm: false,
    });

    expect(() => parseCommandInput(createTodoCommand!.schema, ['--name', '   '])).toThrow();
    expect(() => parseCommandInput(addCommentCommand!.schema, ['--objectType', 'bug', '--objectID', '1', '--comment', '   '])).toThrow();
  });

  it('trims bug and story write strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const createBugCommand = registry.getCommand('createBug');
    const assignBugCommand = registry.getCommand('assignBug');
    const confirmBugCommand = registry.getCommand('confirmBug');
    const createStoryCommand = registry.getCommand('createStory');
    const assignStoryCommand = registry.getCommand('assignStory');
    const activateStoryCommand = registry.getCommand('activateStory');
    const updateStoryCommand = registry.getCommand('updateStory');

    expect(parseCommandInput(createBugCommand!.schema, ['--product', '2', '--title', ' 登录失败 ', '--assignedTo', ' dev '])).toMatchObject({
      product: 2,
      title: '登录失败',
      assignedTo: 'dev',
      confirm: false,
    });
    expect(parseCommandInput(assignBugCommand!.schema, ['--bugId', '1', '--assignedTo', ' qa ', '--comment', ' note '])).toMatchObject({
      bugId: 1,
      assignedTo: 'qa',
      comment: 'note',
      confirm: false,
    });
    expect(parseCommandInput(confirmBugCommand!.schema, ['--bugId', '1', '--type', ' designchange ', '--comment', ' ok '])).toMatchObject({
      bugId: 1,
      type: 'designchange',
      comment: 'ok',
      confirm: false,
    });
    expect(parseCommandInput(createStoryCommand!.schema, ['--product', '2', '--title', ' 新需求 '])).toMatchObject({
      product: 2,
      title: '新需求',
      confirm: false,
    });
    expect(parseCommandInput(assignStoryCommand!.schema, ['--storyId', '1', '--assignedTo', ' dev '])).toMatchObject({
      storyId: 1,
      assignedTo: 'dev',
      confirm: false,
    });
    expect(parseCommandInput(activateStoryCommand!.schema, ['--storyId', '1', '--comment', '   '])).toMatchObject({
      storyId: 1,
      comment: undefined,
      confirm: false,
    });
    expect(parseCommandInput(updateStoryCommand!.schema, ['--storyId', '1', '--mailto', '[" dev "," qa "]', '--notifyEmail', '[" a@example.com "," b@example.com "]'])).toMatchObject({
      storyId: 1,
      mailto: ['dev', 'qa'],
      notifyEmail: ['a@example.com', 'b@example.com'],
      confirm: false,
    });

    expect(() => parseCommandInput(createBugCommand!.schema, ['--product', '2', '--title', '   '])).toThrow();
    expect(() => parseCommandInput(assignStoryCommand!.schema, ['--storyId', '1', '--assignedTo', '   '])).toThrow();
  });

  it('trims build, test case and test task write strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const createBuildCommand = registry.getCommand('createBuild');
    const createTestCaseCommand = registry.getCommand('createTestCase');
    const updateTestCaseCommand = registry.getCommand('updateTestCase');
    const createTestTaskCommand = registry.getCommand('createTestTask');

    expect(parseCommandInput(createBuildCommand!.schema, ['--project', '1', '--execution', '2', '--product', '3', '--name', ' 构建 ', '--builder', ' me '])).toMatchObject({
      project: 1,
      execution: 2,
      product: 3,
      name: '构建',
      builder: 'me',
      confirm: false,
    });
    expect(parseCommandInput(createTestCaseCommand!.schema, ['--productId', '1', '--title', ' 用例 ', '--type', ' feature ', '--steps', '[{"desc":" d ","expect":" e "}]'])).toMatchObject({
      productId: 1,
      title: '用例',
      type: 'feature',
      steps: [{ desc: 'd', expect: 'e' }],
      confirm: false,
    });
    expect(parseCommandInput(updateTestCaseCommand!.schema, ['--testCaseId', '1', '--title', ' 新标题 '])).toMatchObject({
      testCaseId: 1,
      title: '新标题',
      confirm: false,
    });
    expect(parseCommandInput(createTestTaskCommand!.schema, ['--project', '1', '--productID', '2', '--name', ' 测试单 ', '--build', ' build ', '--begin', ' 2026-01-01 ', '--end', ' 2026-01-02 ', '--type', '[" 功能 "," 冒烟 "]'])).toMatchObject({
      project: 1,
      productID: 2,
      name: '测试单',
      build: 'build',
      begin: '2026-01-01',
      end: '2026-01-02',
      type: ['功能', '冒烟'],
      confirm: false,
    });

    expect(() => parseCommandInput(createBuildCommand!.schema, ['--project', '1', '--execution', '2', '--product', '3', '--name', '   ', '--builder', 'me'])).toThrow();
    expect(() => parseCommandInput(createTestCaseCommand!.schema, ['--productId', '1', '--title', 'ok', '--type', 'feature', '--steps', '[{"desc":"   ","expect":"e"}]'])).toThrow();
    expect(() => parseCommandInput(createTestTaskCommand!.schema, ['--project', '1', '--productID', '2', '--name', 'ok', '--build', '   ', '--begin', '2026-01-01', '--end', '2026-01-02'])).toThrow();
  });

  it('converts blank optional write strings to undefined in schemas', () => {
    const registry = new InMemoryCliRegistry();
    registerTools(registry, 'full');

    const updateStory = registry.getCommand('updateStory');
    const updateExecution = registry.getCommand('updateExecution');
    const createTodo = registry.getCommand('createTodo');
    const confirmBug = registry.getCommand('confirmBug');

    expect(parseCommandInput(updateStory!.schema, ['--storyId', '1', '--reviewer', '   ', '--source', '   '])).toMatchObject({
      storyId: 1,
      reviewer: undefined,
      source: undefined,
    });
    expect(parseCommandInput(updateExecution!.schema, ['--executionId', '1', '--desc', '   ', '--PO', '   '])).toMatchObject({
      executionId: 1,
      desc: undefined,
      PO: undefined,
    });
    expect(parseCommandInput(createTodo!.schema, ['--name', 'todo', '--desc', '   ', '--status', '   '])).toMatchObject({
      name: 'todo',
      desc: undefined,
      status: undefined,
    });
    expect(parseCommandInput(confirmBug!.schema, ['--bugId', '1', '--assignedTo', '   ', '--comment', '   '])).toMatchObject({
      bugId: 1,
      assignedTo: undefined,
      comment: undefined,
    });
  });

  it('trims execution write strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const updateExecutionCommand = registry.getCommand('updateExecution');
    const startExecutionCommand = registry.getCommand('startExecution');

    expect(parseCommandInput(updateExecutionCommand!.schema, ['--executionId', '1', '--name', ' 迭代 ', '--PO', ' po ', '--teamMembers', '[" dev "," qa "]'])).toMatchObject({
      executionId: 1,
      name: '迭代',
      PO: 'po',
      teamMembers: ['dev', 'qa'],
      confirm: false,
    });
    expect(parseCommandInput(startExecutionCommand!.schema, ['--executionId', '1', '--comment', ' start ', '--realBegan', ' 2026-06-05 '])).toMatchObject({
      executionId: 1,
      comment: 'start',
      realBegan: '2026-06-05',
      confirm: false,
    });

    expect(() => parseCommandInput(updateExecutionCommand!.schema, ['--executionId', '1', '--name', '   '])).toThrow();
  });

  it('trims execution and statistics read strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const getExecutionBugsCommand = registry.getCommand('getExecutionBugs');
    const getExecutionDailyBugStatsCommand = registry.getCommand('getExecutionDailyBugStats');
    const getMyWeeklyActivityCommand = registry.getCommand('getMyWeeklyActivity');

    expect(parseCommandInput(getExecutionBugsCommand!.schema, ['--executionId', '1', '--status', ' active ', '--search', ' 登录 ', '--module', ' yj ', '--moduleId', '3383'])).toMatchObject({
      executionId: 1,
      status: 'active',
      search: '登录',
      module: 'yj',
      moduleId: 3383,
    });
    expect(parseCommandInput(getExecutionBugsCommand!.schema, ['--executionId', '1', '--status', '   '])).toMatchObject({
      executionId: 1,
      status: undefined,
    });
    expect(parseCommandInput(getExecutionDailyBugStatsCommand!.schema, ['--executionId', '1', '--iterationName', ' 1.2.3迭代 ', '--date', ' 2026-06-05 '])).toMatchObject({
      executionId: 1,
      iterationName: '1.2.3迭代',
      date: '2026-06-05',
    });
    expect(parseCommandInput(getExecutionDailyBugStatsCommand!.schema, ['--executionId', '1', '--iterationName', '   ', '--date', '   '])).toMatchObject({
      executionId: 1,
      iterationName: undefined,
      date: undefined,
    });
    expect(parseCommandInput(getMyWeeklyActivityCommand!.schema, ['--account', ' me ', '--dateRange', ' 最近3天 ', '--startDate', ' 2026-05-25 ', '--endDate', ' 2026-05-29 '])).toMatchObject({
      account: 'me',
      dateRange: '最近3天',
      startDate: '2026-05-25',
      endDate: '2026-05-29',
      week: 'last',
    });

    expect(() => parseCommandInput(getMyWeeklyActivityCommand!.schema, ['--account', '   '])).toThrow();
  });

  it('trims low-frequency read query strings in schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const getMyBugsCommand = registry.getCommand('getMyBugs');
    const getProductBugsCommand = registry.getCommand('getProductBugs');
    const getProductPlansCommand = registry.getCommand('getProductPlans');
    const getProgramsCommand = registry.getCommand('getPrograms');
    const getProductTestCasesCommand = registry.getCommand('getProductTestCases');

    expect(parseCommandInput(getMyBugsCommand!.schema, ['--branch', ' main ', '--order', ' id_desc '])).toMatchObject({
      branch: 'main',
      order: 'id_desc',
    });
    expect(parseCommandInput(getProductBugsCommand!.schema, ['--productId', '2', '--status', '   '])).toMatchObject({
      productId: 2,
      status: undefined,
    });
    expect(parseCommandInput(getProductBugsCommand!.schema, ['--productId', '2', '--status', ' all ', '--branch', ' dev ', '--order', ' id_asc ', '--search', ' 登录 ', '--module', ' yj '])).toMatchObject({
      productId: 2,
      status: 'all',
      branch: 'dev',
      order: 'id_asc',
      search: '登录',
      module: 'yj',
    });
    expect(parseCommandInput(getProductPlansCommand!.schema, ['--productId', '1', '--branch', ' all ', '--status', ' doing ', '--query', ' q ', '--order', ' id_desc '])).toMatchObject({
      productId: 1,
      branch: 'all',
      status: 'doing',
      query: 'q',
      order: 'id_desc',
    });
    expect(parseCommandInput(getProductPlansCommand!.schema, ['--productId', '1', '--branch', '   ', '--status', '   ', '--query', '   ', '--order', '   '])).toMatchObject({
      productId: 1,
      branch: undefined,
      status: undefined,
      query: undefined,
      order: undefined,
    });
    expect(parseCommandInput(getProgramsCommand!.schema, ['--order', ' id_desc '])).toMatchObject({ order: 'id_desc' });
    expect(parseCommandInput(getProgramsCommand!.schema, ['--order', '   '])).toMatchObject({ order: undefined });
    expect(parseCommandInput(getProductTestCasesCommand!.schema, ['--productId', '2', '--status', ' normal '])).toMatchObject({
      productId: 2,
      status: 'normal',
    });
    expect(parseCommandInput(getProductTestCasesCommand!.schema, ['--productId', '2', '--status', '   '])).toMatchObject({
      productId: 2,
      status: undefined,
    });
  });

  it('trims low-frequency path strings in resource analysis schemas', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');
    const analyzeBugResourcesCommand = registry.getCommand('analyzeBugResources');

    expect(parseCommandInput(analyzeBugResourcesCommand!.schema, ['--bugId', '1', '--outDir', ' /tmp/zentao-resources '])).toMatchObject({
      bugId: 1,
      outDir: '/tmp/zentao-resources',
      download: true,
    });
    expect(parseCommandInput(analyzeBugResourcesCommand!.schema, ['--bugId', '1', '--outDir', '   '])).toMatchObject({
      bugId: 1,
      outDir: undefined,
      download: true,
    });
  });

  it('returns confirm previews before calling write handlers', async () => {
    const registry = new InMemoryCliRegistry();
    const updateTask = vi.fn();
    setApi({ task: { updateTask } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('updateTask');
    const input = parseCommandInput(command!.schema, ['--taskId', '9', '--name', 'next']);
    const result = await command!.handler(input);

    expect(updateTask).not.toHaveBeenCalled();
    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'updateTask',
      reason: expect.stringContaining('confirm: true'),
    });
  });

  it('omits blank optional write strings from preview payloads', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ story: { updateStory: vi.fn() } } as never);

    registerTools(registry, 'full');
    const command = registry.getCommand('updateStory');
    const input = parseCommandInput(command!.schema, ['--storyId', '9', '--reviewer', '   ', '--sourceNote', ' note ']);
    const result = await command!.handler(input);

    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'updateStory',
      payload: {
        storyId: 9,
        update: {
          sourceNote: 'note',
        },
      },
    });
    expect(JSON.stringify(parseResult(result))).not.toContain('reviewer');
  });

  it('returns disabled previews when write is explicitly disabled', async () => {
    process.env.ZENTAO_DISABLE_WRITE = 'true';
    const registry = new InMemoryCliRegistry();
    const updateTask = vi.fn();
    setApi({ task: { updateTask } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('updateTask');
    const input = parseCommandInput(command!.schema, ['--taskId', '9', '--name', 'next', '--confirm']);
    const result = await command!.handler(input);

    expect(updateTask).not.toHaveBeenCalled();
    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'updateTask',
      reason: expect.stringContaining('ZENTAO_DISABLE_WRITE=true'),
    });
  });

  it('allow previously-unsupported write tools now routed through legacy controller', async () => {
    const registry = new InMemoryCliRegistry();
    const updateTestTask = vi.fn(async () => ({ status: 'success' }));
    setApi({ testtask: { updateTestTask } } as never);

    registerTools(registry, 'full');
    const command = registry.getCommand('updateTestTask');
    const input = parseCommandInput(command!.schema, ['--testTaskId', '1', '--name', 'test', '--confirm']);
    const result = await command!.handler(input);

    expect(updateTestTask).toHaveBeenCalled();
    expect(parseResult(result)).toEqual({ status: 'success' });
  });

  it('trims task write strings and rejects whitespace-only required values in schemas', () => {
    const registry = new InMemoryCliRegistry();
    registerTools(registry, 'dev');

    const finishTask = registry.getCommand('finishTask');
    const assignTask = registry.getCommand('assignTask');
    const pauseTask = registry.getCommand('pauseTask');
    const activateTask = registry.getCommand('activateTask');
    const createTaskFromStory = registry.getCommand('createTaskFromStory');

    expect(parseCommandInput(finishTask!.schema, ['--taskId', '1', '--currentConsumed', '1', '--realStarted', ' 2026-01-01 ', '--finishedDate', ' 2026-01-02 ']))
      .toMatchObject({ realStarted: '2026-01-01', finishedDate: '2026-01-02' });
    expect(() => parseCommandInput(finishTask!.schema, ['--taskId', '1', '--currentConsumed', '1', '--realStarted', '   ', '--finishedDate', '2026-01-02']))
      .toThrow();
    expect(parseCommandInput(assignTask!.schema, ['--taskId', '1', '--assignedTo', ' dev ']))
      .toMatchObject({ assignedTo: 'dev' });
    expect(parseCommandInput(pauseTask!.schema, ['--taskId', '1', '--comment', ' note ']))
      .toMatchObject({ comment: 'note' });
    expect(parseCommandInput(activateTask!.schema, ['--taskId', '1', '--assignedTo', ' qa ', '--comment', ' back ']))
      .toMatchObject({ assignedTo: 'qa', comment: 'back' });
    expect(parseCommandInput(createTaskFromStory!.schema, ['--storyId', '1', '--execution', '2', '--taskName', ' 新任务 ', '--assignedTo', ' me ', '--estStarted', ' 2026-01-01 ', '--deadline', ' 2026-01-02 ']))
      .toMatchObject({ taskName: '新任务', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02' });
    expect(() => parseCommandInput(createTaskFromStory!.schema, ['--storyId', '1', '--execution', '2', '--taskName', '   ', '--assignedTo', 'me', '--estStarted', '2026-01-01', '--deadline', '2026-01-02']))
      .toThrow();
    expect(parseCommandInput(activateTask!.schema, ['--taskId', '1', '--assignedTo', '   ', '--comment', '   ']))
      .toMatchObject({ assignedTo: undefined, comment: undefined });
  });

  it('omits blank optional task strings from preview payloads', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { updateTask: vi.fn() } } as never);

    registerTools(registry, 'dev');
    const command = registry.getCommand('updateTask');
    const input = parseCommandInput(command!.schema, ['--taskId', '9', '--assignedTo', '   ', '--desc', ' note ']);
    const result = await command!.handler(input);

    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'updateTask',
      payload: {
        taskId: 9,
        update: {
          desc: 'note',
        },
      },
    });
    expect(JSON.stringify(parseResult(result))).not.toContain('assignedTo');
  });

  it('falls back to default derived task text when optional values are empty after trim', async () => {
    const registry = new InMemoryCliRegistry();
    const createTask = vi.fn(async () => ({ status: 'ok' }));
    setApi({
      bug: { getBugDetail: vi.fn(async () => ({ title: '登录失败', steps: '第一步' })) },
      task: { createTask },
    } as never);

    registerTools(registry, 'full');
    const command = registry.getCommand('createTaskFromBug');
    const result = await command!.handler({
      bugId: 1,
      execution: 2,
      taskName: '',
      type: '',
      assignedTo: 'me',
      estStarted: '2026-01-01',
      deadline: '2026-01-02',
      desc: '',
      confirm: false,
    });

    expect(createTask).not.toHaveBeenCalled();
    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'createTaskFromBug',
      payload: {
        execution: 2,
        name: '修复Bug #1: 登录失败',
        type: 'devel',
        assignedTo: 'me',
        estStarted: '2026-01-01',
        deadline: '2026-01-02',
        fromBug: 1,
        desc: '修复Bug #1: 登录失败\n\n复现步骤:\n第一步',
      },
    });
  });

  it('dispatches registered read tools to their API methods', async () => {
    const registry = new InMemoryCliRegistry();
    const api = {
      bug: { getMyBugs: vi.fn(async () => ({ name: 'getMyBugs' })), getProductBugs: vi.fn(async () => ({ name: 'getProductBugs' })), getBugDetail: vi.fn(async () => ({ name: 'getBugDetail' })) },
      build: { getProjectBuilds: vi.fn(async () => ({ name: 'getProjectBuilds' })), getBuildDetail: vi.fn(async () => ({ name: 'getBuildDetail' })) },
      comment: { getComments: vi.fn(async () => ({ name: 'getComments' })) },
      developmentContext: { getDevelopmentContext: vi.fn(async () => ({ name: 'getDevelopmentContext' })) },
      execution: {
        getExecutionDetail: vi.fn(async () => ({ name: 'getExecutionDetail' })),
        getExecutionDynamic: vi.fn(async () => ({ name: 'getExecutionDynamic' })),
        getProjectExecutions: vi.fn(async () => ({ name: 'getProjectExecutions' })),
        getExecutionBuilds: vi.fn(async () => ({ name: 'getExecutionBuilds' })),
        getExecutionBugs: vi.fn(async () => ({ name: 'getExecutionBugs' })),
        getExecutionDailyBugStats: vi.fn(async () => ({ name: 'getExecutionDailyBugStats' })),
      },
      plan: { getProductPlans: vi.fn(async () => ({ name: 'getProductPlans' })), getPlanDetail: vi.fn(async () => ({ name: 'getPlanDetail' })) },
      product: { getProducts: vi.fn(async () => ({ name: 'getProducts' })), getProductDetail: vi.fn(async () => ({ name: 'getProductDetail' })) },
      program: { getPrograms: vi.fn(async () => ({ name: 'getPrograms' })), getProgramDetail: vi.fn(async () => ({ name: 'getProgramDetail' })) },
      project: { getProjects: vi.fn(async () => ({ name: 'getProjects' })), getProjectDetail: vi.fn(async () => ({ name: 'getProjectDetail' })) },
      relation: { getStoryRelatedBugs: vi.fn(async () => ({ name: 'getStoryRelatedBugs' })), getBugRelatedStory: vi.fn(async () => ({ name: 'getBugRelatedStory' })) },
      release: { getProjectReleases: vi.fn(async () => ({ name: 'getProjectReleases' })), getReleaseDetail: vi.fn(async () => ({ name: 'getReleaseDetail' })) },
      resourceAnalysis: { analyzeObjectResources: vi.fn(async () => ({ name: 'analyzeObjectResources' })) },
      search: { searchStories: vi.fn(async () => ({ name: 'searchStories' })), searchStoriesByProductName: vi.fn(async () => ({ name: 'searchStoriesByProductName' })) },
      statistics: { getMyTaskStatistics: vi.fn(async () => ({ name: 'getMyTaskStatistics' })), getMyBugStatistics: vi.fn(async () => ({ name: 'getMyBugStatistics' })), getMyWeeklyActivity: vi.fn(async () => ({ name: 'getMyWeeklyActivity' })) },
      story: { getProductStories: vi.fn(async () => ({ name: 'getProductStories' })), getStoryDetail: vi.fn(async () => ({ name: 'getStoryDetail' })) },
      task: { getMyTasks: vi.fn(async () => ({ name: 'getMyTasks' })), getTaskDetail: vi.fn(async () => ({ name: 'getTaskDetail' })) },
      testcase: { getProductTestCases: vi.fn(async () => ({ name: 'getProductTestCases' })), getTestCaseDetail: vi.fn(async () => ({ name: 'getTestCaseDetail' })) },
      testtask: { getTestTasks: vi.fn(async () => ({ name: 'getTestTasks' })), getTestTaskDetail: vi.fn(async () => ({ name: 'getTestTaskDetail' })) },
      todo: { getTodos: vi.fn(async () => ({ name: 'getTodos' })), getTodoDetail: vi.fn(async () => ({ name: 'getTodoDetail' })) },
      user: { getMyProfile: vi.fn(async () => ({ name: 'getMyProfile' })) },
    };
    setApi(api as never);
    registerTools(registry, 'full');

    const calls: Array<[string, Record<string, unknown>]> = [
      ['getMyBugs', { productId: 1 }], ['getProductBugs', { productId: 1 }], ['getBugDetail', { bugId: 1 }],
      ['getProjectBuilds', { projectId: 1 }], ['getBuildDetail', { buildId: 1 }], ['getComments', { objectType: 'bug', objectID: 1 }],
      ['getDevelopmentContext', { entityType: 'story', entityId: 1 }], ['getExecutionDetail', { executionId: 1 }], ['getExecutionDynamic', { executionId: 1 }],
      ['getProjectExecutions', { projectId: 1 }], ['getExecutionBuilds', { executionId: 1 }], ['getExecutionBugs', { executionId: 1, page: 1, limit: 2, status: 'active' }],
      ['getExecutionDailyBugStats', { executionId: 1, iterationName: 'i', date: 'today' }], ['getProductPlans', { productId: 1 }], ['getPlanDetail', { planId: 1 }],
      ['getProducts', {}], ['getProductDetail', { productId: 1 }], ['getPrograms', { order: 'id_desc' }], ['getProgramDetail', { programId: 1 }],
      ['getProjects', { page: 1 }], ['getProjectDetail', { projectId: 1 }], ['getStoryRelatedBugs', { storyId: 1, productId: 1 }], ['getBugRelatedStory', { bugId: 1 }],
      ['getProjectReleases', { projectId: 1 }], ['getReleaseDetail', { releaseId: 1 }], ['searchStories', { keyword: 'a', productId: 1 }], ['searchStoriesByProductName', { productName: 'p', keyword: 'a' }],
      ['analyzeBugResources', { bugId: 1, download: false }], ['analyzeTaskResources', { taskId: 1, download: false }],
      ['getMyTaskStatistics', {}], ['getMyBugStatistics', { productId: 1 }], ['getMyWeeklyActivity', { week: 'this' }],
      ['getProductStories', { productId: 1 }], ['getStoryDetail', { storyId: 1 }], ['getMyTasks', { status: 'all' }], ['getTaskDetail', { taskId: 1 }], ['getMyTodos', {}], ['getTodoDetail', { todoId: 1 }],
      ['getProductTestCases', { productId: 1 }], ['getTestCaseDetail', { testCaseId: 1 }], ['getTestTasks', { productId: 1 }], ['getTestTaskDetail', { testTaskId: 1 }], ['getMyProfile', {}], ['whoami', {}], ['who-am-i', {}],
    ];

    for (const [name, input] of calls) {
      await expect(registry.getCommand(name)!.handler(input)).resolves.toMatchObject({ content: [{ type: 'text' }] });
    }

    expect(api.execution.getExecutionBugs).toHaveBeenCalledWith(1, { page: 1, limit: 2, status: 'active' });
    expect(api.program.getPrograms).toHaveBeenCalledWith('id_desc');
  });

  it('executes supported write tool handlers by default when confirmed', async () => {
    const registry = new InMemoryCliRegistry();
    const api = {
      bug: { getBugDetail: vi.fn(async () => ({ title: 'b', steps: 's' })), resolveBug: vi.fn(async () => ({ name: 'resolveBug' })) },
      build: { createBuild: vi.fn(async () => ({ name: 'createBuild' })), updateBuild: vi.fn(async () => ({ name: 'updateBuild' })) },
      execution: {
        startExecution: vi.fn(async () => ({ name: 'startExecution' })), closeExecution: vi.fn(async () => ({ name: 'closeExecution' })),
        suspendExecution: vi.fn(async () => ({ name: 'suspendExecution' })), activateExecution: vi.fn(async () => ({ name: 'activateExecution' })), putoffExecution: vi.fn(async () => ({ name: 'putoffExecution' })),
      },
      plan: {
        linkStoriesToPlan: vi.fn(async () => ({ name: 'linkStoriesToPlan' })), unlinkStoriesFromPlan: vi.fn(async () => ({ name: 'unlinkStoriesFromPlan' })),
        linkBugsToPlan: vi.fn(async () => ({ name: 'linkBugsToPlan' })), unlinkBugsFromPlan: vi.fn(async () => ({ name: 'unlinkBugsFromPlan' })),
      },
      story: {
        getStoryDetail: vi.fn(async () => ({ title: 's' })),
        updateStory: vi.fn(async () => ({ name: 'updateStory' })),
        changeStory: vi.fn(async () => ({ name: 'changeStory' })),
        createStory: vi.fn(async () => ({ name: 'createStory' })),
        closeStory: vi.fn(async () => ({ name: 'closeStory' })),
        assignStory: vi.fn(async () => ({ name: 'assignStory' })),
        activateStory: vi.fn(async () => ({ name: 'activateStory' })),
        reviewStory: vi.fn(async () => ({ name: 'reviewStory' })),
      },
      task: { updateTask: vi.fn(async () => ({ name: 'updateTask' })), finishTask: vi.fn(async () => ({ name: 'finishTask' })), createTask: vi.fn(async () => ({ name: 'createTask' })) },
      testcase: { createTestCase: vi.fn(async () => ({ name: 'createTestCase' })), updateTestCase: vi.fn(async () => ({ name: 'updateTestCase' })) },
      testtask: { createTestTask: vi.fn(async () => ({ name: 'createTestTask' })) },
      todo: {
        createTodo: vi.fn(async () => ({ name: 'createTodo' })),
        updateTodo: vi.fn(async () => ({ name: 'updateTodo' })),
        deleteTodo: vi.fn(async () => ({ name: 'deleteTodo' })),
        finishTodo: vi.fn(async () => ({ name: 'finishTodo' })),
        activateTodo: vi.fn(async () => ({ name: 'activateTodo' })),
      },
    };
    setApi(api as never);
    registerTools(registry, 'full');

    const calls: Array<[string, Record<string, unknown>]> = [
      ['updateTask', { taskId: 1, name: 't', confirm: true }],
      ['finishTask', { taskId: 1, currentConsumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02', confirm: true }],
      ['resolveBug', { bugId: 1, resolution: 'fixed', confirm: true }],
      ['updateStory', { storyId: 1, title: 's', confirm: true }],
      ['changeStory', { storyId: 1, title: 's2', confirm: true }],
      ['createStory', { product: 1, title: 's3', confirm: true }],
      ['closeStory', { storyId: 1, comment: 'c', confirm: true }],
      ['assignStory', { storyId: 1, assignedTo: 'me', confirm: true }],
      ['activateStory', { storyId: 1, comment: 'a', confirm: true }],
      ['reviewStory', { storyId: 1, result: 'pass', confirm: true }],
      ['createTaskFromStory', { storyId: 1, execution: 2, taskName: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
      ['createTaskFromBug', { bugId: 1, execution: 2, assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
      ['createTodo', { name: 'todo', confirm: true }],
      ['updateTodo', { todoId: 1, name: 'todo2', confirm: true }],
      ['deleteTodo', { todoId: 1, confirm: true }],
      ['finishTodo', { todoId: 1, confirm: true }],
      ['activateTodo', { todoId: 1, confirm: true }],
      ['linkStoriesToPlan', { planId: 1, storyIds: [1], confirm: true }],
      ['unlinkStoriesFromPlan', { planId: 1, storyIds: [1], confirm: true }],
      ['linkBugsToPlan', { planId: 1, bugIds: [1], confirm: true }],
      ['unlinkBugsFromPlan', { planId: 1, bugIds: [1], confirm: true }],
      ['startExecution', { executionId: 1, confirm: true }],
      ['closeExecution', { executionId: 1, confirm: true }],
      ['suspendExecution', { executionId: 1, confirm: true }],
      ['activateExecution', { executionId: 1, confirm: true }],
      ['putoffExecution', { executionId: 1, days: 2, confirm: true }],
      ['createBuild', { project: 1, execution: 2, product: 3, name: 'b', builder: 'me', confirm: true }],
      ['updateBuild', { buildId: 1, name: 'b2', confirm: true }],
      ['createTestCase', { productId: 1, title: 'c', type: 'feature', steps: [{ desc: 'd', expect: 'e' }], confirm: true }],
      ['updateTestCase', { testCaseId: 1, title: 'c2', confirm: true }],
      ['createTestTask', { project: 1, productID: 2, name: 'tt', build: 3, begin: '2026-01-01', end: '2026-01-02', confirm: true }],
    ];

    for (const [name, input] of calls) {
      await expect(registry.getCommand(name)!.handler(input)).resolves.toMatchObject({ content: [{ type: 'text' }] });
    }

    expect(api.task.createTask).toHaveBeenCalledTimes(2);
    expect(api.execution.putoffExecution).toHaveBeenCalledWith(1, { days: 2 });
  });
});
