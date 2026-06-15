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

  it('registers the full role command surface', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');

    expect(registry.listCommands().map((command) => command.name).sort()).toEqual([
      'activateBug',
      'activateExecution',
      'activatePlan',
      'activateStory',
      'activateTask',
      'activateTodo',
      'addComment',
      'analyzeBugResources',
      'analyzeTaskResources',
      'assignBug',
      'assignBuildTo',
      'assignStory',
      'assignTask',
      'assignTodo',
      'batchActivateBugs',
      'batchActivateTasks',
      'batchAssignBugs',
      'batchAssignStoriesTo',
      'batchAssignTasksTo',
      'batchCancelTasks',
      'batchChangeBugBranch',
      'batchChangeBugModule',
      'batchChangeBugPlan',
      'batchChangeStoryBranch',
      'batchChangeStoryModule',
      'batchChangeStoryPlan',
      'batchChangeStoryStage',
      'batchChangeTaskBranch',
      'batchChangeTaskModule',
      'batchChangeTaskPlan',
      'batchCloseBugs',
      'batchCloseStories',
      'batchCloseTasks',
      'batchCloseTodos',
      'batchConfirmBugs',
      'batchConfirmTestCaseStoryChange',
      'batchFinishTasks',
      'batchFinishTodos',
      'batchResolveBugs',
      'batchReviewStories',
      'batchUnlinkBugsFromBuild',
      'batchUnlinkBugsFromRelease',
      'batchUnlinkStoriesFromBuild',
      'batchUnlinkStoriesFromRelease',
      'cancelTask',
      'changeReleaseStatus',
      'changeStory',
      'closeBug',
      'closeExecution',
      'closePlan',
      'closeStory',
      'closeTask',
      'computeExecutionBurn',
      'confirmBug',
      'confirmBugStoryChange',
      'confirmExecutionStoryChange',
      'confirmTaskStoryChange',
      'confirmTestCaseStoryChange',
      'confirmTestCaseLibcaseChange',
      'ignoreTestCaseLibcaseChange',
      'createBug',
      'createBuild',
      'createStory',
      'createTaskFromBug',
      'createTaskFromStory',
      'createTestCase',
      'createTestTask',
      'createTodo',
      'deleteBug',
      'deleteRelease',
      'deleteTask',
      'deleteTaskEstimate',
      'deleteTestTask',
      'deleteTodo',
      'editTaskEstimate',
      'finishPlan',
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
      'importTodosToToday',
      'initZentao',
      'linkBugsToBuild',
      'linkBugsToPlan',
      'linkBugsToRelease',
      'linkStoriesToBuild',
      'linkStoriesToPlan',
      'linkStoriesToRelease',
      'linkStoriesToStory',
      'notifyBuildBug',
      'notifyRelease',
      'okBug',
      'pauseTask',
      'processStoryChange',
      'putoffExecution',
      'recallStory',
      'recordTaskEstimate',
      'resolveBug',
      'restartTask',
      'reviewStory',
      'searchStories',
      'searchStoriesByProductName',
      'startTestTask',
      'startExecution',
      'startPlan',
      'startTask',
      'startTodo',
      'submitStoryReview',
      'activateTestTask',
      'blockTestTask',
      'closeTestTask',
      'closeTodo',
      'suspendExecution',
      'unlinkBugFromBuild',
      'unlinkBugFromRelease',
      'unlinkBugsFromPlan',
      'unlinkStoriesFromPlan',
      'unlinkStoryFromBuild',
      'unlinkStoryFromRelease',
      'unlinkStoryFromStory',
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
    ].sort());
  });

  it('filters commands by role', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'pm');

    const names = registry.listCommands().map((command) => command.name);
    expect(names).toContain('getProducts');
    expect(names).toContain('getProductStories');
    expect(names).toContain('getProductPlans');
    expect(names).toContain('startPlan');
    expect(names).toContain('notifyRelease');
    expect(names).not.toContain('getMyBugs');
    expect(names).not.toContain('getProductTestCases');
  });

  it('parses CLI args and calls read handlers through the API provider', async () => {
    const registry = new InMemoryCliRegistry();
    const getMyTasks = vi.fn(async (input: unknown) => ({ ok: true, input }));
    setApi({ task: { getMyTasks } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');
    expect(command).toBeDefined();

    const input = parseCommandInput(command!.schema, ['--status', 'doing', '--page', '2', '--limit', '5']);
    const result = await command!.handler(input);

    expect(getMyTasks).toHaveBeenCalledWith({ status: 'doing', page: 2, limit: 5 });
    expect(parseResult(result)).toEqual({ ok: true, input: { status: 'doing', page: 2, limit: 5 } });
  });

  it('rejects unknown CLI args instead of silently ignoring them', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { getMyTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');

    expect(() => parseCommandInput(command!.schema, ['--statsu', 'doing'])).toThrow('未知参数: --statsu');
  });

  it('parses getProductBugs search keyword', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { getProductBugs: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('getProductBugs');

    expect(parseCommandInput(command!.schema, ['--productId', '87', '--status', 'all', '--limit', '100', '--order', 'id_desc', '--search', '浙江'])).toMatchObject({
      productId: 87,
      status: 'all',
      limit: 100,
      order: 'id_desc',
      search: '浙江',
    });
  });

  it('parses getProductBugs module alias keyword', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { getProductBugs: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('getProductBugs');

    expect(parseCommandInput(command!.schema, ['--productId', '87', '--module', 'Yj'])).toMatchObject({
      productId: 87,
      module: 'Yj',
    });
  });

  it('parses updateBug project, execution, plan and openedBuild args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { updateBug: vi.fn() } } as never);

    await registerTools(registry, 'dev');
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

  it('parses confirmBugStoryChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ bug: { confirmStoryChange: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('confirmBugStoryChange');

    expect(parseCommandInput(command!.schema, ['--bugId', '84362'])).toMatchObject({
      bugId: 84362,
      confirm: false,
    });
  });

  it('parses recordTaskEstimate args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { recordEstimate: vi.fn() } } as never);

    await registerTools(registry, 'dev');
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

  it('parses editTaskEstimate args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { editEstimate: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('editTaskEstimate');

    expect(parseCommandInput(command!.schema, ['--estimateId', '12', '--date', ' 2026-06-12 ', '--consumed', '2', '--left', '18', '--work', ' 处理联调 '])).toMatchObject({
      estimateId: 12,
      date: '2026-06-12',
      consumed: 2,
      left: 18,
      work: '处理联调',
      confirm: false,
    });
  });

  it('parses deleteTaskEstimate args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { deleteEstimate: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('deleteTaskEstimate');

    expect(parseCommandInput(command!.schema, ['--estimateId', '12'])).toMatchObject({
      estimateId: 12,
      confirm: false,
    });
  });

  it('parses confirmTaskStoryChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { confirmStoryChange: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('confirmTaskStoryChange');

    expect(parseCommandInput(command!.schema, ['--taskId', '79922'])).toMatchObject({
      taskId: 79922,
      confirm: false,
    });
  });

  it('parses confirmTestCaseStoryChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ testcase: { confirmStoryChange: vi.fn() } } as never);

    await registerTools(registry, 'full');
    const command = registry.getCommand('confirmTestCaseStoryChange');

    expect(parseCommandInput(command!.schema, ['--caseId', '58191'])).toMatchObject({
      caseId: 58191,
      confirm: false,
    });
  });

  it('parses confirmTestCaseLibcaseChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ testcase: { confirmLibcaseChange: vi.fn() } } as never);

    await registerTools(registry, 'full');
    const command = registry.getCommand('confirmTestCaseLibcaseChange');

    expect(parseCommandInput(command!.schema, ['--caseId', '58191', '--libcaseId', '58192'])).toMatchObject({
      caseId: 58191,
      libcaseId: 58192,
      confirm: false,
    });
  });

  it('parses ignoreTestCaseLibcaseChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ testcase: { ignoreLibcaseChange: vi.fn() } } as never);

    await registerTools(registry, 'full');
    const command = registry.getCommand('ignoreTestCaseLibcaseChange');

    expect(parseCommandInput(command!.schema, ['--caseId', '58191'])).toMatchObject({
      caseId: 58191,
      confirm: false,
    });
  });

  it('parses batchConfirmTestCaseStoryChange args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ testcase: { batchConfirmStoryChange: vi.fn() } } as never);

    await registerTools(registry, 'full');
    const command = registry.getCommand('batchConfirmTestCaseStoryChange');

    expect(parseCommandInput(command!.schema, ['--productId', '153', '--caseIds', '58191', '--caseIds', '58192'])).toMatchObject({
      productId: 153,
      caseIds: [58191, 58192],
      confirm: false,
    });
  });

  it('parses batchFinishTasks args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchFinishTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchFinishTasks');

    expect(parseCommandInput(command!.schema, ['--taskIds', '1', '--taskIds', '2'])).toMatchObject({
      taskIds: [1, 2],
      confirm: false,
    });
  });

  it('parses batchCancelTasks args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchCancelTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchCancelTasks');

    expect(parseCommandInput(command!.schema, ['--taskIds', '3'])).toMatchObject({
      taskIds: [3],
      confirm: false,
    });
  });

  it('parses batchCloseTasks args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchCloseTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchCloseTasks');

    expect(parseCommandInput(command!.schema, ['--taskIds', '4', '--taskIds', '5'])).toMatchObject({
      taskIds: [4, 5],
      confirm: false,
    });
  });

  it('parses batchChangeTaskBranch args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchChangeTaskBranch: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchChangeTaskBranch');

    expect(parseCommandInput(command!.schema, ['--taskIds', '6', '--branchId', '100'])).toMatchObject({
      taskIds: [6],
      branchId: 100,
      confirm: false,
    });
  });

  it('parses batchChangeTaskModule args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchChangeTaskModule: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchChangeTaskModule');

    expect(parseCommandInput(command!.schema, ['--taskIds', '7', '--moduleId', '10'])).toMatchObject({
      taskIds: [7],
      moduleId: 10,
      confirm: false,
    });
  });

  it('parses batchChangeTaskPlan args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchChangeTaskPlan: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchChangeTaskPlan');

    expect(parseCommandInput(command!.schema, ['--taskIds', '8', '--planId', '3'])).toMatchObject({
      taskIds: [8],
      planId: 3,
      confirm: false,
    });
  });

  it('parses batchAssignTasksTo args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchAssignTasksTo: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchAssignTasksTo');

    expect(parseCommandInput(command!.schema, ['--taskIds', '9', '--taskIds', '10', '--assignedTo', 'dev', '--comment', ' 请处理 '])).toMatchObject({
      taskIds: [9, 10],
      assignedTo: 'dev',
      comment: '请处理',
      confirm: false,
    });
  });

  it('parses batchActivateTasks args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { batchActivateTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('batchActivateTasks');

    expect(parseCommandInput(command!.schema, ['--taskIds', '11'])).toMatchObject({
      taskIds: [11],
      confirm: false,
    });
  });

  it('parses cancelTask args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { cancelTask: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('cancelTask');

    expect(parseCommandInput(command!.schema, ['--taskId', '79922', '--comment', ' 暂不处理 '])).toMatchObject({
      taskId: 79922,
      comment: '暂不处理',
      confirm: false,
    });
  });


  it('parses closePlan args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ plan: { closePlan: vi.fn() } } as never);

    await registerTools(registry, 'pm');
    const command = registry.getCommand('closePlan');

    expect(parseCommandInput(command!.schema, ['--planId', '8', '--closedReason', ' done ', '--comment', ' close it '])).toMatchObject({
      planId: 8,
      closedReason: 'done',
      comment: 'close it',
      confirm: false,
    });
  });

  it('parses linkBugsToRelease args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ release: { linkBugsToRelease: vi.fn() } } as never);

    await registerTools(registry, 'pm');
    const command = registry.getCommand('linkBugsToRelease');

    expect(parseCommandInput(command!.schema, ['--releaseId', '9', '--bugIds', '21', '--bugIds', '22', '--type', 'leftBug'])).toMatchObject({
      releaseId: 9,
      bugIds: [21, 22],
      type: 'leftBug',
      confirm: false,
    });
  });

  it('parses linkStoriesToBuild args', async () => {
    const registry = new InMemoryCliRegistry();
    await registerTools(registry, 'full');
    const command = registry.getCommand('linkStoriesToBuild');

    expect(parseCommandInput(command!.schema, ['--buildId', '9', '--storyIds', '21', '--storyIds', '22'])).toEqual({
      buildId: 9,
      storyIds: [21, 22],
      confirm: false,
    });
  });

  it('parses linkStoriesToStory args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ story: { linkStoriesToStory: vi.fn() } } as never);

    await registerTools(registry, 'pm');
    const command = registry.getCommand('linkStoriesToStory');

    expect(parseCommandInput(command!.schema, ['--storyId', '9', '--storyIds', '21', '--storyIds', '22'])).toMatchObject({
      storyId: 9,
      storyIds: [21, 22],
      confirm: false,
    });
  });

  it('parses inline --key=value CLI args', async () => {
    const registry = new InMemoryCliRegistry();
    setApi({ task: { getMyTasks: vi.fn() } } as never);

    await registerTools(registry, 'dev');
    const command = registry.getCommand('getMyTasks');

    expect(parseCommandInput(command!.schema, ['--status=doing', '--page=2', '--limit=5'])).toEqual({
      status: 'doing',
      page: 2,
      limit: 5,
    });
  });

  it('accepts legacyBaseUrl in initZentao args', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims todo and comment write strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims bug and story write strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims build, test case and test task write strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
    const createBuildCommand = registry.getCommand('createBuild');
    const createTestCaseCommand = registry.getCommand('createTestCase');
    const updateTestCaseCommand = registry.getCommand('updateTestCase');
    const createTestTaskCommand = registry.getCommand('createTestTask');
    const startTestTaskCommand = registry.getCommand('startTestTask');
    const activateTestTaskCommand = registry.getCommand('activateTestTask');
    const blockTestTaskCommand = registry.getCommand('blockTestTask');
    const closeTestTaskCommand = registry.getCommand('closeTestTask');
    const deleteTestTaskCommand = registry.getCommand('deleteTestTask');

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
    expect(parseCommandInput(startTestTaskCommand!.schema, ['--testTaskId', '1', '--comment', ' start '])).toMatchObject({
      testTaskId: 1,
      comment: 'start',
      confirm: false,
    });
    expect(parseCommandInput(activateTestTaskCommand!.schema, ['--testTaskId', '1', '--comment', ' active '])).toMatchObject({
      testTaskId: 1,
      comment: 'active',
      confirm: false,
    });
    expect(parseCommandInput(blockTestTaskCommand!.schema, ['--testTaskId', '1', '--comment', ' block '])).toMatchObject({
      testTaskId: 1,
      comment: 'block',
      confirm: false,
    });
    expect(parseCommandInput(closeTestTaskCommand!.schema, ['--testTaskId', '1', '--realFinishedDate', ' 2026-01-03 ', '--mailto', '[" qa "," pm "]', '--comment', ' close '])).toMatchObject({
      testTaskId: 1,
      realFinishedDate: '2026-01-03',
      mailto: ['qa', 'pm'],
      comment: 'close',
      confirm: false,
    });
    expect(parseCommandInput(deleteTestTaskCommand!.schema, ['--testTaskId', '1'])).toMatchObject({
      testTaskId: 1,
      confirm: false,
    });

    expect(() => parseCommandInput(createBuildCommand!.schema, ['--project', '1', '--execution', '2', '--product', '3', '--name', '   ', '--builder', 'me'])).toThrow();
    expect(() => parseCommandInput(createTestCaseCommand!.schema, ['--productId', '1', '--title', 'ok', '--type', 'feature', '--steps', '[{"desc":"   ","expect":"e"}]'])).toThrow();
    expect(() => parseCommandInput(createTestTaskCommand!.schema, ['--project', '1', '--productID', '2', '--name', 'ok', '--build', '   ', '--begin', '2026-01-01', '--end', '2026-01-02'])).toThrow();
  });

  it('converts blank optional write strings to undefined in schemas', async () => {
    const registry = new InMemoryCliRegistry();
    await registerTools(registry, 'full');

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

  it('trims execution write strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims execution and statistics read strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims low-frequency read query strings in schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

  it('trims low-frequency path strings in resource analysis schemas', async () => {
    const registry = new InMemoryCliRegistry();

    await registerTools(registry, 'full');
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

    await registerTools(registry, 'dev');
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

    await registerTools(registry, 'full');
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

    await registerTools(registry, 'dev');
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

    await registerTools(registry, 'full');
    const command = registry.getCommand('updateTestTask');
    const input = parseCommandInput(command!.schema, ['--testTaskId', '1', '--name', 'test', '--confirm']);
    const result = await command!.handler(input);

    expect(updateTestTask).toHaveBeenCalled();
    expect(parseResult(result)).toEqual({ status: 'success' });
  });

  it('trims task write strings and rejects whitespace-only required values in schemas', async () => {
    const registry = new InMemoryCliRegistry();
    await registerTools(registry, 'dev');

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

    await registerTools(registry, 'dev');
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
    const convertBugToTask = vi.fn(async () => ({ status: 'ok' }));
    setApi({
      bug: { getBugDetail: vi.fn(async () => ({ title: '登录失败', steps: '第一步' })) },
      task: { convertBugToTask },
    } as never);

    await registerTools(registry, 'full');
    const command = registry.getCommand('createTaskFromBug');
    const result = await command!.handler({
      bugId: 1,
      project: 1772,
      execution: 2,
      taskName: '',
      type: '',
      assignedTo: 'me',
      estStarted: '2026-01-01',
      deadline: '2026-01-02',
      desc: '',
      confirm: false,
    });

    expect(convertBugToTask).not.toHaveBeenCalled();
    expect(parseResult(result)).toMatchObject({
      ok: false,
      preview: true,
      action: 'createTaskFromBug',
      payload: {
        bugId: 1,
        execution: 2,
        project: 1772,
        name: '修复Bug #1: 登录失败',
        type: 'devel',
        assignedTo: 'me',
        estStarted: '2026-01-01',
        deadline: '2026-01-02',
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
    await registerTools(registry, 'full');

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
      bug: {
        getBugDetail: vi.fn(async () => ({ title: 'b', steps: 's' })),
        resolveBug: vi.fn(async () => ({ name: 'resolveBug' })),
        confirmStoryChange: vi.fn(async () => ({ name: 'confirmBugStoryChange' })),
        batchChangeBugBranch: vi.fn(async () => ({ name: 'batchChangeBugBranch' })),
        batchChangeBugModule: vi.fn(async () => ({ name: 'batchChangeBugModule' })),
        batchChangeBugPlan: vi.fn(async () => ({ name: 'batchChangeBugPlan' })),
        batchAssignBugs: vi.fn(async () => ({ name: 'batchAssignBugs' })),
        batchConfirmBugs: vi.fn(async () => ({ name: 'batchConfirmBugs' })),
        batchResolveBugs: vi.fn(async () => ({ name: 'batchResolveBugs' })),
        batchCloseBugs: vi.fn(async () => ({ name: 'batchCloseBugs' })),
        batchActivateBugs: vi.fn(async () => ({ name: 'batchActivateBugs' })),
      },
      build: {
        createBuild: vi.fn(async () => ({ name: 'createBuild' })),
        updateBuild: vi.fn(async () => ({ name: 'updateBuild' })),
        linkStoriesToBuild: vi.fn(async () => ({ name: 'linkStoriesToBuild' })),
        unlinkStoryFromBuild: vi.fn(async () => ({ name: 'unlinkStoryFromBuild' })),
        batchUnlinkStoriesFromBuild: vi.fn(async () => ({ name: 'batchUnlinkStoriesFromBuild' })),
        linkBugsToBuild: vi.fn(async () => ({ name: 'linkBugsToBuild' })),
        unlinkBugFromBuild: vi.fn(async () => ({ name: 'unlinkBugFromBuild' })),
        batchUnlinkBugsFromBuild: vi.fn(async () => ({ name: 'batchUnlinkBugsFromBuild' })),
      },
      execution: {
        startExecution: vi.fn(async () => ({ name: 'startExecution' })), closeExecution: vi.fn(async () => ({ name: 'closeExecution' })),
        suspendExecution: vi.fn(async () => ({ name: 'suspendExecution' })), activateExecution: vi.fn(async () => ({ name: 'activateExecution' })), putoffExecution: vi.fn(async () => ({ name: 'putoffExecution' })),
      },
      plan: {
        startPlan: vi.fn(async () => ({ name: 'startPlan' })),
        finishPlan: vi.fn(async () => ({ name: 'finishPlan' })),
        activatePlan: vi.fn(async () => ({ name: 'activatePlan' })),
        closePlan: vi.fn(async () => ({ name: 'closePlan' })),
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
      linkStoriesToStory: vi.fn(async () => ({ name: 'linkStoriesToStory' })),
      unlinkStoryFromStory: vi.fn(async () => ({ name: 'unlinkStoryFromStory' })),
      recallStory: vi.fn(async () => ({ name: 'recallStory' })),
      submitStoryReview: vi.fn(async () => ({ name: 'submitStoryReview' })),
      processStoryChange: vi.fn(async () => ({ name: 'processStoryChange' })),
      batchReviewStories: vi.fn(async () => ({ name: 'batchReviewStories' })),
      batchCloseStories: vi.fn(async () => ({ name: 'batchCloseStories' })),
      batchChangeStoryModule: vi.fn(async () => ({ name: 'batchChangeStoryModule' })),
      batchChangeStoryPlan: vi.fn(async () => ({ name: 'batchChangeStoryPlan' })),
      batchChangeStoryBranch: vi.fn(async () => ({ name: 'batchChangeStoryBranch' })),
      batchChangeStoryStage: vi.fn(async () => ({ name: 'batchChangeStoryStage' })),
      batchAssignStoriesTo: vi.fn(async () => ({ name: 'batchAssignStoriesTo' })),
    },
      release: {
        changeReleaseStatus: vi.fn(async () => ({ name: 'changeReleaseStatus' })),
        notifyRelease: vi.fn(async () => ({ name: 'notifyRelease' })),
        deleteRelease: vi.fn(async () => ({ name: 'deleteRelease' })),
        linkStoriesToRelease: vi.fn(async () => ({ name: 'linkStoriesToRelease' })),
        unlinkStoryFromRelease: vi.fn(async () => ({ name: 'unlinkStoryFromRelease' })),
        batchUnlinkStoriesFromRelease: vi.fn(async () => ({ name: 'batchUnlinkStoriesFromRelease' })),
        linkBugsToRelease: vi.fn(async () => ({ name: 'linkBugsToRelease' })),
        unlinkBugFromRelease: vi.fn(async () => ({ name: 'unlinkBugFromRelease' })),
        batchUnlinkBugsFromRelease: vi.fn(async () => ({ name: 'batchUnlinkBugsFromRelease' })),
      },
      task: {
        editEstimate: vi.fn(async () => ({ name: 'editTaskEstimate' })),
        deleteEstimate: vi.fn(async () => ({ name: 'deleteTaskEstimate' })),
        confirmStoryChange: vi.fn(async () => ({ name: 'confirmTaskStoryChange' })),
        cancelTask: vi.fn(async () => ({ name: 'cancelTask' })),
        updateTask: vi.fn(async () => ({ name: 'updateTask' })),
        finishTask: vi.fn(async () => ({ name: 'finishTask' })),
        createTask: vi.fn(async () => ({ name: 'createTask' })),
        convertBugToTask: vi.fn(async () => ({ name: 'convertBugToTask' })),
      },
      testcase: {
        createTestCase: vi.fn(async () => ({ name: 'createTestCase' })),
        updateTestCase: vi.fn(async () => ({ name: 'updateTestCase' })),
        confirmStoryChange: vi.fn(async () => ({ name: 'confirmTestCaseStoryChange' })),
        confirmLibcaseChange: vi.fn(async () => ({ name: 'confirmTestCaseLibcaseChange' })),
        ignoreLibcaseChange: vi.fn(async () => ({ name: 'ignoreTestCaseLibcaseChange' })),
        batchConfirmStoryChange: vi.fn(async () => ({ name: 'batchConfirmTestCaseStoryChange' })),
      },
      testtask: {
        createTestTask: vi.fn(async () => ({ name: 'createTestTask' })),
        updateTestTask: vi.fn(async () => ({ name: 'updateTestTask' })),
        startTestTask: vi.fn(async () => ({ name: 'startTestTask' })),
        activateTestTask: vi.fn(async () => ({ name: 'activateTestTask' })),
        blockTestTask: vi.fn(async () => ({ name: 'blockTestTask' })),
        closeTestTask: vi.fn(async () => ({ name: 'closeTestTask' })),
        deleteTestTask: vi.fn(async () => ({ name: 'deleteTestTask' })),
      },
      todo: {
        createTodo: vi.fn(async () => ({ name: 'createTodo' })),
        updateTodo: vi.fn(async () => ({ name: 'updateTodo' })),
        deleteTodo: vi.fn(async () => ({ name: 'deleteTodo' })),
        finishTodo: vi.fn(async () => ({ name: 'finishTodo' })),
        activateTodo: vi.fn(async () => ({ name: 'activateTodo' })),
        startTodo: vi.fn(async () => ({ name: 'startTodo' })),
        closeTodo: vi.fn(async () => ({ name: 'closeTodo' })),
        assignTodo: vi.fn(async () => ({ name: 'assignTodo' })),
        batchFinishTodos: vi.fn(async () => ({ name: 'batchFinishTodos' })),
        batchCloseTodos: vi.fn(async () => ({ name: 'batchCloseTodos' })),
        importTodosToToday: vi.fn(async () => ({ name: 'importTodosToToday' })),
      },
    };
    setApi(api as never);
    await registerTools(registry, 'full');

    const calls: Array<[string, Record<string, unknown>]> = [
      ['updateTask', { taskId: 1, name: 't', confirm: true }],
      ['finishTask', { taskId: 1, currentConsumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02', confirm: true }],
      ['editTaskEstimate', { estimateId: 1, date: '2026-01-01', consumed: 1, left: 1, work: 'w', confirm: true }],
      ['deleteTaskEstimate', { estimateId: 1, confirm: true }],
      ['confirmTaskStoryChange', { taskId: 1, confirm: true }],
      ['cancelTask', { taskId: 1, comment: 'cancel', confirm: true }],
      ['resolveBug', { bugId: 1, resolution: 'fixed', confirm: true }],
      ['confirmBugStoryChange', { bugId: 1, confirm: true }],
      ['batchChangeBugBranch', { bugIds: [1, 2], branchId: 1, confirm: true }],
      ['batchChangeBugModule', { bugIds: [1, 2], moduleId: 66, confirm: true }],
      ['batchChangeBugPlan', { bugIds: [1, 2], planId: 360, confirm: true }],
      ['batchAssignBugs', { bugIds: [1, 2], objectId: 2, type: 'execution', assignedTo: 'me', comment: 'note', confirm: true }],
      ['batchConfirmBugs', { bugIds: [1, 2], confirm: true }],
      ['batchResolveBugs', { bugIds: [1, 2], resolution: 'fixed', resolvedBuild: 'trunk', comment: 'note', confirm: true }],
      ['batchCloseBugs', { bugIds: [1, 2], releaseId: '', viewType: '', confirm: true }],
      ['batchActivateBugs', { productId: 153, branch: 0, bugIds: [1, 2], confirm: true }],
      ['updateStory', { storyId: 1, title: 's', confirm: true }],
      ['changeStory', { storyId: 1, title: 's2', confirm: true }],
      ['createStory', { product: 1, title: 's3', confirm: true }],
      ['closeStory', { storyId: 1, comment: 'c', confirm: true }],
      ['assignStory', { storyId: 1, assignedTo: 'me', confirm: true }],
      ['activateStory', { storyId: 1, comment: 'a', confirm: true }],
      ['reviewStory', { storyId: 1, result: 'pass', confirm: true }],
      ['linkStoriesToStory', { storyId: 1, storyIds: [2], confirm: true }],
      ['unlinkStoryFromStory', { storyId: 1, linkedStoryId: 2, confirm: true }],
      ['recallStory', { storyId: 1, confirm: true }],
      ['submitStoryReview', { storyId: 1, confirm: true }],
      ['processStoryChange', { storyId: 1, result: 'yes', confirm: true }],
      ['batchReviewStories', { storyIds: [1, 2], result: 'pass', reason: 'ok', confirm: true }],
      ['batchCloseStories', { productId: 153, storyIds: [1, 2], closedReasons: { 1: 'done', 2: 'cancel' }, comments: { 1: 'note1', 2: 'note2' }, confirm: true }],
      ['batchChangeStoryModule', { storyIds: [1, 2], moduleId: 66, storyType: 'story', confirm: true }],
      ['batchChangeStoryPlan', { storyIds: [1, 2], planId: 360, oldPlanId: undefined, confirm: true }],
      ['batchChangeStoryBranch', { storyIds: [1, 2], branchId: 1, confirmBranch: 'yes', storyType: 'story', confirm: true }],
      ['batchChangeStoryStage', { storyIds: [1, 2], stage: 'verified', confirm: true }],
      ['batchAssignStoriesTo', { storyIds: [1, 2], assignedTo: 'me', comment: undefined, storyType: 'story', confirm: true }],
      ['startPlan', { planId: 1, comment: 'go', confirm: true }],
      ['finishPlan', { planId: 1, comment: 'done', confirm: true }],
      ['activatePlan', { planId: 1, comment: 'reopen', confirm: true }],
      ['closePlan', { planId: 1, closedReason: 'done', comment: 'close', confirm: true }],
      ['changeReleaseStatus', { releaseId: 1, status: 'terminate', confirm: true }],
      ['notifyRelease', { releaseId: 1, notify: ['FB'], confirm: true }],
      ['deleteRelease', { releaseId: 1, confirm: true }],
      ['linkStoriesToRelease', { releaseId: 1, storyIds: [1], confirm: true }],
      ['unlinkStoryFromRelease', { releaseId: 1, storyId: 1, confirm: true }],
      ['batchUnlinkStoriesFromRelease', { releaseId: 1, storyIds: [1], confirm: true }],
      ['linkBugsToRelease', { releaseId: 1, bugIds: [1], type: 'leftBug', confirm: true }],
      ['unlinkBugFromRelease', { releaseId: 1, bugId: 1, type: 'leftBug', confirm: true }],
      ['batchUnlinkBugsFromRelease', { releaseId: 1, bugIds: [1], confirm: true }],
      ['createTaskFromStory', { storyId: 1, execution: 2, taskName: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
      ['createTaskFromBug', { bugId: 1, project: 1772, execution: 2, assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
      ['createTodo', { name: 'todo', confirm: true }],
      ['updateTestTask', { testTaskId: 1, name: 'test', confirm: true }],
      ['updateTodo', { todoId: 1, name: 'todo2', confirm: true }],
      ['deleteTodo', { todoId: 1, confirm: true }],
      ['finishTodo', { todoId: 1, confirm: true }],
      ['activateTodo', { todoId: 1, confirm: true }],
      ['startTodo', { todoId: 1, confirm: true }],
      ['closeTodo', { todoId: 1, confirm: true }],
      ['assignTodo', { todoId: 1, assignedTo: 'me', confirm: true }],
      ['batchFinishTodos', { todoIds: [1, 2], confirm: true }],
      ['batchCloseTodos', { todoIds: [1, 2], confirm: true }],
      ['importTodosToToday', { todoIds: [1, 2], date: null, confirm: true }],
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
      ['linkStoriesToBuild', { buildId: 1, storyIds: [1], confirm: true }],
      ['unlinkStoryFromBuild', { buildId: 1, storyId: 1, confirm: true }],
      ['batchUnlinkStoriesFromBuild', { buildId: 1, storyIds: [1], confirm: true }],
      ['linkBugsToBuild', { buildId: 1, bugIds: [1], confirm: true }],
      ['unlinkBugFromBuild', { buildId: 1, bugId: 1, confirm: true }],
      ['batchUnlinkBugsFromBuild', { buildId: 1, bugIds: [1], confirm: true }],
      ['createTestCase', { productId: 1, title: 'c', type: 'feature', steps: [{ desc: 'd', expect: 'e' }], confirm: true }],
      ['updateTestCase', { testCaseId: 1, title: 'c2', confirm: true }],
      ['confirmTestCaseStoryChange', { caseId: 1, confirm: true }],
      ['confirmTestCaseLibcaseChange', { caseId: 1, libcaseId: 2, confirm: true }],
      ['ignoreTestCaseLibcaseChange', { caseId: 1, confirm: true }],
      ['batchConfirmTestCaseStoryChange', { productId: 153, caseIds: [1, 2], confirm: true }],
      ['createTestTask', { project: 1, productID: 2, name: 'tt', build: 3, begin: '2026-01-01', end: '2026-01-02', confirm: true }],
      ['startTestTask', { testTaskId: 1, comment: 'start', confirm: true }],
      ['activateTestTask', { testTaskId: 1, comment: 'active', confirm: true }],
      ['blockTestTask', { testTaskId: 1, comment: 'block', confirm: true }],
      ['closeTestTask', { testTaskId: 1, realFinishedDate: '2026-01-03', mailto: ['qa', 'pm'], comment: 'close', confirm: true }],
      ['deleteTestTask', { testTaskId: 1, confirm: true }],
    ];

    for (const [name, input] of calls) {
      await expect(registry.getCommand(name)!.handler(input)).resolves.toMatchObject({ content: [{ type: 'text' }] });
    }

    expect(api.task.createTask).toHaveBeenCalledTimes(1);
    expect(api.task.convertBugToTask).toHaveBeenCalledTimes(1);
    expect(api.task.editEstimate).toHaveBeenCalledTimes(1);
    expect(api.task.deleteEstimate).toHaveBeenCalledTimes(1);
    expect(api.task.confirmStoryChange).toHaveBeenCalledTimes(1);
    expect(api.task.cancelTask).toHaveBeenCalledTimes(1);
    expect(api.plan.startPlan).toHaveBeenCalledTimes(1);
    expect(api.plan.finishPlan).toHaveBeenCalledTimes(1);
    expect(api.plan.activatePlan).toHaveBeenCalledTimes(1);
    expect(api.plan.closePlan).toHaveBeenCalledTimes(1);
    expect(api.release.changeReleaseStatus).toHaveBeenCalledTimes(1);
    expect(api.release.notifyRelease).toHaveBeenCalledTimes(1);
    expect(api.release.deleteRelease).toHaveBeenCalledTimes(1);
    expect(api.release.linkStoriesToRelease).toHaveBeenCalledTimes(1);
    expect(api.release.unlinkStoryFromRelease).toHaveBeenCalledTimes(1);
    expect(api.release.batchUnlinkStoriesFromRelease).toHaveBeenCalledTimes(1);
    expect(api.release.linkBugsToRelease).toHaveBeenCalledTimes(1);
    expect(api.release.unlinkBugFromRelease).toHaveBeenCalledTimes(1);
    expect(api.release.batchUnlinkBugsFromRelease).toHaveBeenCalledTimes(1);
    expect(api.bug.confirmStoryChange).toHaveBeenCalledTimes(1);
    expect(api.bug.batchChangeBugBranch).toHaveBeenCalledTimes(1);
    expect(api.bug.batchChangeBugModule).toHaveBeenCalledTimes(1);
    expect(api.bug.batchChangeBugPlan).toHaveBeenCalledTimes(1);
    expect(api.bug.batchAssignBugs).toHaveBeenCalledTimes(1);
    expect(api.bug.batchConfirmBugs).toHaveBeenCalledTimes(1);
    expect(api.bug.batchResolveBugs).toHaveBeenCalledTimes(1);
    expect(api.bug.batchCloseBugs).toHaveBeenCalledTimes(1);
    expect(api.bug.batchActivateBugs).toHaveBeenCalledTimes(1);
    expect(api.story.linkStoriesToStory).toHaveBeenCalledTimes(1);
    expect(api.story.unlinkStoryFromStory).toHaveBeenCalledTimes(1);
    expect(api.story.recallStory).toHaveBeenCalledTimes(1);
    expect(api.story.submitStoryReview).toHaveBeenCalledTimes(1);
    expect(api.story.processStoryChange).toHaveBeenCalledTimes(1);
    expect(api.story.batchReviewStories).toHaveBeenCalledTimes(1);
    expect(api.story.batchCloseStories).toHaveBeenCalledTimes(1);
    expect(api.story.batchChangeStoryModule).toHaveBeenCalledTimes(1);
    expect(api.story.batchChangeStoryPlan).toHaveBeenCalledTimes(1);
    expect(api.story.batchChangeStoryBranch).toHaveBeenCalledTimes(1);
    expect(api.story.batchChangeStoryStage).toHaveBeenCalledTimes(1);
    expect(api.story.batchAssignStoriesTo).toHaveBeenCalledTimes(1);
    expect(api.build.linkStoriesToBuild).toHaveBeenCalledTimes(1);
    expect(api.build.unlinkStoryFromBuild).toHaveBeenCalledTimes(1);
    expect(api.build.batchUnlinkStoriesFromBuild).toHaveBeenCalledTimes(1);
    expect(api.build.linkBugsToBuild).toHaveBeenCalledTimes(1);
    expect(api.build.unlinkBugFromBuild).toHaveBeenCalledTimes(1);
    expect(api.build.batchUnlinkBugsFromBuild).toHaveBeenCalledTimes(1);
    expect(api.testtask.createTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.updateTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.startTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.activateTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.blockTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.closeTestTask).toHaveBeenCalledTimes(1);
    expect(api.testtask.deleteTestTask).toHaveBeenCalledTimes(1);
    expect(api.testcase.confirmStoryChange).toHaveBeenCalledTimes(1);
    expect(api.testcase.confirmLibcaseChange).toHaveBeenCalledTimes(1);
    expect(api.testcase.ignoreLibcaseChange).toHaveBeenCalledTimes(1);
    expect(api.testcase.batchConfirmStoryChange).toHaveBeenCalledTimes(1);
    expect(api.todo.startTodo).toHaveBeenCalledTimes(1);
    expect(api.todo.closeTodo).toHaveBeenCalledTimes(1);
    expect(api.todo.assignTodo).toHaveBeenCalledTimes(1);
    expect(api.todo.batchFinishTodos).toHaveBeenCalledTimes(1);
    expect(api.todo.batchCloseTodos).toHaveBeenCalledTimes(1);
    expect(api.todo.importTodosToToday).toHaveBeenCalledTimes(1);
    expect(api.execution.putoffExecution).toHaveBeenCalledWith(1, { days: 2 });
  });
});

describe('registerTools lazy loading metrics', () => {
  it('按 commandName 注册时只加载对应 group', async () => {
    const registry = new InMemoryCliRegistry();
    const loadedGroups: string[] = [];

    await registerTools(registry, 'full', {
      commandName: 'getMyTasks',
      onGroupRegister: (group) => { loadedGroups.push(group); },
    });

    expect(loadedGroups).toEqual(['task']);
    expect(registry.listCommands().map((command) => command.name)).toContain('getMyTasks');
  });

  it('无 commandName 时加载全部可见 group', async () => {
    const registry = new InMemoryCliRegistry();
    const loadedGroups: string[] = [];

    await registerTools(registry, 'full', {
      onGroupRegister: (group) => { loadedGroups.push(group); },
    });

    expect(loadedGroups.length).toBeGreaterThan(1);
    expect(loadedGroups).toContain('task');
    expect(loadedGroups).toContain('bug');
  });
});
