import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { BugApi } from '../../src/api/bug.js';
import { BuildApi } from '../../src/api/build.js';
import { CommentApi } from '../../src/api/comment.js';
import { DevelopmentContextApi } from '../../src/api/development-context.js';
import { ExecutionApi } from '../../src/api/execution.js';
import { PlanApi } from '../../src/api/plan.js';
import { ProductApi } from '../../src/api/product.js';
import { ProgramApi } from '../../src/api/program.js';
import { ProjectApi } from '../../src/api/project.js';
import { RelationApi } from '../../src/api/relation.js';
import { ReleaseApi } from '../../src/api/release.js';
import { ResourceAnalysisApi } from '../../src/api/resource-analysis.js';
import { SearchApi } from '../../src/api/search.js';
import { StatisticsApi } from '../../src/api/statistics.js';
import { StoryApi } from '../../src/api/story.js';
import { TaskApi } from '../../src/api/task.js';
import { TestCaseApi } from '../../src/api/testcase.js';
import { TestTaskApi } from '../../src/api/testtask.js';
import { TodoApi } from '../../src/api/todo.js';
import { UserApi } from '../../src/api/user.js';

function createHttp(responses: unknown[] = []) {
  const queue = [...responses];
  return {
    username: 'me',
    request: vi.fn(async () => queue.shift()),
    legacyRequest: vi.fn(async () => queue.shift()),
    getToken: vi.fn(async () => 'token'),
  };
}

describe('simple API wrappers', () => {
  it('ProductApi requests product list and detail', async () => {
    const http = createHttp([{ products: [{ id: 1 }], total: 1 }, { id: 1 }]);
    const api = new ProductApi(http as never);

    await expect(api.getProducts()).resolves.toMatchObject({ items: [{ id: 1 }], total: 1 });
    await expect(api.getProductDetail(1)).resolves.toEqual({ id: 1 });
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/products/1');
  });

  it('ProjectApi normalizes pagination', async () => {
    const http = createHttp([{ projects: [{ id: 2 }], page: 2, limit: 5, total: 9 }]);
    const api = new ProjectApi(http as never);

    await expect(api.getProjects({ page: 2, limit: 5 })).resolves.toMatchObject({ page: 2, limit: 5, total: 9 });
    expect(http.request).toHaveBeenCalledWith('GET', '/projects', { params: { page: 2, limit: 5 } });
    http.request.mockResolvedValueOnce({ id: 2 });
    await expect(api.getProjectDetail(2)).resolves.toEqual({ id: 2 });
  });

  it('ProgramApi, ReleaseApi and UserApi call expected endpoints', async () => {
    const http = createHttp([{ programs: [] }, { id: 1 }, { releases: [] }, { id: 2 }, { account: 'me' }]);
    await new ProgramApi(http as never).getPrograms('id_desc');
    await new ProgramApi(http as never).getProgramDetail(1);
    await new ReleaseApi(http as never).getProjectReleases(9);
    await new ReleaseApi(http as never).getReleaseDetail(2);
    await new UserApi(http as never).getMyProfile();

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/programs', { params: { order: 'id_desc' } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/programs/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'GET', '/projects/9/releases');
    expect(http.request).toHaveBeenNthCalledWith(4, 'GET', '/releases/2');
    expect(http.request).toHaveBeenNthCalledWith(5, 'GET', '/user');
  });

  it('trims low-frequency list query strings before sending requests', async () => {
    const programHttp = createHttp([{ programs: [] }]);
    const planHttp = createHttp([{ plans: [] }]);
    const testCaseHttp = createHttp([{ cases: [] }]);

    await new ProgramApi(programHttp as never).getPrograms(' id_desc ');
    await new PlanApi(planHttp as never).getProductPlans({
      productId: 1,
      branch: ' all ',
      status: ' doing ',
      query: ' q ',
      order: ' id_desc ',
    });
    await new TestCaseApi(testCaseHttp as never).getProductTestCases({
      productId: 2,
      page: 2,
      limit: 1,
      status: ' normal ',
      moduleId: 3,
    });

    expect(programHttp.request).toHaveBeenCalledWith('GET', '/programs', { params: { order: 'id_desc' } });
    expect(planHttp.request).toHaveBeenCalledWith('GET', '/products/1/plans', {
      params: { branch: 'all', status: 'doing', query: 'q', order: 'id_desc' },
    });
    expect(testCaseHttp.request).toHaveBeenCalledWith('GET', '/products/2/testcases', {
      params: { page: 2, limit: 1, status: 'normal', module: 3 },
    });
  });

  it('BuildApi strips project when creating build', async () => {
    const http = createHttp([{ builds: [{ id: 1 }] }, { id: 1 }, { id: 2 }, { id: 2 }]);
    const api = new BuildApi(http as never);

    await api.getProjectBuilds(3);
    await api.getBuildDetail(1);
    await api.createBuild({ project: 3, execution: 4, product: 5, name: 'b1', builder: 'me' });
    await api.updateBuild(2, { name: 'b2' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/projects/3/builds');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/builds/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/projects/3/builds', { data: { execution: 4, product: 5, name: 'b1', builder: 'me' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/builds/2', { data: { name: 'b2' } });
  });

  it('trims and validates build write strings before sending requests', async () => {
    const http = createHttp([{}, {}]);
    const api = new BuildApi(http as never);

    await api.createBuild({ project: 3, execution: 4, product: 5, name: ' 构建一 ', builder: ' me ', desc: ' note ' });
    await api.updateBuild(2, { name: ' 构建二 ', builder: ' dev ', scmPath: ' /repo ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/projects/3/builds', {
      data: { execution: 4, product: 5, name: '构建一', builder: 'me', desc: 'note' },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'PUT', '/builds/2', {
      data: { name: '构建二', builder: 'dev', scmPath: '/repo' },
    });
  });

  it('rejects blank required build write strings before sending requests', async () => {
    const http = createHttp();
    const api = new BuildApi(http as never);

    await expect(api.createBuild({ project: 3, execution: 4, product: 5, name: '   ', builder: 'me' })).rejects.toThrow('name 不能为空');
    await expect(api.createBuild({ project: 3, execution: 4, product: 5, name: 'ok', builder: '   ' })).rejects.toThrow('builder 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('PlanApi links and unlinks stories and bugs', async () => {
    const http = createHttp([{ plans: [] }, {}, {}, {}, {}, { id: 8 }]);
    const api = new PlanApi(http as never);

    await api.getProductPlans({ productId: 1, branch: 'all', status: 'doing', query: 'q', order: 'id_desc' });
    await api.linkStoriesToPlan(8, [1, 2]);
    await api.unlinkStoriesFromPlan(8, [1]);
    await api.linkBugsToPlan(8, [3]);
    await api.unlinkBugsFromPlan(8, [4]);
    await api.getPlanDetail(8);

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/1/plans', { params: { branch: 'all', status: 'doing', query: 'q', order: 'id_desc' } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'POST', '/productplans/8/linkstories', { data: { stories: [1, 2] } });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/productplans/8/unlinkstories', { data: { stories: [1] } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/productplans/8/linkbugs', { data: { bugs: [3] } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/productplans/8/unlinkbugs', { data: { bugs: [4] } });
    expect(http.request).toHaveBeenNthCalledWith(6, 'GET', '/productplans/8');
  });
});

describe('TaskApi', () => {
  it('fetches full assigned task list then filters and paginates client-side', async () => {
    const http = createHttp([
      { tasks: [{ id: 1, status: 'doing' }], page: 1, limit: 1, total: 3 },
      { tasks: [{ id: 1, status: 'doing' }, { id: 2, status: 'done' }, { id: 3, status: 'doing' }], total: 3 },
    ]);
    const result = await new TaskApi(http as never).getMyTasks({ status: 'doing', page: 1, limit: 1 });

    expect(result).toMatchObject({ source: 'client-paginated', total: 2, scanned: 3, items: [{ id: 1, status: 'doing' }] });
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/tasks', { params: { assignedTo: 'me', page: 1 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/tasks', { params: { assignedTo: 'me', page: 3 } });
  });

  it('falls back to standard pagination when the task full-list shortcut is incomplete', async () => {
    const http = createHttp([
      { tasks: [{ id: 1, status: 'doing' }], page: 1, limit: 1, total: 3 },
      { tasks: [{ id: 1, status: 'doing' }], total: 3 },
      { tasks: [{ id: 1, status: 'doing' }, { id: 2, status: 'done' }, { id: 3, status: 'doing' }], total: 3 },
    ]);
    const result = await new TaskApi(http as never).getMyTasks({ status: 'all', page: 1, limit: 10 });

    expect(result).toMatchObject({ total: 3, scanned: 3 });
    expect(http.request).toHaveBeenNthCalledWith(3, 'GET', '/tasks', { params: { assignedTo: 'me', page: 1, limit: 100 } });
  });

  it('calls detail and write endpoints', async () => {
    const http = createHttp([{ id: 1 }, {}, {}, {}, {}]);
    const api = new TaskApi(http as never);
    await api.getTaskDetail(1);
    await api.recordEstimate(1, { date: '2026-06-12', consumed: 2, left: 18, work: '处理联调' });
    await api.updateTask(1, { name: 'n' });
    await api.finishTask(1, { consumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02' });
    await api.createTask({ execution: 7, name: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/tasks/1');
    expect(http.request).toHaveBeenNthCalledWith(2, 'POST', '/taskrecordestimate/1', {
      data: {
        date: '2026-06-12',
        objectType: 'task',
        objectID: 1,
        id: [0],
        dates: ['2026-06-12'],
        consumed: [2],
        left: [18],
        work: ['处理联调'],
      },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'PUT', '/tasks/1', { data: { name: 'n' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/tasks/1/finish', { data: { consumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02' } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/executions/7/tasks', {
      data: { execution: 7, name: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02' },
    });
  });

  it('trims and validates task write string fields before sending requests', async () => {
    const http = createHttp([{}, {}, {}, {}, { assignedTo: 'owner', openedBy: 'creator' }, {}, {}, {}, {}, {}, {}]);
    const api = new TaskApi(http as never);

    await api.recordEstimate(8, { date: ' 2026-06-12 ', consumed: 2, left: 18, work: ' 今天处理联调 ' });
    await api.updateTask(9, { name: ' 新任务 ', comment: ' note ', assignedTo: ' dev ' });
    await api.finishTask(1, { realStarted: ' 2026-01-01 ', finishedDate: ' 2026-01-02 ', assignedTo: ' me ', comment: 'ok' });
    await api.assignTask(2, { assignedTo: ' dev ', comment: 'note' });
    await api.startTask(3, { assignedTo: '   ' });
    await api.pauseTask(4, { comment: ' 暂停原因 ' });
    await api.restartTask(5, { comment: ' 继续做 ', assignedTo: ' qa ' });
    await api.closeTask(6, { comment: ' 已关闭 ' });
    await api.activateTask(7, { assignedTo: ' pm ', comment: ' 恢复 ' });
    await api.createTask({ execution: 8, name: ' 新建任务 ', assignedTo: ' owner ', estStarted: ' 2026-02-01 ', deadline: ' 2026-02-02 ', desc: ' 描述 ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/taskrecordestimate/8', {
      data: {
        date: '2026-06-12',
        objectType: 'task',
        objectID: 8,
        id: [0],
        dates: ['2026-06-12'],
        consumed: [2],
        left: [18],
        work: ['今天处理联调'],
      },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'PUT', '/tasks/9', {
      data: { name: '新任务', comment: 'note', assignedTo: 'dev' },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/tasks/1/finish', {
      data: { realStarted: '2026-01-01', finishedDate: '2026-01-02', assignedTo: 'me', comment: 'ok' },
    });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/tasks/2/assignto', {
      data: { assignedTo: 'dev', comment: 'note' },
    });
    expect(http.request).toHaveBeenNthCalledWith(5, 'GET', '/tasks/3');
    expect(http.request).toHaveBeenNthCalledWith(6, 'POST', '/tasks/3/start', { data: {} });
    expect(http.request).toHaveBeenNthCalledWith(7, 'PUT', '/tasks/3', { data: { status: 'doing', assignedTo: 'owner' } });
    expect(http.request).toHaveBeenNthCalledWith(8, 'POST', '/tasks/4/pause', { data: { comment: '暂停原因' } });
    expect(http.request).toHaveBeenNthCalledWith(9, 'POST', '/tasks/5/restart', { data: { comment: '继续做', assignedTo: 'qa' } });
    expect(http.request).toHaveBeenNthCalledWith(10, 'POST', '/tasks/6/close', { data: { comment: '已关闭' } });
    expect(http.request).toHaveBeenNthCalledWith(11, 'POST', '/tasks/7/activate', { data: { assignedTo: 'pm', comment: '恢复' } });
    expect(http.request).toHaveBeenNthCalledWith(12, 'POST', '/executions/8/tasks', {
      data: { execution: 8, name: '新建任务', assignedTo: 'owner', estStarted: '2026-02-01', deadline: '2026-02-02', desc: '描述' },
    });
  });

  it('falls back to legacy task-recordEstimate when taskrecordestimate entry is unavailable', async () => {
    const notFoundError = Object.assign(new Error('请求失败: 404'), { statusCode: 404 });
    const http = createHttp([{}]);
    http.request.mockRejectedValueOnce(notFoundError);
    const api = new TaskApi(http as never);

    await api.recordEstimate(79945, { date: '2026-06-12', consumed: 2, left: 18, work: '排查问题' });

    expect(http.request).toHaveBeenCalledWith('POST', '/taskrecordestimate/79945', {
      data: {
        date: '2026-06-12',
        objectType: 'task',
        objectID: 79945,
        id: [0],
        dates: ['2026-06-12'],
        consumed: [2],
        left: [18],
        work: ['排查问题'],
      },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/task-recordEstimate-79945.json?onlybody=yes', {
      data: 'date=2026-06-12&objectType=task&objectID=79945&id%5B%5D=0&dates%5B%5D=2026-06-12&consumed%5B%5D=2&left%5B%5D=18&work%5B%5D=%E6%8E%92%E6%9F%A5%E9%97%AE%E9%A2%98',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('rejects invalid recordEstimate input before sending requests', async () => {
    const http = createHttp();
    const api = new TaskApi(http as never);

    await expect(api.recordEstimate(1, { date: '   ', consumed: 2, left: 1 })).rejects.toThrow('date 不能为空');
    await expect(api.recordEstimate(1, { date: '2026-06-12', consumed: 0, left: 1 })).rejects.toThrow('consumed 必须大于 0');
    await expect(api.recordEstimate(1, { date: '2026-06-12', consumed: 1, left: -1 })).rejects.toThrow('left 不能小于 0');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('rejects blank required task write strings before sending requests', async () => {
    const http = createHttp();
    const api = new TaskApi(http as never);

    await expect(api.finishTask(1, { realStarted: '   ', finishedDate: '2026-01-02' }))
      .rejects.toThrow('realStarted 不能为空');
    await expect(api.finishTask(1, { realStarted: '2026-01-01', finishedDate: '   ' }))
      .rejects.toThrow('finishedDate 不能为空');
    await expect(api.assignTask(2, { assignedTo: '   ' }))
      .rejects.toThrow('assignedTo 不能为空');
    await expect(api.createTask({ execution: 8, name: '   ', assignedTo: 'me', estStarted: '2026-02-01', deadline: '2026-02-02' }))
      .rejects.toThrow('name 不能为空');
    await expect(api.createTask({ execution: 8, name: '任务', assignedTo: '   ', estStarted: '2026-02-01', deadline: '2026-02-02' }))
      .rejects.toThrow('assignedTo 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });
});

describe('BugApi', () => {
  const existingBug = {
    id: 84733,
    title: '原始标题',
    keywords: '原始关键字',
    severity: 3,
    pri: 2,
    type: 'codeerror',
    steps: '<p>old</p>',
    story: 0,
    task: 0,
    module: 3383,
    project: 1772,
    execution: 2140,
    plan: 2140,
    openedBuild: [{ id: 'trunk', title: '主干' }],
    assignedTo: { account: 'lixm1' },
  };

  it('gets product bugs with normalized params and default branch/order', async () => {
    const http = createHttp([{ bugs: [{ id: 1, title: '【YJ】wifi设备位置不准' }, { id: 2, title: '【AB】其他问题' }], total: 2 }]);
    const result = await new BugApi(http as never).getProductBugs({ productId: 2, status: 'all', page: 1, limit: 5, module: 'yj' });

    expect(result).toMatchObject({ source: 'client-paginated', items: [{ id: 1 }], total: 1, scanned: 2 });
    expect(http.request).toHaveBeenCalledWith('GET', '/products/2/bugs', { params: { page: 1, limit: 100, branch: 'all', order: 'id_desc', status: undefined } });
  });

  it('matches chinese module aliases by initials', async () => {
    const http = createHttp([{ bugs: [{ id: 1, module: '云镜' }, { id: 2, module: '警务数盘' }], total: 2 }]);
    const result = await new BugApi(http as never).getProductBugs({ productId: 2, status: 'all', page: 1, limit: 5, module: 'yj' });

    expect(result).toMatchObject({ source: 'client-paginated', items: [{ id: 1, module: '云镜' }], total: 1, scanned: 2, matched: 1 });
  });

  it('aggregates assigned bugs across all products and sorts them', async () => {
    const http = createHttp([
      { products: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
      { bugs: [{ id: 2 }], total: 1 },
      { bugs: [{ id: 5 }], total: 1 },
    ]);
    const result = await new BugApi(http as never).getMyBugs();

    expect(result).toMatchObject({ scope: 'global-assigntome', scannedProducts: 2, items: [{ id: 5, product: 2, productName: 'B' }, { id: 2, product: 1, productName: 'A' }] });
  });

  it('trims bug query strings before filtering and requesting', async () => {
    const productHttp = createHttp([{ bugs: [{ id: 1, title: '登录失败', module: '云镜' }], total: 1 }]);
    const productResult = await new BugApi(productHttp as never).getProductBugs({
      productId: 2,
      status: ' all ',
      page: 1,
      limit: 5,
      module: ' yj ',
      branch: ' branchA ',
      order: ' id_asc ',
      search: ' 登录 ',
    });

    expect(productResult).toMatchObject({ source: 'client-paginated', total: 1 });
    expect(productHttp.request).toHaveBeenCalledWith('GET', '/products/2/bugs', {
      params: { page: 1, limit: 100, branch: 'branchA', order: 'id_asc', status: undefined },
    });

    const myHttp = createHttp([
      { products: [{ id: 1, name: 'A' }] },
      { bugs: [{ id: 2, title: '登录失败' }], total: 1 },
    ]);
    const myResult = await new BugApi(myHttp as never).getMyBugs({ branch: ' main ', order: ' id_desc ' });

    expect(myResult).toMatchObject({ scope: 'global-assigntome', scannedProducts: 1 });
    expect(myHttp.request).toHaveBeenNthCalledWith(2, 'GET', '/products/1/bugs', {
      params: { page: 1, limit: 100, branch: 'main', order: 'id_desc', status: 'assigntome' },
    });
  });

  it('treats blank bug query strings as missing values', async () => {
    const http = createHttp([{ bugs: [], total: 0 }]);

    await new BugApi(http as never).getProductBugs({
      productId: 2,
      status: '   ',
      branch: '   ',
      order: '   ',
      page: 1,
      limit: 5,
    });

    expect(http.request).toHaveBeenCalledWith('GET', '/products/2/bugs', {
      params: { page: 1, limit: 5, branch: 'all', order: 'id_desc', status: undefined },
    });
  });

  it('resolves bug with default fixed build and validates duplicate bug', async () => {
    const http = createHttp([{}]);
    const api = new BugApi(http as never);

    await api.resolveBug(9, { resolution: 'fixed' });
    expect(http.request).toHaveBeenCalledWith('POST', '/bugs/9/resolve', { data: { resolution: 'fixed', resolvedBuild: 'trunk' } });
    await expect(api.resolveBug(9, { resolution: 'duplicate' })).rejects.toThrow('duplicateBug');
  });

  it('trims and validates bug write strings before sending requests', async () => {
    const http = createHttp([{}, existingBug, {}, {}, {}]);
    const api = new BugApi(http as never);

    await api.createBug({ product: 2, title: ' 登录失败 ', assignedTo: ' dev ', steps: ' step ' });
    await api.updateBug(1, { title: ' 新标题 ', keywords: ' 核心 ' });
    await api.assignBug(2, { assignedTo: ' me ', comment: ' note ' });
    await api.resolveBug(3, { resolution: 'fixed', assignedTo: ' qa ', comment: ' done ' });
    await api.okBug(4, { comment: ' 已验证 ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/products/2/bugs', {
      data: { product: 2, title: '登录失败', assignedTo: 'dev', steps: 'step' },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/bugs/1');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/bug-edit-1.json', {
      data: 'title=%E6%96%B0%E6%A0%87%E9%A2%98&keywords=%E6%A0%B8%E5%BF%83&severity=3&pri=2&type=codeerror&steps=%3Cp%3Eold%3C%2Fp%3E&story=0&task=0&module=3383&project=1772&execution=2140&plan=2140&openedBuild=trunk&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/bugs/2/assign', {
      data: { assignedTo: 'me', comment: 'note' },
    });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/bugs/3/resolve', {
      data: { resolution: 'fixed', assignedTo: 'qa', comment: 'done', resolvedBuild: 'trunk' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/bug-ok-4.json', {
      data: { comment: '已验证' },
    });
  });

  it('passes project and execution through updateBug', async () => {
    const http = createHttp([existingBug, {}]);
    const api = new BugApi(http as never);

    await api.updateBug(84733, { project: 1772, execution: 2140 });

    expect(http.request).toHaveBeenCalledWith('GET', '/bugs/84733');
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/bug-edit-84733.json', {
      data: 'title=%E5%8E%9F%E5%A7%8B%E6%A0%87%E9%A2%98&keywords=%E5%8E%9F%E5%A7%8B%E5%85%B3%E9%94%AE%E5%AD%97&severity=3&pri=2&type=codeerror&steps=%3Cp%3Eold%3C%2Fp%3E&story=0&task=0&module=3383&project=1772&execution=2140&plan=2140&openedBuild=trunk&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('passes plan through updateBug', async () => {
    const http = createHttp([existingBug, {}]);
    const api = new BugApi(http as never);

    await api.updateBug(84733, { plan: 2140 });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/bug-edit-84733.json', {
      data: 'title=%E5%8E%9F%E5%A7%8B%E6%A0%87%E9%A2%98&keywords=%E5%8E%9F%E5%A7%8B%E5%85%B3%E9%94%AE%E5%AD%97&severity=3&pri=2&type=codeerror&steps=%3Cp%3Eold%3C%2Fp%3E&story=0&task=0&module=3383&project=1772&execution=2140&plan=2140&openedBuild=trunk&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('passes openedBuild through updateBug', async () => {
    const http = createHttp([existingBug, {}]);
    const api = new BugApi(http as never);

    await api.updateBug(84733, { openedBuild: 'trunk', plan: 2140 });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/bug-edit-84733.json', {
      data: 'title=%E5%8E%9F%E5%A7%8B%E6%A0%87%E9%A2%98&keywords=%E5%8E%9F%E5%A7%8B%E5%85%B3%E9%94%AE%E5%AD%97&severity=3&pri=2&type=codeerror&steps=%3Cp%3Eold%3C%2Fp%3E&story=0&task=0&module=3383&project=1772&execution=2140&plan=2140&openedBuild=trunk&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('preserves execution and plan when only updating steps', async () => {
    const http = createHttp([existingBug, {}]);
    const api = new BugApi(http as never);

    await api.updateBug(84733, { steps: '<p>new</p>' });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/bug-edit-84733.json', {
      data: 'title=%E5%8E%9F%E5%A7%8B%E6%A0%87%E9%A2%98&keywords=%E5%8E%9F%E5%A7%8B%E5%85%B3%E9%94%AE%E5%AD%97&severity=3&pri=2&type=codeerror&steps=%3Cp%3Enew%3C%2Fp%3E&story=0&task=0&module=3383&project=1772&execution=2140&plan=2140&openedBuild=trunk&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('rejects blank required bug write strings before sending requests', async () => {
    const http = createHttp();
    const api = new BugApi(http as never);

    await expect(api.createBug({ product: 2, title: '   ' })).rejects.toThrow('title 不能为空');
    await expect(api.assignBug(2, { assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });
});

describe('StoryApi, TestCaseApi and TestTaskApi', () => {
  it('StoryApi calls list/detail/write endpoints', async () => {
    const http = createHttp([{ stories: [{ id: 1 }], total: 1 }, { id: 1 }, {}, {}, {}, {}, {}, {}]);
    const api = new StoryApi(http as never);
    await api.getProductStories({ productId: 2, page: 1, limit: 3 });
    await api.getStoryDetail(1);
    await api.createStory({ product: 2, title: 'new' });
    await api.updateStory(1, { title: 'a' });
    await api.changeStory(1, { title: 'b' });
    await api.closeStory(1, { comment: 'c' });
    await api.assignStory(1, { assignedTo: 'me' });
    await api.activateStory(1, { comment: 'a' });
    await api.reviewStory(1, { result: 'pass' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/2/stories', { params: { page: 1, limit: 3 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/stories/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/products/2/stories', { data: { product: 2, title: 'new' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/stories/1', { data: { title: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/stories/1/change', { data: { title: 'b' } });
    expect(http.request).toHaveBeenNthCalledWith(6, 'POST', '/stories/1/close', { data: { comment: 'c' } });
    expect(http.request).toHaveBeenNthCalledWith(7, 'POST', '/stories/1/assignto', { data: { assignedTo: 'me' } });
    expect(http.request).toHaveBeenNthCalledWith(8, 'POST', '/stories/1/activate', { data: { comment: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(9, 'POST', '/stories/1/review', { data: { result: 'pass' } });
  });

  it('trims and validates story write strings before sending requests', async () => {
    const http = createHttp([{}, {}, {}, {}, {}, {}]);
    const api = new StoryApi(http as never);

    await api.createStory({ product: 2, title: ' 新需求 ', reviewer: ' me ' });
    await api.updateStory(1, { title: ' 新标题 ', sourceNote: ' 来自客户 ', mailto: [' dev ', ' qa '], notifyEmail: [' a@example.com ', '  '] });
    await api.changeStory(1, { title: ' 变更标题 ', comment: ' note ' });
    await api.assignStory(1, { assignedTo: ' dev ', comment: ' handoff ' });
    await api.closeStory(1, { comment: ' closed ' });
    await api.reviewStory(1, { result: 'pass', comment: ' ok ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/products/2/stories', {
      data: { product: 2, title: '新需求', reviewer: 'me' },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'PUT', '/stories/1', {
      data: { title: '新标题', sourceNote: '来自客户', mailto: ['dev', 'qa'], notifyEmail: ['a@example.com'] },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/stories/1/change', {
      data: { title: '变更标题', comment: 'note' },
    });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/stories/1/assignto', {
      data: { assignedTo: 'dev', comment: 'handoff' },
    });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/stories/1/close', {
      data: { comment: 'closed' },
    });
    expect(http.request).toHaveBeenNthCalledWith(6, 'POST', '/stories/1/review', {
      data: { result: 'pass', comment: 'ok' },
    });
  });

  it('rejects blank required story write strings before sending requests', async () => {
    const http = createHttp();
    const api = new StoryApi(http as never);

    await expect(api.createStory({ product: 2, title: '   ' })).rejects.toThrow('title 不能为空');
    await expect(api.changeStory(1, { title: '   ' })).rejects.toThrow('title 不能为空');
    await expect(api.assignStory(1, { assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('TestCaseApi client-paginates cases and writes cases', async () => {
    const http = createHttp([{ cases: [{ id: 1 }, { id: 2 }] }, { id: 1 }, {}, {}]);
    const api = new TestCaseApi(http as never);
    await expect(api.getProductTestCases({ productId: 2, page: 2, limit: 1, status: 'normal', moduleId: 3 })).resolves.toMatchObject({ items: [{ id: 2 }], total: 2 });
    await api.getTestCaseDetail(1);
    await api.createTestCase(2, { title: 'c', type: 'feature', steps: [] });
    await api.updateTestCase(1, { title: 'd' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/2/testcases', { params: { page: 2, limit: 1, status: 'normal', module: 3 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/testcases/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/products/2/testcases', { data: { title: 'c', type: 'feature', steps: [] } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/testcases/1', { data: { title: 'd' } });
  });

  it('trims and validates test case write strings before sending requests', async () => {
    const http = createHttp([{}, {}]);
    const api = new TestCaseApi(http as never);

    await api.createTestCase(2, {
      title: ' 用例一 ',
      type: ' feature ',
      steps: [{ desc: ' 步骤 ', expect: ' 预期 ', type: 'step' }],
      precondition: ' 前置 ',
    });
    await api.updateTestCase(1, {
      title: ' 用例二 ',
      steps: [{ desc: ' 新步骤 ', expect: ' 新预期 ' }],
      keywords: ' 核心 ',
    });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/products/2/testcases', {
      data: {
        title: '用例一',
        type: 'feature',
        steps: [{ desc: '步骤', expect: '预期', type: 'step' }],
        precondition: '前置',
      },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'PUT', '/testcases/1', {
      data: {
        title: '用例二',
        steps: [{ desc: '新步骤', expect: '新预期' }],
        keywords: '核心',
      },
    });
  });

  it('rejects blank required test case write strings before sending requests', async () => {
    const http = createHttp();
    const api = new TestCaseApi(http as never);

    await expect(api.createTestCase(2, { title: '   ', type: 'feature', steps: [{ desc: 'd', expect: 'e' }] })).rejects.toThrow('title 不能为空');
    await expect(api.createTestCase(2, { title: 'ok', type: '   ', steps: [{ desc: 'd', expect: 'e' }] })).rejects.toThrow('type 不能为空');
    await expect(api.createTestCase(2, { title: 'ok', type: 'feature', steps: [{ desc: '   ', expect: 'e' }] })).rejects.toThrow('steps.desc 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('TestTaskApi maps productID to product on create', async () => {
    const http = createHttp([{ testtasks: [] }, { id: 1 }, {}, {}]);
    const api = new TestTaskApi(http as never);
    await api.getTestTasks({ productId: 4, page: 1, limit: 10 });
    await api.getTestTaskDetail(5);
    await api.createTestTask({ project: 1, productID: 4, name: 'tt', build: 2, begin: '2026-01-01', end: '2026-01-02' });
    await api.updateTestTask(5, { name: 'next' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/testtasks', { params: { page: 1, limit: 10, product: 4 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/testtasks/5');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/projects/1/testtasks', { data: { product: 4, name: 'tt', build: 2, begin: '2026-01-01', end: '2026-01-02' } });
    expect(http.legacyRequest).toHaveBeenLastCalledWith('POST', '/testtask-edit-5.json', {
      data: 'name=next',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('trims and validates test task write strings before sending requests', async () => {
    const http = createHttp([{}, {}]);
    const api = new TestTaskApi(http as never);

    await api.createTestTask({
      project: 1,
      productID: 4,
      name: ' 测试单 ',
      build: ' build-1 ',
      begin: ' 2026-01-01 ',
      end: ' 2026-01-02 ',
      owner: ' me ',
      type: [' 功能 ', '  冒烟  '],
    });
    await api.updateTestTask(5, { name: ' next ', owner: ' qa ', desc: ' note ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/projects/1/testtasks', {
      data: {
        product: 4,
        name: '测试单',
        build: 'build-1',
        begin: '2026-01-01',
        end: '2026-01-02',
        owner: 'me',
        type: ['功能', '冒烟'],
      },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/testtask-edit-5.json', {
      data: 'name=next&owner=qa&desc=note',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('rejects blank required test task write strings before sending requests', async () => {
    const http = createHttp();
    const api = new TestTaskApi(http as never);

    await expect(api.createTestTask({ project: 1, productID: 4, name: '   ', build: 2, begin: '2026-01-01', end: '2026-01-02' })).rejects.toThrow('name 不能为空');
    await expect(api.createTestTask({ project: 1, productID: 4, name: 'ok', build: '   ', begin: '2026-01-01', end: '2026-01-02' })).rejects.toThrow('build 不能为空');
    await expect(api.createTestTask({ project: 1, productID: 4, name: 'ok', build: 2, begin: '   ', end: '2026-01-02' })).rejects.toThrow('begin 不能为空');
    expect(http.request).not.toHaveBeenCalled();
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });
});

describe('TodoApi', () => {
  it('calls todo read and write endpoints', async () => {
    const http = createHttp([{ todos: [{ id: 1 }] }, { id: 1 }, {}, {}, {}, {}, {}]);
    const api = new TodoApi(http as never);

    await api.getTodos();
    await api.getTodoDetail(1);
    await api.createTodo({ name: 'a' });
    await api.updateTodo(1, { name: 'b' });
    await api.deleteTodo(1);
    await api.finishTodo(1);
    await api.activateTodo(1);

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/todos');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/todos/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/todos', { data: { name: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/todos/1', { data: { name: 'b' } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'DELETE', '/todos/1');
    expect(http.request).toHaveBeenNthCalledWith(6, 'GET', '/todos/1/finish');
    expect(http.request).toHaveBeenNthCalledWith(7, 'GET', '/todos/1/activate');
  });

  it('trims and validates todo names before sending requests', async () => {
    const http = createHttp([{}, {}]);
    const api = new TodoApi(http as never);

    await api.createTodo({ name: ' todo ', desc: ' note ' });
    await api.updateTodo(1, { name: ' next ', begin: ' 2026-01-01 ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/todos', {
      data: { name: 'todo', desc: 'note' },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'PUT', '/todos/1', {
      data: { name: 'next', begin: '2026-01-01' },
    });
  });

  it('rejects blank todo names before sending requests', async () => {
    const http = createHttp();
    const api = new TodoApi(http as never);

    await expect(api.createTodo({ name: '   ' })).rejects.toThrow('name 不能为空');
    await expect(api.updateTodo(1, { name: '   ' })).rejects.toThrow('name 不能为空');
    expect(http.request).not.toHaveBeenCalled();
  });
});

describe('CommentApi', () => {
  it('returns comments directly when endpoint exists', async () => {
    const http = createHttp([[{ id: 1 }]]);
    await expect(new CommentApi(http as never).getComments('bug', 1)).resolves.toEqual([{ id: 1 }]);
  });

  it('falls back to object actions on 404', async () => {
    const http = createHttp([{ actions: [{ id: 1 }] }]);
    http.request.mockRejectedValueOnce(Object.assign(new Error('请求失败: 404'), { statusCode: 404 }));
    await expect(new CommentApi(http as never).getComments('task', 1)).resolves.toMatchObject({ source: 'actions-fallback', actions: [{ id: 1 }] });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/tasks/1');
  });

  it('throws fallback error for unsupported object type and posts addComment', async () => {
    const http = createHttp([{}]);
    http.request.mockRejectedValueOnce(new Error('404'));
    await expect(new CommentApi(http as never).getComments('custom', 1)).rejects.toThrow('不支持');

    const api = new CommentApi(http as never);
    await api.addComment({ objectType: 'bug', objectID: 1, comment: 'hi' });
    expect(http.legacyRequest).toHaveBeenLastCalledWith('POST', '/action-comment-bug-1.json', {
      data: 'comment=hi',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('trims and validates comments before posting', async () => {
    const http = createHttp([{}]);
    const api = new CommentApi(http as never);

    await api.addComment({ objectType: 'bug', objectID: 1, comment: ' hi ' });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/action-comment-bug-1.json', {
      data: 'comment=hi',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const blankHttp = createHttp();
    await expect(new CommentApi(blankHttp as never).addComment({ objectType: 'bug', objectID: 1, comment: '   ' }))
      .rejects.toThrow('comment 不能为空');
    expect(blankHttp.legacyRequest).not.toHaveBeenCalled();
  });
});

describe('RelationApi and DevelopmentContextApi', () => {
  it('gets bug related story only when story id is present', async () => {
    const bugApi = { getBugDetail: vi.fn(async () => ({ id: 1, story: '7' })), getProductBugs: vi.fn() };
    const storyApi = { getStoryDetail: vi.fn(async () => ({ id: 7 })) };
    await expect(new RelationApi(bugApi as never, storyApi as never).getBugRelatedStory(1)).resolves.toEqual({ id: 7 });
    expect(storyApi.getStoryDetail).toHaveBeenCalledWith(7);
  });

  it('gets story related bugs from story detail or product scan', async () => {
    const bugApi = { getBugDetail: vi.fn(), getProductBugs: vi.fn(async () => ({ items: [{ id: 1, story: 9 }, { id: 2, storyID: '8' }], total: 2 })) };
    const storyApi = { getStoryDetail: vi.fn(async () => ({ id: 9, bugs: [] })) };
    const api = new RelationApi(bugApi as never, storyApi as never);

    await expect(api.getStoryRelatedBugs(9)).resolves.toMatchObject({ source: 'not-scanned', partial: true, bugs: [] });
    await expect(api.getStoryRelatedBugs(9, 3)).resolves.toMatchObject({ source: 'product-bugs-scan', bugs: [{ id: 1, story: 9 }] });
  });

  it('builds development context for stories and bugs', async () => {
    const bugApi = { getBugDetail: vi.fn(async () => ({ id: 2 })) };
    const storyApi = { getStoryDetail: vi.fn(async () => ({ id: 1, cases: [{ id: 10 }] })) };
    const relationApi = {
      getStoryRelatedBugs: vi.fn(async () => ({ bugs: [{ id: 2 }] })),
      getBugRelatedStory: vi.fn(async () => ({ id: 1 })),
    };
    const api = new DevelopmentContextApi(bugApi as never, storyApi as never, relationApi as never);

    await expect(api.getDevelopmentContext({ entityType: 'story', entityId: 1, productId: 3 })).resolves.toMatchObject({ entityType: 'story', summary: { relatedBugsCount: 1, testCasesCount: 1 } });
    await expect(api.getDevelopmentContext({ entityType: 'bug', entityId: 2 })).resolves.toMatchObject({ entityType: 'bug', summary: { hasRelatedStory: true } });
  });
});

describe('SearchApi', () => {
  it('scores, sorts and limits product-scoped story search', async () => {
    const productApi = { getProducts: vi.fn() };
    const storyApi = {
      getProductStories: vi.fn(async () => ({ total: 2, items: [
        { id: 1, title: '支付设置', spec: '支持微信' },
        { id: 2, title: '其它', spec: '支付回调' },
      ] })),
      getStoryDetail: vi.fn(),
    };
    const result = await new SearchApi(productApi as never, storyApi as never).searchStories({ keyword: '支付', productId: 3, limit: 1 }) as Record<string, unknown>;

    expect(result).toMatchObject({ source: 'product-scoped-search', scannedStories: 2, totalMatched: 2 });
    expect(result.items).toMatchObject([{ id: 1, matchScore: 90 }]);
  });

  it('trims search keywords before matching stories', async () => {
    const productApi = { getProducts: vi.fn() };
    const storyApi = {
      getProductStories: vi.fn(async () => ({ total: 1, items: [{ id: 1, title: '支付设置', spec: '支持微信' }] })),
      getStoryDetail: vi.fn(),
    };

    const result = await new SearchApi(productApi as never, storyApi as never).searchStories({ keyword: ' 支付 ', productId: 3, limit: 1 }) as Record<string, unknown>;

    expect(result).toMatchObject({ keyword: '支付', totalMatched: 1 });
    expect(result.items).toMatchObject([{ id: 1 }]);
  });

  it('rejects blank search keywords before fetching stories', async () => {
    const productApi = { getProducts: vi.fn() };
    const storyApi = {
      getProductStories: vi.fn(),
      getStoryDetail: vi.fn(),
    };

    await expect(new SearchApi(productApi as never, storyApi as never).searchStories({ keyword: '   ', productId: 3 }))
      .rejects.toThrow('keyword 不能为空');
    expect(storyApi.getProductStories).not.toHaveBeenCalled();
  });

  it('searches by product name and records per-product failures', async () => {
    const productApi = { getProducts: vi.fn(async () => ({ items: [{ id: 1, name: '移动端' }, { id: 2, name: '移动后台' }] })) };
    const storyApi = {
      getProductStories: vi.fn(async ({ productId }: { productId: number }) => {
        if (productId === 2) throw new Error('boom');
        return { total: 1, items: [{ id: 1, title: '登录', spec: '' }] };
      }),
      getStoryDetail: vi.fn(),
    };
    const result = await new SearchApi(productApi as never, storyApi as never).searchStoriesByProductName('移动', '登录') as Record<string, unknown>;

    expect(result).toMatchObject({ source: 'product-name-search', partial: true, failedProducts: 1, scannedProducts: 2, matchedProducts: 2 });
  });

  it('trims product name and keyword before product-name search', async () => {
    const productApi = { getProducts: vi.fn(async () => ({ items: [{ id: 1, name: '移动端' }] })) };
    const storyApi = {
      getProductStories: vi.fn(async () => ({ total: 1, items: [{ id: 1, title: '登录', spec: '' }] })),
      getStoryDetail: vi.fn(),
    };

    const result = await new SearchApi(productApi as never, storyApi as never).searchStoriesByProductName(' 移动 ', ' 登录 ') as Record<string, unknown>;

    expect(result).toMatchObject({ productName: '移动', keyword: '登录', matchedProducts: 1 });
  });

  it('rejects blank product names before fetching products', async () => {
    const productApi = { getProducts: vi.fn() };
    const storyApi = {
      getProductStories: vi.fn(),
      getStoryDetail: vi.fn(),
    };

    await expect(new SearchApi(productApi as never, storyApi as never).searchStoriesByProductName('   ', '登录'))
      .rejects.toThrow('productName 不能为空');
    expect(productApi.getProducts).not.toHaveBeenCalled();
  });
});

describe('ResourceAnalysisApi', () => {
  it('trims resource analysis outDir and falls back when it becomes blank', async () => {
    const http = { downloadLegacy: vi.fn() };
    const bug = { getBugDetail: vi.fn(async () => ({})) };
    const task = { getTaskDetail: vi.fn(async () => ({})) };
    const api = new ResourceAnalysisApi(http as never, bug as never, task as never);
    const trimmedOutDir = path.join(tmpdir(), 'zentao-cli-resource-analysis-trim');

    const trimmedResult = await api.analyzeObjectResources({
      objectType: 'bug',
      objectID: 3,
      outDir: `  ${trimmedOutDir}  `,
    }) as Record<string, unknown>;
    const fallbackResult = await api.analyzeObjectResources({
      objectType: 'task',
      objectID: 9,
      outDir: '   ',
    }) as Record<string, unknown>;

    expect(trimmedResult).toMatchObject({ outDir: trimmedOutDir, total: 0 });
    expect(fallbackResult).toMatchObject({
      outDir: path.join(tmpdir(), 'zentao-cli-resources', 'task-9'),
      total: 0,
    });
    expect(bug.getBugDetail).toHaveBeenCalledWith(3);
    expect(task.getTaskDetail).toHaveBeenCalledWith(9);
  });
});

describe('ExecutionApi', () => {
  it('calls execution read and write endpoints', async () => {
    const http = createHttp([{ id: 1 }, { dynamics: [{ id: 1 }] }, { executions: [] }, { builds: [] }, { bugs: [] }, {}, {}, {}, {}, {}, {}]);
    const api = new ExecutionApi(http as never);

    await api.getExecutionDetail(1);
    await expect(api.getExecutionDynamic(1)).resolves.toMatchObject({ source: 'execution-fields-dynamics', total: 1 });
    await api.getProjectExecutions(2);
    await api.getExecutionBuilds(1);
    await api.getExecutionBugs(1, { page: 1, limit: 2, status: 'active' });
    await api.updateExecution(1, { name: 'n' });
    await api.startExecution(1, { comment: 's' });
    await api.closeExecution(1, { comment: 'c' });
    await api.suspendExecution(1, {});
    await api.activateExecution(1, {});
    await api.putoffExecution(1, { days: 2 });

    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/executions/1', { params: { fields: 'dynamics' } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'GET', '/executions/1/bugs', { params: { page: 1, limit: 2, status: 'active' } });
    expect(http.request).toHaveBeenNthCalledWith(10, 'POST', '/executions/1/putoff', { data: { days: 2 } });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-edit-1.json', {
      data: 'name=n',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('trims execution write strings before sending requests', async () => {
    const http = createHttp([{}, {}, {}, {}, {}, {}]);
    const api = new ExecutionApi(http as never);

    await api.updateExecution(1, { name: ' 迭代一 ', PO: ' po ', teamMembers: [' dev ', ' qa '], whitelist: [' u1 ', ' u2 '] });
    await api.startExecution(1, { comment: ' start ', realBegan: ' 2026-06-05 ' });
    await api.closeExecution(1, { comment: ' close ', realEnd: ' 2026-06-06 ' });
    await api.suspendExecution(1, { comment: ' suspend ' });
    await api.activateExecution(1, { comment: ' activate ' });
    await api.putoffExecution(1, { days: 2, comment: ' later ' });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-edit-1.json', {
      data: 'name=%E8%BF%AD%E4%BB%A3%E4%B8%80&PO=po&teamMembers%5B%5D=dev&teamMembers%5B%5D=qa&whitelist%5B%5D=u1&whitelist%5B%5D=u2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.request).toHaveBeenNthCalledWith(1, 'POST', '/executions/1/start', {
      data: { comment: 'start', realBegan: '2026-06-05' },
    });
    expect(http.request).toHaveBeenNthCalledWith(2, 'POST', '/executions/1/close', {
      data: { comment: 'close', realEnd: '2026-06-06' },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/executions/1/suspend', {
      data: { comment: 'suspend' },
    });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/executions/1/activate', {
      data: { comment: 'activate' },
    });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/executions/1/putoff', {
      data: { days: 2, comment: 'later' },
    });
  });

  it('builds daily bug stats from paged bugs and tasks', async () => {
    const http = createHttp([
      { bugs: [{ id: 1, title: 'a', status: 'resolved', resolvedDate: '2026-06-04', assignedTo: 'dev', severity: 1, activatedCount: 1 }], total: 1 },
      { tasks: [{ id: 2, name: 't', status: 'doing', assignedTo: 'dev', deadline: '2026-06-05', estimate: 2, consumed: 1, fromBug: 1 }], total: 1 },
      { account: 'dev', realname: '开发' },
    ]);
    const result = await new ExecutionApi(http as never).getExecutionDailyBugStats(9, { iterationName: '迭代', date: '2026-06-05' }) as Record<string, unknown>;

    expect(result).toMatchObject({ total: 1, reopened: 1, resolved: 1, testerNotClosed: 1, iterationName: '迭代' });
    expect(result.report).toContain('迭代');
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/executions/9/bugs', { params: { page: 1, limit: 100, status: undefined } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/executions/9/tasks', { params: { page: 1, limit: 100 } });
  });

  it('rejects invalid calendar dates in daily bug stats queries', async () => {
    const http = createHttp();
    await expect(new ExecutionApi(http as never).getExecutionDailyBugStats(9, { iterationName: '迭代', date: '2026-02-31' }))
      .rejects.toThrow('无法解析统计日期: 2026-02-31');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('trims daily bug stats date input before parsing', async () => {
    const http = createHttp([
      { bugs: [{ id: 1, title: 'a', status: 'resolved', resolvedDate: '2026-06-04', assignedTo: 'dev', severity: 1, activatedCount: 0 }], total: 1 },
      { tasks: [{ id: 2, name: 't', status: 'done', assignedTo: 'dev', deadline: '2026-06-05', estimate: 2, consumed: 1 }], total: 1 },
      { account: 'dev', realname: '开发' },
    ]);
    const result = await new ExecutionApi(http as never).getExecutionDailyBugStats(9, { iterationName: '迭代', date: ' 2026-06-05 ' }) as Record<string, unknown>;

    expect(result).toMatchObject({ date: '2026-06-05', total: 1, resolved: 1 });
  });

  it('treats blank execution read strings as missing values', async () => {
    const bugHttp = createHttp([{ bugs: [], total: 0 }]);
    await new ExecutionApi(bugHttp as never).getExecutionBugs(9, { status: '   ', page: 1, limit: 5 });

    expect(bugHttp.request).toHaveBeenCalledWith('GET', '/executions/9/bugs', {
      params: { page: 1, limit: 5, status: undefined },
    });

    const statsHttp = createHttp([
      { bugs: [], total: 0 },
      { tasks: [], total: 0 },
    ]);
    const result = await new ExecutionApi(statsHttp as never).getExecutionDailyBugStats(9, { iterationName: '   ', date: '   ' }) as Record<string, unknown>;

    expect(result).toMatchObject({ iterationName: '执行 #9' });
  });

  it('filters execution bugs by test module alias and keyword client-side', async () => {
    const http = createHttp([{ bugs: [{ id: 1, title: '线上登录失败', module: '云镜' }, { id: 2, title: '页面错位', module: '警务数盘' }], total: 2 }]);
    const result = await new ExecutionApi(http as never).getExecutionBugs(9, { status: 'all', page: 1, limit: 5, module: 'yj', search: '登录' });

    expect(result).toMatchObject({ source: 'client-paginated', items: [{ id: 1, title: '线上登录失败', module: '云镜' }], total: 1, scanned: 2, matched: 1 });
    expect(http.request).toHaveBeenCalledWith('GET', '/executions/9/bugs', {
      params: { page: 1, limit: 100, status: 'all' },
    });
  });
});

describe('StatisticsApi', () => {
  it('summarizes all my tasks and bugs across pages', async () => {
    const taskApi = { getMyTasks: vi.fn(async ({ page }: { page: number }) => page === 1 ? { items: [{ id: 1, name: 't1', status: 'doing', pri: 1 }], total: 101 } : { items: [{ id: 2, name: 't2', status: 'done', pri: 2 }], total: 101 }) };
    const bugApi = { getMyBugs: vi.fn(async ({ page }: { page: number }) => page === 1 ? { items: [{ id: 1, title: 'b1', status: 'active', severity: 2 }], total: 101 } : { items: [{ id: 2, title: 'b2', status: 'resolved', severity: 1 }], total: 101 }) };
    const http = createHttp();
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    await expect(api.getMyTaskStatistics()).resolves.toMatchObject({ total: 2, byStatus: { doing: 1, done: 1 }, byPriority: { 1: 1, 2: 1 } });
    await expect(api.getMyBugStatistics(3)).resolves.toMatchObject({ productId: 3, total: 2, byStatus: { active: 1, resolved: 1 }, bySeverity: { 1: 1, 2: 1 } });
  });

  it('builds weekly activity from legacy dynamic response', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp([[{ objectType: 'bug', action: 'resolved', objectID: 1, objectName: 'b', originalDate: '2026-05-28 10:00:00' }]]);
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyWeeklyActivity({ account: 'me', startDate: '2026-05-28', endDate: '2026-05-28' }) as Record<string, unknown>;
    expect(result).toMatchObject({ source: 'legacy-user-dynamic', totalActions: 1, summary: { resolvedBugs: 1, dedupedWorkItems: 1 } });
    expect(http.legacyRequest).toHaveBeenCalledWith('GET', expect.stringContaining('/my-dynamic-all-0-'));
  });

  it('trims weekly activity account before resolving dynamic endpoint', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp([[{ objectType: 'bug', action: 'resolved', objectID: 1, objectName: 'b', originalDate: '2026-05-28 10:00:00' }]]);
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyWeeklyActivity({ account: ' me ', startDate: '2026-05-28', endDate: '2026-05-28' }) as Record<string, unknown>;
    expect(result).toMatchObject({ account: 'me', totalActions: 1 });
    expect(http.legacyRequest).toHaveBeenCalledWith('GET', expect.stringContaining('/my-dynamic-all-0-'));
  });

  it('ignores whitespace-only explicit date fields', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp([[{ objectType: 'bug', action: 'resolved', objectID: 1, objectName: 'b', originalDate: '2026-05-28 10:00:00' }]]);
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyWeeklyActivity({ account: 'me', startDate: '   ', endDate: ' 2026-05-28 ' }) as Record<string, unknown>;
    expect(result).toMatchObject({
      query: { startDate: '   ', endDate: ' 2026-05-28 ' },
      resolvedDateRange: { startDate: '2026-05-28', endDate: '2026-05-28', source: 'explicit-date' },
    });
  });

  it('prefers dateRange over days when both are provided', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp([[]]);
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyWeeklyActivity({ account: 'me', dateRange: '3天前', days: 7 }) as Record<string, unknown>;

    expect(result).toMatchObject({
      query: { dateRange: '3天前', days: 7 },
      resolvedDateRange: { label: '3天前', source: 'single-day', legacyPeriod: 'all' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('GET', expect.stringContaining('/my-dynamic-all-0-'));
  });

  it('rejects zero-day natural language ranges', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp();
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    await expect(api.getMyWeeklyActivity({ account: 'me', dateRange: '最近0天' }))
      .rejects.toThrow('dateRange 中的最近天数必须大于 0');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });
});
