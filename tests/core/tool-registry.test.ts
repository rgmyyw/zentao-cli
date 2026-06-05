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
  });

  it('registers the full role command surface', () => {
    const registry = new InMemoryCliRegistry();

    registerTools(registry, 'full');

    expect(registry.listCommands().map((command) => command.name)).toEqual([
      'activateExecution',
      'addComment',
      'changeStory',
      'closeExecution',
      'createBuild',
      'createTaskFromBug',
      'createTaskFromStory',
      'createTestCase',
      'createTestTask',
      'finishTask',
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
      'getStoryDetail',
      'getStoryRelatedBugs',
      'getTaskDetail',
      'getTestCaseDetail',
      'getTestTaskDetail',
      'getTestTasks',
      'initZentao',
      'linkBugsToPlan',
      'linkStoriesToPlan',
      'putoffExecution',
      'resolveBug',
      'searchStories',
      'searchStoriesByProductName',
      'startExecution',
      'suspendExecution',
      'unlinkBugsFromPlan',
      'unlinkStoriesFromPlan',
      'updateBuild',
      'updateExecution',
      'updateStory',
      'updateTask',
      'updateTestCase',
      'updateTestTask',
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

  it('returns write previews before calling write handlers', async () => {
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
      reason: expect.stringContaining('ZENTAO_ENABLE_WRITE=true'),
    });
  });

  it('returns diagnostics for unsupported write tools', async () => {
    const registry = new InMemoryCliRegistry();
    const addComment = vi.fn();
    setApi({ comment: { addComment } } as never);

    registerTools(registry, 'full');
    const command = registry.getCommand('addComment');
    const input = parseCommandInput(command!.schema, ['--objectType', 'bug', '--objectID', '1', '--comment', 'hi', '--confirm']);
    const result = await command!.handler(input);

    expect(addComment).not.toHaveBeenCalled();
    expect(parseResult(result)).toMatchObject({
      action: 'addComment',
      supported: false,
      diagnostic: expect.stringContaining('没有'),
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
      release: { getProjectReleases: vi.fn(async () => ({ name: 'getProjectReleases' })) },
      search: { searchStories: vi.fn(async () => ({ name: 'searchStories' })), searchStoriesByProductName: vi.fn(async () => ({ name: 'searchStoriesByProductName' })) },
      statistics: { getMyTaskStatistics: vi.fn(async () => ({ name: 'getMyTaskStatistics' })), getMyBugStatistics: vi.fn(async () => ({ name: 'getMyBugStatistics' })), getMyWeeklyActivity: vi.fn(async () => ({ name: 'getMyWeeklyActivity' })) },
      story: { getProductStories: vi.fn(async () => ({ name: 'getProductStories' })), getStoryDetail: vi.fn(async () => ({ name: 'getStoryDetail' })) },
      task: { getMyTasks: vi.fn(async () => ({ name: 'getMyTasks' })), getTaskDetail: vi.fn(async () => ({ name: 'getTaskDetail' })) },
      testcase: { getProductTestCases: vi.fn(async () => ({ name: 'getProductTestCases' })), getTestCaseDetail: vi.fn(async () => ({ name: 'getTestCaseDetail' })) },
      testtask: { getTestTasks: vi.fn(async () => ({ name: 'getTestTasks' })), getTestTaskDetail: vi.fn(async () => ({ name: 'getTestTaskDetail' })) },
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
      ['getProjectReleases', { projectId: 1 }], ['searchStories', { keyword: 'a', productId: 1 }], ['searchStoriesByProductName', { productName: 'p', keyword: 'a' }],
      ['getMyTaskStatistics', {}], ['getMyBugStatistics', { productId: 1 }], ['getMyWeeklyActivity', { week: 'this' }],
      ['getProductStories', { productId: 1 }], ['getStoryDetail', { storyId: 1 }], ['getMyTasks', { status: 'all' }], ['getTaskDetail', { taskId: 1 }],
      ['getProductTestCases', { productId: 1 }], ['getTestCaseDetail', { testCaseId: 1 }], ['getTestTasks', { productId: 1 }], ['getTestTaskDetail', { testTaskId: 1 }], ['getMyProfile', {}],
    ];

    for (const [name, input] of calls) {
      await expect(registry.getCommand(name)!.handler(input)).resolves.toMatchObject({ content: [{ type: 'text' }] });
    }

    expect(api.execution.getExecutionBugs).toHaveBeenCalledWith(1, { page: 1, limit: 2, status: 'active' });
    expect(api.program.getPrograms).toHaveBeenCalledWith('id_desc');
  });

  it('executes supported write tool handlers when write is enabled and confirmed', async () => {
    process.env.ZENTAO_ENABLE_WRITE = 'true';
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
      story: { getStoryDetail: vi.fn(async () => ({ title: 's' })), updateStory: vi.fn(async () => ({ name: 'updateStory' })), changeStory: vi.fn(async () => ({ name: 'changeStory' })) },
      task: { updateTask: vi.fn(async () => ({ name: 'updateTask' })), finishTask: vi.fn(async () => ({ name: 'finishTask' })), createTask: vi.fn(async () => ({ name: 'createTask' })) },
      testcase: { createTestCase: vi.fn(async () => ({ name: 'createTestCase' })), updateTestCase: vi.fn(async () => ({ name: 'updateTestCase' })) },
      testtask: { createTestTask: vi.fn(async () => ({ name: 'createTestTask' })) },
    };
    setApi(api as never);
    registerTools(registry, 'full');

    const calls: Array<[string, Record<string, unknown>]> = [
      ['updateTask', { taskId: 1, name: 't', confirm: true }],
      ['finishTask', { taskId: 1, currentConsumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02', confirm: true }],
      ['resolveBug', { bugId: 1, resolution: 'fixed', confirm: true }],
      ['updateStory', { storyId: 1, title: 's', confirm: true }],
      ['changeStory', { storyId: 1, title: 's2', confirm: true }],
      ['createTaskFromStory', { storyId: 1, execution: 2, taskName: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
      ['createTaskFromBug', { bugId: 1, execution: 2, assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02', confirm: true }],
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
