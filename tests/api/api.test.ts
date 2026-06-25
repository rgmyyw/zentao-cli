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

  it('ProjectApi executes 18.5 manageProducts / group legacy flows', async () => {
    const http = createHttp([{}, {}, {}, {}, {}]);
    const api = new ProjectApi(http as never);

    await api.getProjectLinkedProducts(1772);
    await api.getProjectLinkedProducts(1772, 'program');
    await api.createProjectGroup({ projectId: 1772, name: 'g1', desc: ' note ', roles: ['dev'], accounts: ['u1', 'u2'] });
    await api.editProjectGroup({ groupId: 9, name: 'g2', accounts: ['u3'] });
    await api.copyProjectGroup(9, ' copy ');

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/project-manageProducts-1772-project.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/project-manageProducts-1772-program.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/project-createGroup-1772.json', {
      data: 'name=g1&desc=note&roles=dev&accounts=u1%2Cu2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/project-editGroup-9.json', {
      data: 'name=g2&accounts=u3',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/project-copyGroup-9.json', {
      data: 'from=9&name=+copy+',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
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

  it('ReleaseApi reads and executes short legacy write flows', async () => {
    const http = createHttp([{ releases: [] }, { id: 2 }, {}, {}, {}, {}, {}, {}, {}, {}]);
    const api = new ReleaseApi(http as never);

    await api.getProjectReleases(9);
    await api.getReleaseDetail(2);
    await api.changeReleaseStatus(2, 'terminate');
    await api.notifyRelease(2, { notify: ['FB', 'BETA'] });
    await api.deleteRelease(2);
    await api.linkStoriesToRelease(2, { storyIds: [11, 12] });
    await api.unlinkStoryFromRelease(2, 11);
    await api.batchUnlinkStoriesFromRelease(2, { storyIds: [11, 12] });
    await api.linkBugsToRelease(2, { bugIds: [21], type: 'leftBug' });
    await api.unlinkBugFromRelease(2, 21, 'leftBug');
    await api.batchUnlinkBugsFromRelease(2, { bugIds: [21, 22] });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/projects/9/releases');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/releases/2');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/release-changeStatus-2-terminate.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/release-notify-2.json', {
      data: 'notify%5B%5D=FB&notify%5B%5D=BETA',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/release-delete-2-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/release-linkStory-2--0.json', {
      data: 'stories%5B%5D=11&stories%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'GET', '/release-unlinkStory-2-11-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/release-batchUnlinkStory-2.json', {
      data: 'storyIdList%5B%5D=11&storyIdList%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(7, 'POST', '/release-linkBug-2--0-leftBug.json', {
      data: 'bugs%5B%5D=21',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(8, 'GET', '/release-unlinkBug-2-21-leftBug.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(9, 'POST', '/release-batchUnlinkBug-2-bug.json', {
      data: 'unlinkBugs%5B%5D=21&unlinkBugs%5B%5D=22',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ReleaseApi trims and validates release write inputs', async () => {
    const http = createHttp([{}, {}, {}, {}, {}]);
    const api = new ReleaseApi(http as never);

    await api.notifyRelease(3, { notify: [' FB ', ' BETA '] });
    await api.linkStoriesToRelease(3, { storyIds: [5] });
    await api.batchUnlinkStoriesFromRelease(3, { storyIds: [6] });
    await api.linkBugsToRelease(3, { bugIds: [7] });
    await api.batchUnlinkBugsFromRelease(3, { bugIds: [8], type: 'leftBug' });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/release-notify-3.json', {
      data: 'notify%5B%5D=FB&notify%5B%5D=BETA',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/release-linkStory-3--0.json', {
      data: 'stories%5B%5D=5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/release-batchUnlinkStory-3.json', {
      data: 'storyIdList%5B%5D=6',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/release-linkBug-3--0-bug.json', {
      data: 'bugs%5B%5D=7',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/release-batchUnlinkBug-3-leftBug.json', {
      data: 'unlinkBugs%5B%5D=8',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ReleaseApi rejects empty array inputs before sending request', async () => {
    const http = createHttp();
    const api = new ReleaseApi(http as never);

    await expect(api.notifyRelease(1, { notify: [] })).rejects.toThrow('notify 至少需要 1 项');
    await expect(api.linkStoriesToRelease(1, { storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.linkBugsToRelease(1, { bugIds: [] })).rejects.toThrow('bugIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('BugApi confirms related story changes through legacy short flow', async () => {
    const http = createHttp([{}]);
    const api = new BugApi(http as never);

    await api.confirmStoryChange(84362);

    expect(http.legacyRequest).toHaveBeenCalledWith('GET', '/bug-confirmStoryChange-84362.json');
    expect(http.request).not.toHaveBeenCalled();
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

  it('ProgramApi falls back to REST list/detail snapshots for program all/track', async () => {
    const http = createHttp([
      { programs: [{ id: 620, name: '全部产品线', status: 'normal' }, { id: 621, name: '关闭项目群', status: 'closed' }] },
      { id: 620, name: '全部产品线', status: 'normal', products: 32, projects: 18, children: [] },
      [{ account: 'lixm1', realname: '李晓明' }],
    ]);
    const api = new ProgramApi(http as never);

    const all = await api.getProgramAll({ status: ' normal ', orderBy: ' id_desc ', limit: 10 }) as Record<string, unknown>;
    const track = await api.getProgramTrack(620) as Record<string, unknown>;

    expect(all).toMatchObject({
      source: 'client-paginated',
      total: 1,
      itemKey: 'programs',
      items: [{ id: 620, name: '全部产品线', status: 'normal' }],
    });
    expect(track).toMatchObject({
      source: 'program-detail-stakeholders-snapshot',
      id: 620,
      name: '全部产品线',
      status: 'normal',
      counts: { products: 32, projects: 18, children: 0 },
    });
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/programs', { params: { order: 'id_desc' } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/programs/620');
    expect(http.legacyRequest).toHaveBeenCalledWith('GET', '/program-stakeholder-620.json');
  });

  it('BuildApi strips project when creating build and links related objects', async () => {
    const http = createHttp([{ builds: [{ id: 1 }] }, { id: 1 }, { id: 2 }, { id: 2 }, {}, {}, {}, {}, {}, {}]);
    const api = new BuildApi(http as never);

    await api.getProjectBuilds(3);
    await api.getBuildDetail(1);
    await api.createBuild({ project: 3, execution: 4, product: 5, name: 'b1', builder: 'me' });
    await api.updateBuild(2, { name: 'b2' });
    await api.linkStoriesToBuild(2, { storyIds: [11, 12] });
    await api.unlinkStoryFromBuild(2, 11);
    await api.batchUnlinkStoriesFromBuild(2, { storyIds: [11, 12] });
    await api.linkBugsToBuild(2, { bugIds: [21, 22] });
    await api.unlinkBugFromBuild(2, 21);
    await api.batchUnlinkBugsFromBuild(2, { bugIds: [21, 22] });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/projects/3/builds');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/builds/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/projects/3/builds', { data: { execution: 4, product: 5, name: 'b1', builder: 'me' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/builds/2', { data: { name: 'b2' } });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/build-linkStory-2--0.json', {
      data: 'stories%5B%5D=11&stories%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/build-unlinkStory-2-11-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/build-batchUnlinkStory-2.json', {
      data: 'unlinkStories%5B%5D=11&unlinkStories%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/build-linkBug-2--0.json', {
      data: 'bugs%5B%5D=21&bugs%5B%5D=22',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'GET', '/build-unlinkBug-2-21.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/build-batchUnlinkBug-2.json', {
      data: 'unlinkBugs%5B%5D=21&unlinkBugs%5B%5D=22',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('calls notifyBug and assignTo on BuildApi', async () => {
    const http = createHttp([{}, {}]);
    const api = new BuildApi(http as never);

    await api.notifyBug(1, { bugIds: [10, 20] });
    await api.assignTo(2, { assignedTo: 'dev', comment: '请验收' });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/build-notifyBug-1.json', {
      data: 'bugs%5B%5D=10&bugs%5B%5D=20',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/build-assignTo-2.json', {
      data: 'assignedTo=dev&comment=%E8%AF%B7%E9%AA%8C%E6%94%B6',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
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

  it('BuildApi rejects empty relation arrays before sending requests', async () => {
    const http = createHttp();
    const api = new BuildApi(http as never);

    await expect(api.linkStoriesToBuild(1, { storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.linkBugsToBuild(1, { bugIds: [] })).rejects.toThrow('bugIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('PlanApi links, unlinks, and changes plan status', async () => {
    const http = createHttp([{ plans: [] }, {}, {}, {}, {}, { id: 8 }, {}, {}, {}, {}]);
    const api = new PlanApi(http as never);

    await api.getProductPlans({ productId: 1, branch: 'all', status: 'doing', query: 'q', order: 'id_desc' });
    await api.linkStoriesToPlan(8, [1, 2]);
    await api.unlinkStoriesFromPlan(8, [1]);
    await api.linkBugsToPlan(8, [3]);
    await api.unlinkBugsFromPlan(8, [4]);
    await api.getPlanDetail(8);
    await api.startPlan(8, { comment: ' start ' });
    await api.finishPlan(8, {});
    await api.activatePlan(8, { comment: ' activate ' });
    await api.closePlan(8, { closedReason: ' done ', comment: ' close ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/1/plans', { params: { branch: 'all', status: 'doing', query: 'q', order: 'id_desc' } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'POST', '/productplans/8/linkstories', { data: { stories: [1, 2] } });
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/productplans/8/unlinkstories', { data: { stories: [1] } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'POST', '/productplans/8/linkbugs', { data: { bugs: [3] } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/productplans/8/unlinkbugs', { data: { bugs: [4] } });
    expect(http.request).toHaveBeenNthCalledWith(6, 'GET', '/productplans/8');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/productplan-start-8-yes.json?comment=start');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/productplan-finish-8-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/productplan-activate-8-yes.json?comment=activate');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/productplan-close-8.json', {
      data: 'closedReason=done&comment=close',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('PlanApi trims and validates plan status inputs', async () => {
    const http = createHttp([{}, {}, {}, {}]);
    const api = new PlanApi(http as never);

    await api.startPlan(9, { comment: ' start ' });
    await api.finishPlan(9, { comment: '   ' });
    await api.activatePlan(9, { comment: ' activate ' });
    await api.closePlan(9, { closedReason: ' cancel ', comment: ' reason ' });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/productplan-start-9-yes.json?comment=start');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/productplan-finish-9-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/productplan-activate-9-yes.json?comment=activate');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/productplan-close-9.json', {
      data: 'closedReason=cancel&comment=reason',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('PlanApi rejects blank close reason before sending request', async () => {
    const http = createHttp();
    const api = new PlanApi(http as never);

    await expect(api.closePlan(9, { closedReason: '   ' })).rejects.toThrow('closedReason 不能为空');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });
});

describe('TaskApi', () => {
  it('fetches full assigned task list via standard pagination then filters and paginates client-side', async () => {
    const http = createHttp([
      { tasks: [{ id: 1, status: 'doing' }], page: 1, limit: 1, total: 3 },
      { tasks: [{ id: 1, status: 'doing' }, { id: 2, status: 'done' }, { id: 3, status: 'doing' }], total: 3 },
    ]);
    const result = await new TaskApi(http as never).getMyTasks({ status: 'doing', page: 1, limit: 1 });

    expect(result).toMatchObject({ source: 'client-paginated', total: 2, scanned: 3, items: [{ id: 1, status: 'doing' }] });
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/tasks', { params: { assignedTo: 'me', page: 1 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/tasks', { params: { assignedTo: 'me', page: 1, limit: 100 } });
  });

  it('skips full pagination when the first page already covers total', async () => {
    const http = createHttp([
      { tasks: [{ id: 1, status: 'doing' }, { id: 2, status: 'done' }, { id: 3, status: 'doing' }], total: 3 },
    ]);
    const result = await new TaskApi(http as never).getMyTasks({ status: 'all', page: 1, limit: 10 });

    expect(result).toMatchObject({ total: 3, scanned: 3 });
    expect(http.request).toHaveBeenCalledTimes(1);
    expect(http.request).toHaveBeenCalledWith('GET', '/tasks', { params: { assignedTo: 'me', page: 1 } });
  });

  it('serializes batchCreateTasks object array into tasks[i][field] form data without [object Object]', async () => {
    const http = createHttp([{}]);
    const api = new TaskApi(http as never);

    await api.batchCreateTasks({
      execution: 2140,
      project: 1772,
      tasks: [
        { name: '任务一', assignedTo: 'lixm1', type: 'devel' },
        { name: '任务二', assignedTo: 'dev1', type: 'test' },
      ],
    });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/task-batchCreate-2140.json', {
      data: 'tasks%5B0%5D%5Bname%5D=%E4%BB%BB%E5%8A%A1%E4%B8%80&tasks%5B0%5D%5BassignedTo%5D=lixm1&tasks%5B0%5D%5Btype%5D=devel&tasks%5B1%5D%5Bname%5D=%E4%BB%BB%E5%8A%A1%E4%BA%8C&tasks%5B1%5D%5BassignedTo%5D=dev1&tasks%5B1%5D%5Btype%5D=test&project=1772',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = (http.legacyRequest.mock.calls[0] as unknown[])[2] as { data: string };
    expect(data.data).not.toContain('[object Object]');
  });

  it('scans only the first page when scan is false', async () => {
    const http = createHttp([{ tasks: [{ id: 1, status: 'doing' }, { id: 2, status: 'done' }], total: 99 }]);
    const result = await new TaskApi(http as never).getMyTasks({ status: 'all', limit: 100, scan: false });

    expect(result).toMatchObject({ partial: true, scanned: 2, total: 2, items: [{ id: 1 }, { id: 2 }] });
    expect(http.request).toHaveBeenCalledWith('GET', '/tasks', { params: { assignedTo: 'me', page: 1, limit: 100 } });
    expect(http.request).toHaveBeenCalledTimes(1);
  });

  it('calls detail and write endpoints', async () => {
    const http = createHttp([{ id: 1 }, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
    const api = new TaskApi(http as never);
    await api.getTaskDetail(1);
    await api.recordEstimate(1, { date: '2026-06-12', consumed: 2, left: 18, work: '处理联调' });
    await api.updateTask(1, { name: 'n' });
    await api.finishTask(1, { consumed: 1, realStarted: '2026-01-01', finishedDate: '2026-01-02' });
    await api.createTask({ execution: 7, name: 't', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02' });
    await api.convertBugToTask({ bugId: 84733, execution: 2140, project: 1772, name: '修复登录失败', assignedTo: 'me', estStarted: '2026-01-01', deadline: '2026-01-02' });
    await api.editEstimate(12, { date: '2026-06-12', consumed: 2, left: 18, work: '处理联调' });
    await api.deleteEstimate(12);
    await api.confirmStoryChange(1);
    await api.cancelTask(1, { comment: '暂不处理' });

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
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/task-create-2140-0-0-0-0-projectID=1772-84733.json', {
      data: 'execution=2140&project=1772&module=0&story=0&name=%E4%BF%AE%E5%A4%8D%E7%99%BB%E5%BD%95%E5%A4%B1%E8%B4%A5&type=devel&assignedTo%5B%5D=me&estStarted=2026-01-01&deadline=2026-01-02&desc=&status=wait&after=toTaskList',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/task-editEstimate-12.json', {
      data: 'date=2026-06-12&consumed=2&left=18&work=%E5%A4%84%E7%90%86%E8%81%94%E8%B0%83',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/task-deleteEstimate-12-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'GET', '/task-confirmStoryChange-1.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/task-cancel-1.json', {
      data: 'status=cancel&comment=%E6%9A%82%E4%B8%8D%E5%A4%84%E7%90%86',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('trims and validates task write string fields before sending requests', async () => {
    const http = createHttp([{}, {}, {}, {}, { assignedTo: 'owner', openedBy: 'creator' }, {}, {}, {}, {}, {}, {}, {}, {}]);
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
    await api.convertBugToTask({ bugId: 84731, execution: 2140, project: 1772, name: ' 修复支付异常 ', assignedTo: ' dev ', estStarted: ' 2026-02-03 ', deadline: ' 2026-02-04 ', type: ' devel ', desc: ' 处理 bug ', estimate: 2, pri: 1 });
    await api.editEstimate(12, { date: ' 2026-06-12 ', consumed: 2, left: 18, work: ' 处理联调 ' });
    await api.cancelTask(13, { comment: ' 暂不处理 ' });

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
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/task-create-2140-0-0-0-0-projectID=1772-84731.json', {
      data: 'execution=2140&project=1772&module=0&story=0&name=%E4%BF%AE%E5%A4%8D%E6%94%AF%E4%BB%98%E5%BC%82%E5%B8%B8&type=devel&assignedTo%5B%5D=dev&estStarted=2026-02-03&deadline=2026-02-04&desc=%E5%A4%84%E7%90%86+bug&pri=1&status=wait&after=toTaskList&estimate=2&left=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/task-editEstimate-12.json', {
      data: 'date=2026-06-12&consumed=2&left=18&work=%E5%A4%84%E7%90%86%E8%81%94%E8%B0%83',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/task-cancel-13.json', {
      data: 'status=cancel&comment=%E6%9A%82%E4%B8%8D%E5%A4%84%E7%90%86',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('calls batch task operations', async () => {
    const http = createHttp([{}, {}, {}, {}]);
    const api = new TaskApi(http as never);

    await api.batchCancelTasks({ taskIds: [3] });
    await api.batchCloseTasks({ taskIds: [4, 5] });
    await api.batchChangeTaskModule({ taskIds: [7], moduleId: 10 });
    await api.batchAssignTasksTo({ taskIds: [9, 10], assignedTo: 'dev', comment: '请处理' });
    await api.batchEditTasks({ tasks: [{ taskId: 12, name: '联调任务', type: 'devel', pri: 2, module: 66, status: 'doing', estimate: 4, left: 3, estStarted: '2026-06-01', deadline: '2026-06-02', assignedTo: 'dev', consumed: 1.5 }] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/task-batchCancel.json', {
      data: 'taskIDList%5B%5D=3',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/task-batchClose.json', {
      data: 'taskIDList%5B%5D=4&taskIDList%5B%5D=5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/task-batchChangeModule-10.json', {
      data: 'taskIDList%5B%5D=7',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/task-batchAssignTo.json', {
      data: 'taskIDList%5B%5D=9&taskIDList%5B%5D=10&assignedTo=dev&comment=%E8%AF%B7%E5%A4%84%E7%90%86',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/task-batchEdit.json', {
      data: 'taskIDList%5B%5D=12&colors%5B12%5D=&names%5B12%5D=%E8%81%94%E8%B0%83%E4%BB%BB%E5%8A%A1&modules%5B12%5D=66&types%5B12%5D=devel&statuses%5B12%5D=doing&pris%5B12%5D=2&estimates%5B12%5D=4&lefts%5B12%5D=3&estStarteds%5B12%5D=2026-06-01&deadlines%5B12%5D=2026-06-02&finishedBys%5B12%5D=&canceledBys%5B12%5D=&closedBys%5B12%5D=&closedReasons%5B12%5D=&assignedTos%5B12%5D=dev&consumeds%5B12%5D=1.5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('follows ZenTao 18.5 batch close confirmation for skipped tasks', async () => {
    const http = createHttp(["js::confirm('skip', '/task-batchClose-skipTaskIdList=4,5.html', '', 'self', 'parent')", {}]);
    const api = new TaskApi(http as never);

    await api.batchCloseTasks({ taskIds: [4, 5] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/task-batchClose.json', {
      data: 'taskIDList%5B%5D=4&taskIDList%5B%5D=5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/task-batchClose-4,5.json');
  });

  it('rejects task batch operations missing in ZenTao 18.5', async () => {
    const http = createHttp();
    const api = new TaskApi(http as never);

    await expect(api.batchFinishTasks({ taskIds: [1, 2] })).rejects.toThrow('禅道 18.5 不支持 task/batchFinish');
    await expect(api.batchChangeTaskBranch({ taskIds: [6], branchId: 100 })).rejects.toThrow('禅道 18.5 不支持 task/batchChangeBranch');
    await expect(api.batchChangeTaskPlan({ taskIds: [8], planId: 3 })).rejects.toThrow('禅道 18.5 不支持 task/batchChangePlan');
    await expect(api.batchActivateTasks({ taskIds: [11] })).rejects.toThrow('禅道 18.5 不支持 task/batchActivate');
    await expect(api.batchChangeTaskStory({ taskIds: [12], storyId: 0 })).rejects.toThrow('禅道 18.5 不支持 task/batchChangeStory');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('rejects empty task ID arrays in batch operations', async () => {
    const http = createHttp();
    const api = new TaskApi(http as never);

    await expect(api.batchFinishTasks({ taskIds: [] })).rejects.toThrow('taskIds 至少需要 1 项');
    await expect(api.batchAssignTasksTo({ taskIds: [1], assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    expect(http.legacyRequest).not.toHaveBeenCalled();
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
    await expect(api.editEstimate(12, { date: '   ', consumed: 2, left: 1 })).rejects.toThrow('date 不能为空');
    await expect(api.editEstimate(12, { date: '2026-06-12', consumed: 0, left: 1 })).rejects.toThrow('consumed 必须大于 0');
    await expect(api.editEstimate(12, { date: '2026-06-12', consumed: 1, left: -1 })).rejects.toThrow('left 不能小于 0');
    expect(http.request).not.toHaveBeenCalled();
    expect(http.legacyRequest).not.toHaveBeenCalled();
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

  it('serializes batchCancelTasks/batchCloseTasks id arrays into form data without [object Object]', async () => {
    const http = createHttp([{}, {}]);
    const api = new TaskApi(http as never);

    await api.batchCancelTasks({ taskIds: [3] });
    await api.batchCloseTasks({ taskIds: [4, 5] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/task-batchCancel.json', {
      data: 'taskIDList%5B%5D=3',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/task-batchClose.json', {
      data: 'taskIDList%5B%5D=4&taskIDList%5B%5D=5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    for (const call of http.legacyRequest.mock.calls as unknown[][]) {
      const data = (call[2] as { data: string }).data;
      expect(data).not.toContain('[object Object]');
      // taskIDList 必须展开为 [] 数组形式，不得出现裸对象字符串
      expect(data).toContain('taskIDList%5B%5D=');
    }
  });

  it('serializes editEstimate scalar fields into form data without [object Object]', async () => {
    const http = createHttp([{}]);
    const api = new TaskApi(http as never);

    await api.editEstimate(42, { date: '2026-06-26', consumed: 3, left: 15, work: '联调修复' });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/task-editEstimate-42.json', {
      data: 'date=2026-06-26&consumed=3&left=15&work=%E8%81%94%E8%B0%83%E4%BF%AE%E5%A4%8D',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = (http.legacyRequest.mock.calls[0] as unknown[])[2] as { data: string };
    expect(data.data).not.toContain('[object Object]');
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

  it('scans only the first page per product when scan is false', async () => {
    const http = createHttp([
      { products: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
      { bugs: [{ id: 2 }], total: 1 },
      { bugs: [{ id: 5 }], total: 1 },
    ]);
    const result = await new BugApi(http as never).getMyBugs({ limit: 100, scan: false });

    expect(result).toMatchObject({ partial: true, scope: 'global-assigntome', scannedProducts: 2, items: [{ id: 5, product: 2, productName: 'B' }, { id: 2, product: 1, productName: 'A' }] });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/products/1/bugs', {
      params: { page: 1, limit: 100, branch: 'all', order: 'id_desc', status: 'assigntome' },
    });
    expect(http.request).toHaveBeenNthCalledWith(3, 'GET', '/products/2/bugs', {
      params: { page: 1, limit: 100, branch: 'all', order: 'id_desc', status: 'assigntome' },
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

  it('builds compact bug snapshots', async () => {
    const http = createHttp([{
      id: 7,
      title: '登录失败',
      status: 'active',
      severity: 2,
      pri: 1,
      type: 'codeerror',
      product: 153,
      module: 66,
      project: 1772,
      execution: 2140,
      story: 10154,
      task: 79922,
      assignedTo: 'dev1',
      openedBy: 'qa1',
      resolvedBy: '',
      openedDate: '2026-06-01',
      deadline: '2026-06-20',
      steps: `复现步骤${'a'.repeat(600)}`,
      keywords: '登录',
      actions: [
        { id: 1, actor: 'qa1', action: 'opened', date: '2026-06-01', comment: '创建' },
        { id: 2, actor: 'dev1', action: 'assigned', date: '2026-06-02', extra: 'ignored' },
      ],
    }]);

    const result = await new BugApi(http as never).getBugSnapshot(7);

    expect(result).toMatchObject({
      bugId: 7,
      focus: { id: 7, title: '登录失败', status: 'active', severity: 2, assignedTo: 'dev1', story: 10154, task: 79922 },
      lifecycle: { openedDate: '2026-06-01', deadline: '2026-06-20' },
      text: { keywords: '登录' },
      actions: [{ id: 1, actor: 'qa1', action: 'opened', date: '2026-06-01', comment: '创建' }, { id: 2, actor: 'dev1', action: 'assigned', date: '2026-06-02' }],
      summary: { hasStory: true, hasTask: true, actionCount: 2, actionsShown: 2 },
    });
    expect(String((result as { text: { steps: string } }).text.steps).length).toBeLessThanOrEqual(501);
    expect(http.request).toHaveBeenCalledWith('GET', '/bugs/7');
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

  it('BugApi executes 18.5 batch short flows', async () => {
    const http = createHttp([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
    const api = new BugApi(http as never);

    await api.deleteBugViaForm(84362);
    await api.batchCreateBugs({ productId: 153, branch: 0, executionId: 2140, moduleId: 66, titles: ['问题一', '问题二'], assignedTo: ' lixm1 ' });
    await api.batchEditBugs({ productId: 153, executionId: 2140, branch: 0, bugIds: [84362, 84363], assignedTo: ' lixm1 ' });
    await api.linkBugs({ bugId: 84362, linkedBugIds: [84363, 84364] });
    await api.exportBugs({ productId: 153, orderBy: ' id_desc ', browseType: ' all ' });
    await api.batchChangeBugBranch({ bugIds: [84362, 84363], branchId: 1 });
    await api.batchChangeBugModule({ bugIds: [84362, 84363], moduleId: 66 });
    await api.batchChangeBugPlan({ bugIds: [84362, 84363], planId: 360 });
    await api.batchAssignBugs({ bugIds: [84362, 84363], objectId: 2140, type: 'execution', assignedTo: ' lixm1 ', comment: ' please handle ' });
    await api.batchConfirmBugs({ bugIds: [84362, 84363] });
    await api.batchResolveBugs({ bugIds: [84362, 84363], resolution: 'fixed', resolvedBuild: 'trunk', comment: ' done ' });
    await api.batchCloseBugs({ bugIds: [84362, 84363], releaseId: '', viewType: '' });
    await api.batchCloseBugs({ bugIds: [84362, 84363], releaseId: '5648', viewType: 'release' });
    await api.batchActivateBugs({ productId: 153, branch: 0, bugIds: [84362, 84363] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/bug-delete-84362-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/bug-batchCreate-153-0-2140-66.json', {
      data: 'titles%5B%5D=%E9%97%AE%E9%A2%98%E4%B8%80&titles%5B%5D=%E9%97%AE%E9%A2%98%E4%BA%8C&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/bug-batchEdit-153-2140-0.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/bug-linkBugs-84362.json', {
      data: 'bugs%5B%5D=84363&bugs%5B%5D=84364',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'GET', '/bug-export-153-id_desc-all.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/bug-batchChangeBranch-1.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(7, 'POST', '/bug-batchChangeModule-66.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(8, 'POST', '/bug-batchChangePlan-360.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(9, 'POST', '/bug-batchAssignTo-2140-execution.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363&assignedTo=lixm1&comment=please+handle',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(10, 'POST', '/bug-batchConfirm.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(11, 'POST', '/bug-batchResolve-fixed-trunk.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363&resolution=fixed&resolvedBuild=trunk&comment=done',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(12, 'POST', '/bug-batchClose--.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(13, 'POST', '/bug-batchClose-5648-release.json', {
      data: 'bugIDList%5B%5D=84362&bugIDList%5B%5D=84363&unlinkBugs%5B%5D=84362&unlinkBugs%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(14, 'POST', '/bug-batchActivate-153-0.json', {
      data: 'statusList%5B84362%5D=activate&statusList%5B84363%5D=activate&bugIDList%5B%5D=84362&bugIDList%5B%5D=84363',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('BugApi rejects empty or invalid batch inputs before sending requests', async () => {
    const http = createHttp();
    const api = new BugApi(http as never);

    await expect(api.batchChangeBugBranch({ bugIds: [], branchId: 1 })).rejects.toThrow('bugIds 至少需要 1 项');
    await expect(api.batchChangeBugModule({ bugIds: [0], moduleId: 1 })).rejects.toThrow('bugIds 必须是正整数');
    await expect(api.batchAssignBugs({ bugIds: [1], objectId: 1, assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    await expect(api.batchResolveBugs({ bugIds: [1], resolution: '   ' })).rejects.toThrow('resolution 不能为空');
    await expect(api.batchEditBugs({ productId: 1, bugIds: [] })).rejects.toThrow('bugIds 至少需要 1 项');
    await expect(api.linkBugs({ bugId: 1, linkedBugIds: [] })).rejects.toThrow('linkedBugIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('serializes batchCreateBugs titles array into form data without [object Object]', async () => {
    const http = createHttp([{}]);
    const api = new BugApi(http as never);

    await api.batchCreateBugs({ productId: 153, branch: 0, executionId: 2140, moduleId: 66, titles: ['问题一', '问题二'], assignedTo: 'lixm1' });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/bug-batchCreate-153-0-2140-66.json', {
      data: 'titles%5B%5D=%E9%97%AE%E9%A2%98%E4%B8%80&titles%5B%5D=%E9%97%AE%E9%A2%98%E4%BA%8C&assignedTo=lixm1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = (http.legacyRequest.mock.calls[0] as unknown[])[2] as { data: string };
    expect(data.data).not.toContain('[object Object]');
    // titles 必须展开为 [] 数组形式，而非把数组整体 toString
    expect(data.data).toContain('titles%5B%5D=');
  });
});

describe('StoryApi, TestCaseApi and TestTaskApi', () => {
  it('StoryApi calls list/detail/write endpoints', async () => {
    const http = createHttp([{ stories: [{ id: 1 }], total: 1 }, { id: 1 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);
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
    await api.batchCreateStories({ productId: 2, branch: 0, moduleId: 0, storyId: 0, executionId: 0, planId: 0, storyType: 'story' });
    await api.batchEditStories({ productId: 2, executionId: 0, branch: 0, storyType: 'story' });
    await api.linkStoriesToStory(1, { storyIds: [2, 3] });
    await api.unlinkStoryFromStory(1, 2);
    await api.recallStory(1);
    await api.submitStoryReview(1);
    await api.processStoryChange(1, 'yes');
    await api.deleteStory(1);
    await api.linkRequirements(1, { browseType: 'all' });
    await api.exportStories({ productId: 2, orderBy: 'id_desc' });
    await api.batchReviewStories({ storyIds: [1, 2], result: 'pass', reason: ' ok ' });
    await api.batchCloseStories({ productId: 153, storyIds: [1, 2], closedReasons: { 1: 'done', 2: 'cancel' }, comments: { 1: 'note1', 2: 'note2' } });
    await api.batchChangeStoryModule({ storyIds: [1, 2], moduleId: 66 });
    await api.batchChangeStoryPlan({ storyIds: [1, 2], planId: 360 });
    await api.batchChangeStoryBranch({ storyIds: [1, 2], branchId: 1, confirm: 'yes' });
    await api.batchChangeStoryStage({ storyIds: [1, 2], stage: ' verified ' });
    await api.batchAssignStoriesTo({ storyIds: [1, 2], assignedTo: ' me ', comment: ' please handle ' });

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/2/stories', { params: { page: 1, limit: 3 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/stories/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/products/2/stories', { data: { product: 2, title: 'new' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/stories/1', { data: { title: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'POST', '/stories/1/change', { data: { title: 'b' } });
    expect(http.request).toHaveBeenNthCalledWith(6, 'POST', '/stories/1/close', { data: { comment: 'c' } });
    expect(http.request).toHaveBeenNthCalledWith(7, 'POST', '/stories/1/assignto', { data: { assignedTo: 'me' } });
    expect(http.request).toHaveBeenNthCalledWith(8, 'POST', '/stories/1/activate', { data: { comment: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(9, 'POST', '/stories/1/review', { data: { result: 'pass' } });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/story-batchCreate-2-0-0-0-0-0-story.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/story-batchEdit-2-0-0-story.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/story-linkStory-1-linkStories-0.json', {
      data: 'stories%5B%5D=2&stories%5B%5D=3',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'GET', '/story-linkStory-1-remove-2.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'GET', '/story-recall-1-list-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/story-submitReview-1-story.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(7, 'GET', '/story-processStoryChange-1-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(8, 'GET', '/story-delete-1-yes-story.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(9, 'GET', '/story-linkRequirements-1-all--0-0-20-1.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(10, 'GET', '/story-export-2-id_desc-0--story.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(11, 'POST', '/story-batchReview-pass-ok-story.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(12, 'POST', '/story-batchClose-153-0-story.json', {
      data: 'storyIdList%5B1%5D=1&storyIdList%5B2%5D=2&closedReasons%5B1%5D=done&closedReasons%5B2%5D=cancel&comments%5B1%5D=note1&comments%5B2%5D=note2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(13, 'POST', '/story-batchChangeModule-66-story.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(14, 'POST', '/story-batchChangePlan-360-0.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(15, 'POST', '/story-batchChangeBranch-1-yes-story.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(16, 'POST', '/story-batchChangeStage-verified.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(17, 'POST', '/story-batchAssignTo-story.json', {
      data: 'storyIdList%5B%5D=1&storyIdList%5B%5D=2&assignedTo=me&comment=please+handle',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('rejects empty batch story id lists before sending requests', async () => {
    const http = createHttp();
    const api = new StoryApi(http as never);

    await expect(api.batchReviewStories({ storyIds: [], result: 'pass' })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchCloseStories({ productId: 1, storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchChangeStoryModule({ storyIds: [], moduleId: 1 })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchChangeStoryPlan({ storyIds: [], planId: 1 })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchChangeStoryBranch({ storyIds: [], branchId: 1 })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchChangeStoryStage({ storyIds: [], stage: 'verified' })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchAssignStoriesTo({ storyIds: [], assignedTo: 'me' })).rejects.toThrow('storyIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('rejects blank assign target and stage for story batch APIs before sending requests', async () => {
    const http = createHttp();
    const api = new StoryApi(http as never);

    await expect(api.batchChangeStoryStage({ storyIds: [1], stage: '   ' })).rejects.toThrow('stage 不能为空');
    await expect(api.batchAssignStoriesTo({ storyIds: [1], assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('rejects empty linked story ids before sending requests', async () => {
    const http = createHttp();
    const api = new StoryApi(http as never);

    await expect(api.linkStoriesToStory(1, { storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
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
    const http = createHttp([{ cases: [{ id: 1 }, { id: 2 }] }, { id: 1 }, {}, {}, {}]);
    const api = new TestCaseApi(http as never);
    await expect(api.getProductTestCases({ productId: 2, page: 2, limit: 1, status: 'normal', moduleId: 3 })).resolves.toMatchObject({ items: [{ id: 2 }], total: 2 });
    await api.getTestCaseDetail(1);
    await api.createTestCase(2, { title: 'c', type: 'feature', steps: [] });
    await api.updateTestCase(1, { title: 'd' });
    await api.confirmStoryChange(1);

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/products/2/testcases', { params: { page: 2, limit: 1, status: 'normal', module: 3 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/testcases/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/products/2/testcases', { data: { title: 'c', type: 'feature', steps: [] } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/testcases/1', { data: { title: 'd' } });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/testcase-confirmStoryChange-1.json');
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

  it('TestCaseApi confirms story changes through legacy short flow', async () => {
    const http = createHttp([{}]);
    const api = new TestCaseApi(http as never);

    await api.confirmStoryChange(58191);

    expect(http.legacyRequest).toHaveBeenCalledWith('GET', '/testcase-confirmStoryChange-58191.json');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('TestCaseApi confirms and ignores libcase changes through legacy short flow', async () => {
    const http = createHttp([{}, {}]);
    const api = new TestCaseApi(http as never);

    await api.confirmLibcaseChange({ caseId: 58191, libcaseId: 58192 });
    await api.ignoreLibcaseChange(58191);

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/testcase-confirmLibcaseChange-58191-58192.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/testcase-ignoreLibcaseChange-58191.json');
    expect(http.request).not.toHaveBeenCalled();
  });

  it('TestCaseApi batch confirms story changes through legacy short flow', async () => {
    const http = createHttp([{}]);
    const api = new TestCaseApi(http as never);

    await api.batchConfirmStoryChange(153, { caseIds: [58191, 58192] });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/testcase-batchConfirmStoryChange-153.json', {
      data: 'caseIDList%5B%5D=58191&caseIDList%5B%5D=58192',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('TestCaseApi uses 18.5 path parameters for batch change flows', async () => {
    const http = createHttp([{}, {}, {}]);
    const api = new TestCaseApi(http as never);

    await api.batchChangeTestCaseBranch({ productId: 153, branchId: 2, caseIds: [58191, 58192] });
    await api.batchChangeTestCaseModule({ productId: 153, moduleId: 10, caseIds: [58193] });
    await api.batchChangeTestCaseType({ productId: 153, type: 'feature', result: 'performance', caseIds: [58194] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/testcase-batchChangeBranch-2.json', {
      data: 'caseIDList%5B%5D=58191&caseIDList%5B%5D=58192&confirm=',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/testcase-batchChangeModule-10.json', {
      data: 'caseIDList%5B%5D=58193',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/testcase-batchCaseTypeChange-performance.json', {
      data: 'type=feature&caseIDList%5B%5D=58194',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('TestCaseApi uses 18.5 row fields for batch create and batch edit', async () => {
    const http = createHttp([{}, {}]);
    const api = new TestCaseApi(http as never);

    await api.batchCreateTestCases({
      productId: 153,
      branch: 1,
      moduleId: 66,
      storyId: 10154,
      cases: [{
        title: '批量用例一',
        type: 'feature',
        pri: 2,
        stage: ['unittest', 'feature'],
        precondition: '前置条件',
        keywords: '关键字',
        scene: 3,
        color: '#fff',
        needReview: 1,
        steps: [{ desc: '步骤一', expect: '预期一', type: 'step' }],
      }],
    });
    await api.batchEditTestCases({
      productId: 153,
      branch: 1,
      type: 'feature',
      moduleId: 66,
      cases: [{
        caseId: 58191,
        title: '更新后的用例',
        type: 'performance',
        pri: 3,
        module: 99,
        story: 10155,
        branch: 2,
        stage: ['feature'],
        scene: 4,
        status: 'normal',
        color: '#000',
        precondition: '新的前置',
        keywords: '新的关键字',
      }],
    });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/testcase-batchCreate-153-1-66-10154.json', {
      data: 'title%5B0%5D=%E6%89%B9%E9%87%8F%E7%94%A8%E4%BE%8B%E4%B8%80&type%5B0%5D=feature&pri%5B0%5D=2&module%5B0%5D=66&story%5B0%5D=10154&branch%5B0%5D=1&scene%5B0%5D=3&color%5B0%5D=%23fff&precondition%5B0%5D=%E5%89%8D%E7%BD%AE%E6%9D%A1%E4%BB%B6&keywords%5B0%5D=%E5%85%B3%E9%94%AE%E5%AD%97&needReview%5B0%5D=1&stage%5B0%5D%5B%5D=unittest&stage%5B0%5D%5B%5D=feature&steps%5B0%5D%5B0%5D%5Bdesc%5D=%E6%AD%A5%E9%AA%A4%E4%B8%80&steps%5B0%5D%5B0%5D%5Bexpect%5D=%E9%A2%84%E6%9C%9F%E4%B8%80&steps%5B0%5D%5B0%5D%5Btype%5D=step',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/testcase-batchEdit-153-1-feature-66.json', {
      data: 'caseIDList%5B%5D=58191&title%5B58191%5D=%E6%9B%B4%E6%96%B0%E5%90%8E%E7%9A%84%E7%94%A8%E4%BE%8B&types%5B58191%5D=performance&pris%5B58191%5D=3&modules%5B58191%5D=99&story%5B58191%5D=10155&scene%5B58191%5D=4&statuses%5B58191%5D=normal&color%5B58191%5D=%23000&precondition%5B58191%5D=%E6%96%B0%E7%9A%84%E5%89%8D%E7%BD%AE&keywords%5B58191%5D=%E6%96%B0%E7%9A%84%E5%85%B3%E9%94%AE%E5%AD%97&branches%5B58191%5D=2&stages%5B58191%5D%5B%5D=feature',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('TestCaseApi uses caseIDList for batch delete and rejects unsupported batch assign', async () => {
    const http = createHttp([{}]);
    const api = new TestCaseApi(http as never);

    await api.batchDeleteTestCases({ productId: 153, caseIds: [58191, 58192] });
    await expect(api.batchAssignTestCases({ productId: 153, caseIds: [58191], assignedTo: 'qa' })).rejects.toThrow('禅道 18.5 不支持 testcase/batchAssignTo');

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/testcase-batchDelete-153.json', {
      data: 'caseIDList%5B%5D=58191&caseIDList%5B%5D=58192',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('TestTaskApi maps productID to product on create', async () => {
    const http = createHttp([{ testtasks: [] }, { id: 1 }, {}, {}, {}, {}, {}, {}]);
    const api = new TestTaskApi(http as never);
    await api.getTestTasks({ productId: 4, page: 1, limit: 10 });
    await api.getTestTaskDetail(5);
    await api.createTestTask({ project: 1, productID: 4, name: 'tt', build: 2, begin: '2026-01-01', end: '2026-01-02' });
    await api.updateTestTask(5, { name: 'next' });
    await api.startTestTask(5, { comment: ' start ' });
    await api.activateTestTask(5, { comment: ' active ' });
    await api.blockTestTask(5, { comment: ' block ' });
    await api.closeTestTask(5, { realFinishedDate: '2026-01-03', mailto: ['qa', ' pm '], comment: ' close ' });
    await api.deleteTestTask(5);

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/testtasks', { params: { page: 1, limit: 10, product: 4 } });
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/testtasks/5');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/projects/1/testtasks', { data: { product: 4, name: 'tt', build: 2, begin: '2026-01-01', end: '2026-01-02' } });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/testtask-edit-5.json', {
      data: 'name=next',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/testtask-start-5.json', {
      data: 'comment=start&status=doing',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/testtask-activate-5.json', {
      data: 'comment=active&status=doing',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/testtask-block-5.json', {
      data: 'comment=block&status=blocked',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/testtask-close-5.json', {
      data: 'realFinishedDate=2026-01-03&mailto%5B%5D=qa&mailto%5B%5D=pm&comment=close&status=done',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'GET', '/testtask-delete-5-yes.json');
  });

  it('trims and validates test task write strings before sending requests', async () => {
    const http = createHttp([{}, {}, {}, {}, {}]);
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
    await api.startTestTask(5, { comment: ' start ' });
    await api.closeTestTask(5, { realFinishedDate: ' 2026-01-03 ', mailto: [' qa ', ' pm '], comment: ' close ' });

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
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/testtask-start-5.json', {
      data: 'comment=start&status=doing',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/testtask-close-5.json', {
      data: 'realFinishedDate=2026-01-03&mailto%5B%5D=qa&mailto%5B%5D=pm&comment=close&status=done',
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

  it('TestTaskApi executes 18.5 short legacy testtask write flows', async () => {
    const http = createHttp([{}, {}, {}, {}, {}, {}, {}]);
    const api = new TestTaskApi(http as never);

    await api.unlinkCase(7, 'yes');
    await api.batchUnlinkCases({ taskID: 5, caseIDList: [11, 12] });
    await api.runCase({ runID: 9, result: 'pass', comment: ' ok ', assignedTo: ' qa ' });
    await api.batchRunTestCases({ productID: 153, from: 'testtask', taskID: 5, caseIDList: [11, 12], results: { '11': { result: 'pass', comment: 'a' }, '12': { result: 'fail', comment: 'b' } } });
    await api.batchAssignTestTasks({ taskID: 5, caseIDList: [11, 12], assignedTo: 'qa', comment: ' please ' });
    await api.importTestTaskUnitResult({ productID: 153, execution: 2140, build: 5648, owner: ' qa ', members: [' qa1 ', ' qa2 '], frame: ' ztf ', projectID: 1772 });
    await api.linkCase({ taskID: 5, type: 'all', param: 0, caseIDList: [11, 12] });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/testtask-unlinkCase-7-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/testtask-batchUnlinkCases-5.json', {
      data: 'caseIDList%5B%5D=11&caseIDList%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/testtask-runCase-0.json?runID=9', {
      data: 'result=pass&comment=+ok+&assignedTo=+qa+',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/testtask-batchRun-0.json?productID=153&from=testtask&taskID=5', {
      data: expect.stringContaining('caseIDList%5B%5D=11'),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/testtask-batchAssign-5.json', {
      data: 'caseIDList%5B%5D=11&caseIDList%5B%5D=12&assignedTo=qa&comment=+please+',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/testtask-importUnitResult-153.json', {
      data: 'execution=2140&build=5648&owner=+qa+&members%5B%5D=+qa1+&members%5B%5D=+qa2+&frame=+ztf+&projectID=1772',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(7, 'POST', '/testtask-linkCase-5-all-0.json', {
      data: 'caseIDList%5B%5D=11&caseIDList%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('TestTaskApi rejects empty batch inputs for unlink/assign/run', async () => {
    const http = createHttp();
    const api = new TestTaskApi(http as never);

    await expect(api.batchUnlinkCases({ taskID: 5, caseIDList: [] })).rejects.toThrow('caseIDList');
    await expect(api.batchRunTestCases({ productID: 153, caseIDList: [], results: {} })).rejects.toThrow('caseIDList');
    await expect(api.batchRunTestCases({ productID: 153, caseIDList: [1], results: {} as never })).rejects.toThrow('results');
    await expect(api.batchAssignTestTasks({ taskID: 5, caseIDList: [], assignedTo: 'qa' })).rejects.toThrow('caseIDList');
    await expect(api.runCase({ result: 'pass' } as never)).rejects.toThrow('runID');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });
});

describe('TodoApi', () => {
  it('calls todo read and write endpoints', async () => {
    const http = createHttp([{ todos: [{ id: 1 }] }, { id: 1 }, {}, {}, {}, {}, {}, {}, {}, {}]);
    const api = new TodoApi(http as never);

    await api.getTodos();
    await api.getTodoDetail(1);
    await api.createTodo({ name: 'a' });
    await api.updateTodo(1, { name: 'b' });
    await api.startTodo(1);
    await api.closeTodo(1);
    await api.assignTodo(1, { assignedTo: 'me', comment: ' please handle ' });
    await api.batchFinishTodos({ todoIds: [1, 2] });
    await api.batchCloseTodos({ todoIds: [1, 2] });
    await api.importTodosToToday({ todoIds: [1, 2], date: ' 2026-06-15 ' });
    await api.deleteTodo(1);
    await api.finishTodo(1);
    await api.activateTodo(1);

    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/todos');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/todos/1');
    expect(http.request).toHaveBeenNthCalledWith(3, 'POST', '/todos', { data: { name: 'a' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'PUT', '/todos/1', { data: { name: 'b' } });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'GET', '/todo-start-1.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'GET', '/todo-close-1.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'POST', '/todo-assignTo-1.json', {
      data: 'assignedTo=me&comment=please+handle',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/todo-batchFinish.json', {
      data: 'todoIDList%5B%5D=1&todoIDList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/todo-batchClose.json', {
      data: 'todoIDList%5B%5D=1&todoIDList%5B%5D=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'POST', '/todo-import2Today.json', {
      data: 'todoIDList%5B%5D=1&todoIDList%5B%5D=2&date=2026-06-15',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.request).toHaveBeenNthCalledWith(5, 'DELETE', '/todos/1');
    expect(http.request).toHaveBeenNthCalledWith(6, 'GET', '/todos/1/finish');
    expect(http.request).toHaveBeenNthCalledWith(7, 'GET', '/todos/1/activate');
  });

  it('TodoApi rejects blank assignTodo target before sending request', async () => {
    const http = createHttp();
    const api = new TodoApi(http as never);

    await expect(api.assignTodo(1, { assignedTo: '   ' })).rejects.toThrow('assignedTo 不能为空');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('TodoApi rejects empty batch todo id lists before sending requests', async () => {
    const http = createHttp();
    const api = new TodoApi(http as never);

    await expect(api.batchFinishTodos({ todoIds: [] })).rejects.toThrow('todoIds 至少需要 1 项');
    await expect(api.batchCloseTodos({ todoIds: [] })).rejects.toThrow('todoIds 至少需要 1 项');
    await expect(api.importTodosToToday({ todoIds: [] })).rejects.toThrow('todoIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
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

  it('builds compact development context snapshots for stories and bugs', async () => {
    const bugApi = {
      getBugDetail: vi.fn(async () => ({ id: 2, title: '登录失败', status: 'active', severity: '2', assignedTo: 'dev1', resolvedBy: '' })),
    };
    const storyApi = {
      getStoryDetail: vi.fn(async () => ({ id: 1, title: '登录能力', status: 'active', stage: 'developing', assignedTo: 'pm1', openedBy: 'pm1', cases: [{ id: 10, title: 'case1', status: 'normal' }] })),
    };
    const relationApi = {
      getStoryRelatedBugs: vi.fn(async () => ({ bugs: [{ id: 2, title: '登录失败', status: 'active', severity: '2', assignedTo: 'dev1' }] })),
      getBugRelatedStory: vi.fn(async () => ({ id: 1, title: '登录能力', status: 'active', stage: 'developing', assignedTo: 'pm1' })),
    };
    const api = new DevelopmentContextApi(bugApi as never, storyApi as never, relationApi as never);

    await expect(api.getDevelopmentContextSnapshot({ entityType: 'story', entityId: 1, productId: 3 })).resolves.toMatchObject({
      entityType: 'story',
      focus: { id: 1, title: '登录能力' },
      relatedBugs: [{ id: 2, title: '登录失败' }],
      testCases: [{ id: 10, title: 'case1' }],
      summary: { relatedBugsShown: 1, testCasesShown: 1 },
    });
    await expect(api.getDevelopmentContextSnapshot({ entityType: 'bug', entityId: 2 })).resolves.toMatchObject({
      entityType: 'bug',
      focus: { id: 2, title: '登录失败' },
      relatedStory: { id: 1, title: '登录能力' },
      summary: { hasRelatedStory: true },
    });
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
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-edit-1.json', {
      data: 'name=n',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-start-1-execution.json', {
      data: 'comment=s',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-close-1-execution.json', {
      data: 'comment=c',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-suspend-1-execution.json', {
      data: '',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-activate-1-execution.json', {
      data: '',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-putoff-1-execution.json', {
      data: 'days=2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('builds compact execution snapshots', async () => {
    const http = createHttp([
      { id: 9, name: '迭代A', status: 'doing', project: 1772, begin: '2026-06-01', end: '2026-06-30', PM: 'pm1', PO: 'po1' },
      { builds: [{ id: 101, name: 'build-101', status: 'success', builder: 'dev1', date: '2026-06-18' }], total: 1 },
      { dynamics: [{ id: 201, actor: 'dev1', action: 'resolved', date: '2026-06-18', objectType: 'bug', objectName: '登录失败' }] },
      { bugs: [{ id: 1, title: '登录失败', status: 'active', severity: 2, assignedTo: 'dev1' }], total: 1 },
      { tasks: [{ id: 2, name: '修复登录', status: 'doing', assignedTo: 'dev1', deadline: '2026-06-01' }], total: 1 },
    ]);

    const result = await new ExecutionApi(http as never).getExecutionSnapshot(9) as Record<string, unknown>;

    expect(result).toMatchObject({
      executionId: 9,
      focus: { id: 9, name: '迭代A', status: 'doing', project: 1772 },
      summary: { totalBugs: 1, openBugs: 1, totalTasks: 1, totalBuilds: 1, totalDynamics: 1 },
      builds: [{ id: 101, name: 'build-101', status: 'success', builder: 'dev1', date: '2026-06-18' }],
      bugHighlights: [{ id: 1, title: '登录失败', status: 'active', severity: '2', assignedTo: 'dev1' }],
      taskHighlights: [{ id: 2, name: '修复登录', status: 'doing', assignedTo: 'dev1', deadline: '2026-06-01' }],
      recentDynamics: [{ id: 201, actor: 'dev1', action: 'resolved', objectType: 'bug', objectName: '登录失败' }],
    });
    expect(http.request).toHaveBeenNthCalledWith(1, 'GET', '/executions/9');
    expect(http.request).toHaveBeenNthCalledWith(2, 'GET', '/executions/9/builds');
    expect(http.request).toHaveBeenNthCalledWith(3, 'GET', '/executions/9', { params: { fields: 'dynamics' } });
    expect(http.request).toHaveBeenNthCalledWith(4, 'GET', '/executions/9/bugs', { params: { page: 1, limit: 100, status: undefined } });
    expect(http.request).toHaveBeenNthCalledWith(5, 'GET', '/executions/9/tasks', { params: { page: 1, limit: 100 } });
  });

  it('rejects unsupported execution confirmStoryChange and unsafe computeBurn endpoints', async () => {
    const http = createHttp();
    const api = new ExecutionApi(http as never);

    await expect(api.confirmStoryChange(1)).rejects.toThrow('禅道 18.5 不支持 execution/confirmStoryChange');
    await expect(api.computeBurn(2)).rejects.toThrow('execution/computeBurn 不接收 executionId');

    expect(http.legacyRequest).not.toHaveBeenCalled();
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
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-start-1-execution.json', {
      data: 'comment=start&realBegan=2026-06-05',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-close-1-execution.json', {
      data: 'comment=close&realEnd=2026-06-06',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-suspend-1-execution.json', {
      data: 'comment=suspend',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-activate-1-execution.json', {
      data: 'comment=activate',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-putoff-1-execution.json', {
      data: 'days=2&comment=later',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ExecutionApi executes supported 18.5 short legacy write flows and now calls computeCfd', async () => {
    const http = createHttp([{}, {}, {}, {}, {}, {}, {}]);
    const api = new ExecutionApi(http as never);

    await api.computeCfd(2140);
    await api.linkStoriesToExecution({ executionId: 2140, storyIds: [11, 12], productId: 153, branch: 1 });
    await api.unlinkStoryFromExecution(2140, 11);
    await api.batchUnlinkStoriesFromExecution({ executionId: 2140, storyIds: [11, 12] });
    await api.batchChangeExecutionStatus({ executionIds: [2140, 2141], status: ' doing ', projectId: 1772 });
    await api.unlinkMemberFromExecution(2140, 99);
    await api.deleteExecution(2140);
    await api.storyEstimate({ executionId: 2140, storyId: 11, accounts: ['dev1', 'dev2'], estimates: [4, 6], average: 5, round: 0 });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/execution-computeCFD-yes-2140.json', {
      data: '',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/execution-linkStory-2140.json', {
      data: 'stories%5B%5D=11&stories%5B%5D=12&products%5B11%5D=153&products%5B12%5D=153&branch=1',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/execution-unlinkStory-2140-11-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'POST', '/execution-batchUnlinkStory-2140.json', {
      data: 'storyIdList%5B%5D=11&storyIdList%5B%5D=12',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'POST', '/execution-batchChangeStatus-doing-1772.json', {
      data: 'executionIdList%5B%5D=2140&executionIdList%5B%5D=2141&status=doing',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(6, 'GET', '/execution-unlinkMember-2140-99-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(7, 'GET', '/execution-delete-2140-yes.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(8, 'POST', '/execution-storyEstimate-2140-11-0.json', {
      data: 'account%5B%5D=dev1&account%5B%5D=dev2&estimate%5B%5D=4&estimate%5B%5D=6&average=5',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ExecutionApi rejects empty or invalid batch write inputs before sending requests', async () => {
    const http = createHttp();
    const api = new ExecutionApi(http as never);

    await expect(api.linkStoriesToExecution({ executionId: 1, storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchUnlinkStoriesFromExecution({ executionId: 1, storyIds: [] })).rejects.toThrow('storyIds 至少需要 1 项');
    await expect(api.batchChangeExecutionStatus({ executionIds: [1], status: '   ' })).rejects.toThrow('status 不能为空');
    await expect(api.batchEditExecutions({ executionIds: [] })).rejects.toThrow('executionIds 至少需要 1 项');
    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('ExecutionApi executes 18.5 create/batchEdit/kanban legacy flows', async () => {
    const http = createHttp([{}, {}, {}, {}, {}]);
    const api = new ExecutionApi(http as never);

    await api.createExecution({ project: 1772, name: '迭代', begin: '2026-06-01', end: '2026-06-30', code: 'I26', PO: 'po', teamMembers: ['dev1', 'dev2'] });
    await api.batchEditExecutions({ executionIds: [2140, 2141], names: { '2140': '迭代A' }, POs: { '2140': 'po', '2141': 'po' } });
    await api.getExecutionKanban(2140, { browseType: 'task', orderBy: 'id_desc' });
    await api.getExecutionTaskKanban(2140, { browseType: 'all' });
    await api.getAllExecutionKanban();

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/execution-create-1772.json', {
      data: 'name=%E8%BF%AD%E4%BB%A3&begin=2026-06-01&end=2026-06-30&code=I26&PO=po&teamMembers=dev1%2Cdev2',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/execution-batchEdit-0.json', {
      data: 'executionIDList%5B%5D=2140&executionIDList%5B%5D=2141&names%5B2140%5D=%E8%BF%AD%E4%BB%A3A&POs%5B2140%5D=po&POs%5B2141%5D=po',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(3, 'GET', '/execution-kanban-2140-task-id_desc.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(4, 'GET', '/execution-taskKanban-2140-all.json');
    expect(http.legacyRequest).toHaveBeenNthCalledWith(5, 'GET', '/execution-executionKanban.json');
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

  it('ExecutionApi routes addMember to manageMembers with array fields', async () => {
    const http = createHttp([{}]);
    const api = new ExecutionApi(http as never);

    await api.addMember({
      executionId: 2140,
      accounts: ['dev1', 'dev2'],
      roles: ['developer', 'tester'],
      days: ['5', '5'],
      hours: ['8', '7'],
      limited: ['no', 'yes'],
    });

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-manageMembers-2140.json', {
      data: 'accounts%5B%5D=dev1&accounts%5B%5D=dev2&roles%5B%5D=developer&roles%5B%5D=tester&days%5B%5D=5&days%5B%5D=5&hours%5B%5D=8&hours%5B%5D=7&limited%5B%5D=no&limited%5B%5D=yes',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ExecutionApi importBugToExecution posts per-bug row data and fixFirst posts estimate', async () => {
    const http = createHttp([{}, {}]);
    const api = new ExecutionApi(http as never);

    await api.importBugToExecution({
      executionId: 2140,
      bugs: [
        { bugId: 84362, pri: 1, estimate: 4, estStarted: '2026-06-01', deadline: '2026-06-02', assignedTo: 'dev' },
        { bugId: 84363, pri: 2, estimate: 6 },
      ],
    });
    await api.fixFirst({ executionId: 2140, estimate: 8, withLeft: 'yes' });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/execution-importBug-2140.json', {
      data: 'import%5B84362%5D=84362&pri%5B84362%5D=1&estimate%5B84362%5D=4&estStarted%5B84362%5D=2026-06-01&deadline%5B84362%5D=2026-06-02&assignedTo%5B84362%5D=dev&import%5B84363%5D=84363&pri%5B84363%5D=2&estimate%5B84363%5D=6',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/execution-fixFirst-2140.json', {
      data: 'estimate=8&withLeft=yes',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ExecutionApi updateOrder and storySort submit comma-joined ids and orderBy', async () => {
    const http = createHttp([{}, {}]);
    const api = new ExecutionApi(http as never);

    await api.updateOrder({ executionIds: [2140, 2141, 2142], orderBy: ' order_desc ' });
    await api.storySort({ executionId: 2140, storyIds: [10154, 10155], orderBy: ' order_asc ' });

    expect(http.legacyRequest).toHaveBeenNthCalledWith(1, 'POST', '/execution-updateOrder.json', {
      data: 'executions=2140%2C2141%2C2142&orderBy=order_desc',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(http.legacyRequest).toHaveBeenNthCalledWith(2, 'POST', '/execution-storySort-2140.json', {
      data: 'storys=10154%2C10155&orderBy=order_asc',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  });

  it('ExecutionApi getExecutionAll uses query string and never path-injects executionId', async () => {
    const http = createHttp([{}]);
    const api = new ExecutionApi(http as never);

    await api.executionAll({ status: ' doing ', orderBy: ' order_desc ', productId: 153, limit: 50 });

    expect(http.legacyRequest).toHaveBeenCalledWith('GET', '/execution-all.json?status=doing&orderBy=order_desc&productID=153&recPerPage=50');
  });

  it('ExecutionApi throws on controllers that do not exist in 18.5 and rejects unsafe computeExecutionBurn', async () => {
    const http = createHttp();
    const api = new ExecutionApi(http as never);

    await expect(api.computeExecutionBurn(2140, '2026-06-05')).rejects.toThrow('execution/computeBurn 不接收 executionId');
    await expect(api.linkBugToExecution(2140, 84362, 153)).rejects.toThrow('execution 模块无 linkBug 控制器');
    await expect(api.unlinkBugFromExecution(2140, 84362)).rejects.toThrow('execution 模块无 unlinkBug 控制器');
    await expect(api.executionTrack(2140)).rejects.toThrow('execution 模块无 track 控制器');
    await expect(api.executionStoryTasks(2140, 10154)).rejects.toThrow('execution 模块无 storyTasks 控制器');
    await expect(api.addWhitelist({ executionId: 2140, accounts: ['u1'] })).rejects.toThrow('execution/addWhitelist 不接收 POST');
    await expect(api.batchImportBugsToExecution({ executionId: 2140, bugIds: [84362] })).rejects.toThrow('execution 模块无 batchImportBug 控制器');

    expect(http.legacyRequest).not.toHaveBeenCalled();
  });

  it('ExecutionApi linkStoryToExecutionSingle reuses linkStory URL with per-story products', async () => {
    const http = createHttp([{}]);
    const api = new ExecutionApi(http as never);

    await api.linkStoryToExecutionSingle(2140, 10154, 153, 0);

    expect(http.legacyRequest).toHaveBeenCalledWith('POST', '/execution-linkStory-2140.json', {
      data: 'stories%5B%5D=10154&products%5B10154%5D=153&branch=0',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

  it('samples only the first page in compact mode when scan is false', async () => {
    const taskApi = {
      getMyTasks: vi.fn(async () => ({
        items: [{ id: 1, name: 't1', status: 'doing', pri: 1 }, { id: 2, name: 't2', status: 'done', pri: 2 }],
        total: 101,
        scanned: 2,
        partial: true,
      })),
    };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp();
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyTaskStatistics({ scan: false }) as Record<string, unknown>;

    // compact 模式：标明 partial/sampled，只采首页，不扫描全量分页
    expect(result).toMatchObject({ total: 2, partial: true, sampled: true, scanned: 2 });
    expect(taskApi.getMyTasks).toHaveBeenCalledTimes(1);
    expect(taskApi.getMyTasks).toHaveBeenCalledWith({ status: 'all', scan: false, limit: 100 });
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

  it('defaults weekly activity account to current login user', async () => {
    const taskApi = { getMyTasks: vi.fn() };
    const bugApi = { getMyBugs: vi.fn() };
    const http = createHttp([[{ objectType: 'bug', action: 'resolved', objectID: 1, objectName: 'b', originalDate: '2026-05-28 10:00:00' }]]);
    const api = new StatisticsApi(taskApi as never, bugApi as never, http as never);

    const result = await api.getMyWeeklyActivity({ week: 'this' }) as Record<string, unknown>;
    expect(result).toMatchObject({ account: 'me', totalActions: 0, query: { week: 'this' } });
    expect(http.legacyRequest).toHaveBeenCalledWith('GET', expect.stringContaining('/my-dynamic-thisWeek-0-'));
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
