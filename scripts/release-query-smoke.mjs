#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = resolve(rootDir, 'dist/bin/zentao.js');
const dryRun = process.argv.includes('--dry-run');
const continueOnError = process.argv.includes('--continue-on-error');

const env = (name, fallback = undefined) => process.env[name] || fallback;
const value = (name, fallback = undefined) => env(`ZENTAO_SMOKE_${name}`, fallback);

const vars = {
  account: value('ACCOUNT', process.env.ZENTAO_USERNAME || 'lixm1'),
  executionId: value('EXECUTION_ID', '2140'),
  iterationName: value('ITERATION_NAME', 'smoke'),
  productId: value('PRODUCT_ID', '153'),
  productName: value('PRODUCT_NAME', '云战AIFZ'),
  projectId: value('PROJECT_ID', '1772'),
  releaseProjectId: value('RELEASE_PROJECT_ID'),
  programId: value('PROGRAM_ID', '620'),
  planId: value('PLAN_ID', '360'),
  storyId: value('STORY_ID', '10154'),
  bugId: value('BUG_ID', '84362'),
  taskId: value('TASK_ID', '79922'),
  buildId: value('BUILD_ID', '5648'),
  testCaseId: value('TEST_CASE_ID', '58191'),
  testTaskId: value('TEST_TASK_ID', '2319'),
  todoId: value('TODO_ID'),
  releaseId: value('RELEASE_ID'),
  keyword: value('KEYWORD', '测试'),
};

const commandSurface = [
  'activateBug', 'activateExecution', 'activateStory', 'activateTask', 'activateTodo', 'addComment', 'assignBug', 'assignStory',
  'assignTask', 'changeStory', 'closeBug', 'closeExecution', 'closeStory', 'closeTask', 'confirmBug', 'createBug', 'createBuild',
  'createStory', 'createTaskFromBug', 'createTaskFromStory', 'createTestCase', 'createTestTask', 'createTodo', 'deleteBug', 'deleteTask',
  'deleteTodo', 'finishTask', 'finishTodo', 'getBugDetail', 'getBugRelatedStory', 'getBuildDetail', 'getComments', 'getDevelopmentContext',
  'getExecutionBugs', 'getExecutionBuilds', 'getExecutionDailyBugStats', 'getExecutionDetail', 'getExecutionDynamic', 'getMyBugs',
  'getMyBugStatistics', 'getMyProfile', 'okBug', 'getMyTasks', 'getMyTaskStatistics', 'getMyTodos', 'getMyWeeklyActivity', 'getPlanDetail',
  'getProductBugs', 'getProductDetail', 'getProductPlans', 'getProducts', 'getProductStories', 'getProductTestCases', 'getProgramDetail',
  'getPrograms', 'getProjectBuilds', 'getProjectDetail', 'getProjectExecutions', 'getProjectReleases', 'getProjects', 'getStoryDetail',
  'getStoryRelatedBugs', 'getTaskDetail', 'getTestCaseDetail', 'getTestTaskDetail', 'getTodoDetail', 'initZentao', 'linkBugsToPlan',
  'linkStoriesToPlan', 'pauseTask', 'putoffExecution', 'resolveBug', 'restartTask', 'reviewStory', 'searchStories',
  'searchStoriesByProductName', 'startExecution', 'startTask', 'suspendExecution', 'unlinkBugsFromPlan', 'unlinkStoriesFromPlan',
  'updateBug', 'updateBuild', 'updateExecution', 'updateStory', 'updateTask', 'updateTestCase', 'updateTestTask', 'updateTodo', 'who-am-i', 'whoami',
];

const schemaChecks = commandSurface.map((name) => ({
  label: `help:${name}`,
  args: ['help', name],
  kind: 'text',
  validate: (text) => {
    if (!text.includes(name)) throw new Error(`help 输出未包含命令名 ${name}`);
    if (!text.includes('用法：')) throw new Error(`help 输出未包含用法区块 ${name}`);
  },
}));

const liveQueries = [
  textCmd('list', ['list'], (text) => expectIncludes(text, ['getMyProfile', 'getMyWeeklyActivity'])),
  textCmd('whoami', ['whoami'], (text) => expectIncludes(text, ['账号：', '快捷入口：'])),
  jsonCmd('getMyProfile', ['getMyProfile'], (data) => {
    expectObject(data, 'getMyProfile');
    expectStringLike(readAny(data, ['account', 'username', 'user', 'profile.account', 'profile.username']), 'getMyProfile.account');
  }),
  jsonCmd('getProducts', ['getProducts'], (data) => {
    const items = expectItems(data, 'getProducts');
    expectMatchById(items, vars.productId, 'getProducts');
  }),
  jsonCmd('getProductAll', ['getProductAll', '--limit', '20'], (data) => {
    const items = expectItems(data, 'getProductAll');
    expectArrayish(items, 'getProductAll.items');
  }),
  jsonCmd('getProjects', ['getProjects', '--limit', '5'], (data) => {
    const items = expectItems(data, 'getProjects');
    expectArray(items, 'getProjects.items');
  }),
  jsonCmd('getPrograms', ['getPrograms', '--order', 'id_desc'], (data) => {
    const items = expectItems(data, 'getPrograms');
    expectMatchById(items, vars.programId, 'getPrograms');
  }),
  jsonCmd('getProgramAll', ['getProgramAll', '--limit', '20'], (data) => {
    const items = expectItems(data, 'getProgramAll');
    expectArrayish(items, 'getProgramAll.items');
  }),
  jsonCmd('getMyTasks', ['getMyTasks', '--status', 'all', '--limit', '5'], (data) => expectItems(data, 'getMyTasks')),
  jsonCmd('getMyBugs', ['getMyBugs', '--limit', '5'], (data) => expectItems(data, 'getMyBugs')),
  jsonCmd('getMyTodos', ['getMyTodos'], (data, state) => {
    const items = expectItems(data, 'getMyTodos');
    const todo = items.find((item) => isPositiveId(item?.id));
    if (todo) state.todoId = String(todo.id);
  }),
  jsonCmd('getMyTaskStatistics', ['getMyTaskStatistics'], (data) => {
    expectObject(data, 'getMyTaskStatistics');
    expectNumber(readAny(data, ['total']), 'getMyTaskStatistics.total');
    expectObject(readAny(data, ['byStatus']), 'getMyTaskStatistics.byStatus');
  }),
  jsonCmd('getMyBugStatistics', ['getMyBugStatistics'], (data) => {
    expectObject(data, 'getMyBugStatistics');
    expectNumber(readAny(data, ['total']), 'getMyBugStatistics.total');
    expectObject(readAny(data, ['byStatus']), 'getMyBugStatistics.byStatus');
  }),
  jsonCmd('getMyWeeklyActivity', ['getMyWeeklyActivity', '--week', 'this'], (data) => {
    expectObject(data, 'getMyWeeklyActivity');
    expectStringLike(readAny(data, ['account']), 'getMyWeeklyActivity.account');
    expectObject(readAny(data, ['summary']), 'getMyWeeklyActivity.summary');
    expectObject(readAny(data, ['resolvedDateRange']), 'getMyWeeklyActivity.resolvedDateRange');
  }),
  jsonCmd('getExecutionDetail', ['getExecutionDetail', '--executionId', vars.executionId], (data) => expectId(data, vars.executionId, 'getExecutionDetail')),
  jsonCmd('getExecutionSnapshot', ['getExecutionSnapshot', '--executionId', vars.executionId], (data) => {
    expectObject(data, 'getExecutionSnapshot');
    expectId(readAny(data, ['focus']) ?? data, vars.executionId, 'getExecutionSnapshot.focus');
  }),
  jsonCmd('getExecutionDynamic', ['getExecutionDynamic', '--executionId', vars.executionId], (data) => {
    expectObject(data, 'getExecutionDynamic');
    const dynamic = readAny(data, ['dynamics', 'actions', 'items']);
    if (!Array.isArray(dynamic)) throw new Error('getExecutionDynamic 未返回 dynamics/actions/items 数组');
  }),
  jsonCmd('getExecutionBugs', ['getExecutionBugs', '--executionId', vars.executionId, '--limit', '5'], (data) => expectItems(data, 'getExecutionBugs')),
  jsonCmd('getExecutionBuilds', ['getExecutionBuilds', '--executionId', vars.executionId], (data) => {
    const items = expectItems(data, 'getExecutionBuilds');
    expectArray(items, 'getExecutionBuilds.items');
  }),
  jsonCmd('getExecutionDailyBugStats', ['getExecutionDailyBugStats', '--executionId', vars.executionId, '--iterationName', vars.iterationName], (data) => {
    expectObject(data, 'getExecutionDailyBugStats');
    expectNumber(readAny(data, ['total']), 'getExecutionDailyBugStats.total');
    expectObject(readAny(data, ['taskSummary']), 'getExecutionDailyBugStats.taskSummary');
  }),
  jsonCmd('getExecutionManageMembers', ['getExecutionManageMembers', '--executionId', vars.executionId], (data) => expectObject(data, 'getExecutionManageMembers')),
  jsonCmd('getExecutionAll', ['getExecutionAll', '--productId', vars.productId, '--limit', '10'], (data) => expectItems(data, 'getExecutionAll')),
  jsonCmd('getExecutionStoryKanban', ['getExecutionStoryKanban', '--executionId', vars.executionId], (data) => expectObject(data, 'getExecutionStoryKanban')),
  jsonCmd('getExecutionKanban', ['getExecutionKanban', '--executionId', vars.executionId], (data) => expectObject(data, 'getExecutionKanban')),
  jsonCmd('getExecutionTaskKanban', ['getExecutionTaskKanban', '--executionId', vars.executionId], (data) => expectObject(data, 'getExecutionTaskKanban')),
  jsonCmd('getExecutionExecutionKanban', ['getExecutionExecutionKanban'], (data) => expectObject(data, 'getExecutionExecutionKanban')),
  jsonCmd('getProductDetail', ['getProductDetail', '--productId', vars.productId], (data) => expectId(data, vars.productId, 'getProductDetail')),
  jsonCmd('getProductBugs', ['getProductBugs', '--productId', vars.productId, '--limit', '5'], (data) => expectItems(data, 'getProductBugs')),
  jsonCmd('getProductStories', ['getProductStories', '--productId', vars.productId, '--limit', '5'], (data) => expectItems(data, 'getProductStories')),
  jsonCmd('getProductTestCases', ['getProductTestCases', '--productId', vars.productId, '--limit', '5'], (data) => expectItems(data, 'getProductTestCases')),
  jsonCmd('getTestTasks', ['getTestTasks', '--productId', vars.productId, '--limit', '5'], (data) => expectItems(data, 'getTestTasks')),
  jsonCmd('getProductPlans', ['getProductPlans', '--productId', vars.productId, '--order', 'id_desc'], (data) => expectItems(data, 'getProductPlans')),
  jsonCmd('searchStories', ['searchStories', '--productId', vars.productId, '--keyword', vars.keyword, '--limit', '5'], (data) => expectItems(data, 'searchStories')),
  jsonCmd('searchStoriesByProductName', ['searchStoriesByProductName', '--productName', vars.productName, '--keyword', vars.keyword, '--limit', '5'], (data) => expectItems(data, 'searchStoriesByProductName')),
  jsonCmd('getProductTrack', ['getProductTrack', '--productId', vars.productId], (data) => expectObject(data, 'getProductTrack')),
  jsonCmd('getProductWhitelist', ['getProductWhitelist', '--productId', vars.productId], (data) => expectArrayish(data, 'getProductWhitelist')),
  jsonCmd('getProductDashboard', ['getProductDashboard', '--productId', vars.productId], (data) => expectObject(data, 'getProductDashboard')),
  jsonCmd('getProductRoadmap', ['getProductRoadmap', '--productId', vars.productId], (data) => expectArrayish(data, 'getProductRoadmap')),
  jsonCmd('getProductDynamic', ['getProductDynamic', '--productId', vars.productId], (data) => expectArrayish(data, 'getProductDynamic')),
  jsonCmd('getProjectDetail', ['getProjectDetail', '--projectId', vars.projectId], (data) => expectId(data, vars.projectId, 'getProjectDetail')),
  jsonCmd('getProjectExecutions', ['getProjectExecutions', '--projectId', vars.projectId], (data) => expectItems(data, 'getProjectExecutions')),
  jsonCmd('getProjectBuilds', ['getProjectBuilds', '--projectId', vars.projectId], (data) => expectItems(data, 'getProjectBuilds')),
  jsonCmd('getProjectReleases', ['getProjectReleases', '--projectId', vars.releaseProjectId], (data, state) => {
    const items = expectItems(data, 'getProjectReleases');
    const release = items.find((item) => isPositiveId(item?.id));
    if (release) state.releaseId = String(release.id);
  }),
  jsonCmd('getProjectTeam', ['getProjectTeam', '--projectId', vars.projectId], (data) => expectArrayish(data, 'getProjectTeam')),
  jsonCmd('getProjectGroup', ['getProjectGroup', '--projectId', vars.projectId], (data) => expectObject(data, 'getProjectGroup')),
  jsonCmd('getProjectManageMembers', ['getProjectManageMembers', '--projectId', vars.projectId], (data) => expectObject(data, 'getProjectManageMembers')),
  jsonCmd('getProjectWhitelist', ['getProjectWhitelist', '--projectId', vars.projectId], (data) => expectArrayish(data, 'getProjectWhitelist')),
  jsonCmd('getProjectDynamic', ['getProjectDynamic', '--projectId', vars.projectId], (data) => expectArrayish(data, 'getProjectDynamic')),
  jsonCmd('getProjectLinkedProducts', ['getProjectLinkedProducts', '--projectId', vars.projectId], (data) => expectArrayish(data, 'getProjectLinkedProducts')),
  jsonCmd('getProgramDetail', ['getProgramDetail', '--programId', vars.programId], (data) => expectId(data, vars.programId, 'getProgramDetail')),
  jsonCmd('getProgramTrack', ['getProgramTrack', '--programId', vars.programId], (data) => expectObject(data, 'getProgramTrack')),
  jsonCmd('getProgramStakeholders', ['getProgramStakeholders', '--programId', vars.programId], (data) => expectArrayish(data, 'getProgramStakeholders')),
  jsonCmd('getPlanDetail', ['getPlanDetail', '--planId', vars.planId], (data) => expectId(data, vars.planId, 'getPlanDetail')),
  jsonCmd('getStoryDetail', ['getStoryDetail', '--storyId', vars.storyId], (data) => expectId(data, vars.storyId, 'getStoryDetail')),
  jsonCmd('getStoryRelatedBugs', ['getStoryRelatedBugs', '--storyId', vars.storyId, '--productId', vars.productId], (data) => {
    expectObject(data, 'getStoryRelatedBugs');
    expectArray(readAny(data, ['bugs']) ?? [], 'getStoryRelatedBugs.bugs');
  }),
  jsonCmd('getDevelopmentContext:story', ['getDevelopmentContext', '--entityType', 'story', '--entityId', vars.storyId, '--productId', vars.productId], (data) => expectObject(data, 'getDevelopmentContext:story')),
  jsonCmd('getDevelopmentContextSnapshot:story', ['getDevelopmentContextSnapshot', '--entityType', 'story', '--entityId', vars.storyId, '--productId', vars.productId], (data) => expectObject(data, 'getDevelopmentContextSnapshot:story')),
  jsonCmd('getBugDetail', ['getBugDetail', '--bugId', vars.bugId], (data) => expectId(data, vars.bugId, 'getBugDetail')),
  jsonCmd('getBugRelatedStory', ['getBugRelatedStory', '--bugId', vars.bugId], (data) => {
    if (data !== null) expectObject(data, 'getBugRelatedStory');
  }),
  jsonCmd('getDevelopmentContext:bug', ['getDevelopmentContext', '--entityType', 'bug', '--entityId', vars.bugId], (data) => expectObject(data, 'getDevelopmentContext:bug')),
  jsonCmd('getDevelopmentContextSnapshot:bug', ['getDevelopmentContextSnapshot', '--entityType', 'bug', '--entityId', vars.bugId], (data) => expectObject(data, 'getDevelopmentContextSnapshot:bug')),
  jsonCmd('getTaskDetail', ['getTaskDetail', '--taskId', vars.taskId], (data) => expectId(data, vars.taskId, 'getTaskDetail')),
  jsonCmd('getBuildDetail', ['getBuildDetail', '--buildId', vars.buildId], (data) => expectId(data, vars.buildId, 'getBuildDetail')),
  jsonCmd('getTestCaseDetail', ['getTestCaseDetail', '--testCaseId', vars.testCaseId], (data) => expectId(data, vars.testCaseId, 'getTestCaseDetail')),
  jsonCmd('getTestTaskDetail', ['getTestTaskDetail', '--testTaskId', vars.testTaskId], (data) => expectId(data, vars.testTaskId, 'getTestTaskDetail')),
  deferredJsonCmd('getReleaseDetail', (state) => state.releaseId ? ['getReleaseDetail', '--releaseId', state.releaseId] : null, (data, state) => expectId(data, state.releaseId, 'getReleaseDetail')),
  deferredJsonCmd('getTodoDetail', (state) => state.todoId ? ['getTodoDetail', '--todoId', state.todoId] : null, (data, state) => expectId(data, state.todoId, 'getTodoDetail')),
  jsonCmd('getComments:execution', ['getComments', '--objectType', 'execution', '--objectID', vars.executionId], (data) => validateComments(data, 'execution')),
  jsonCmd('getComments:story', ['getComments', '--objectType', 'story', '--objectID', vars.storyId], (data) => validateComments(data, 'story')),
  jsonCmd('getComments:bug', ['getComments', '--objectType', 'bug', '--objectID', vars.bugId], (data) => validateComments(data, 'bug')),
  jsonCmd('getComments:task', ['getComments', '--objectType', 'task', '--objectID', vars.taskId], (data) => validateComments(data, 'task')),
];

const commands = [...schemaChecks, ...liveQueries];

if (!dryRun && !existsSync(cliPath)) {
  console.error('缺少 dist/bin/zentao.js，请先运行 pnpm build。');
  process.exit(1);
}

let passed = 0;
let skipped = 0;
let failed = 0;
const state = { ...vars };

for (const item of commands) {
  const resolved = resolveCommand(item, state);
  if (resolved.skip) {
    skipped += 1;
    console.log(`SKIP ${item.label}: ${resolved.reason}`);
    continue;
  }

  const printable = ['zentao', ...resolved.args].join(' ');
  if (dryRun) {
    passed += 1;
    console.log(`DRY  ${printable}`);
    continue;
  }

  console.log(`RUN  ${printable}`);
  const result = spawnSync(process.execPath, [cliPath, ...resolved.args], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    failed += 1;
    console.error(`FAIL ${item.label}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
    if (!continueOnError) break;
    continue;
  }

  try {
    validateOutput(item, result.stdout, state);
    passed += 1;
    console.log(`OK   ${item.label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.label}`);
    console.error(error instanceof Error ? error.message : String(error));
    if (result.stdout) console.error(result.stdout.trim());
    if (!continueOnError) break;
  }
}

console.log(`\nSummary: passed=${passed}, skipped=${skipped}, failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);

function jsonCmd(label, args, validate) {
  return { label, args, kind: 'json', validate };
}

function deferredJsonCmd(label, getArgs, validate) {
  return { label, getArgs, kind: 'json', validate };
}

function textCmd(label, args, validate) {
  return { label, args, kind: 'text', validate };
}

function resolveCommand(item, state) {
  if (item.getArgs) {
    const args = item.getArgs(state);
    if (!args) return { skip: true, reason: '缺少前置查询得到的 ID' };
    return { skip: false, args };
  }
  if (item.args.some((arg) => arg === undefined || arg === '')) {
    return { skip: true, reason: '缺少必需环境变量' };
  }
  return { skip: false, args: item.args };
}

function validateOutput(item, stdout, state) {
  const text = stdout.trim();
  if (item.kind === 'text') {
    item.validate(text, state);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${item.label} 输出不是合法 JSON`);
  }
  item.validate(parsed, state);
}

function validateComments(data, objectType) {
  expectObject(data, `getComments:${objectType}`);
  const actions = readAny(data, ['actions', 'comments']);
  if (!Array.isArray(actions)) throw new Error(`getComments:${objectType} 未返回 actions/comments 数组`);
}

function expectItems(data, label) {
  expectObject(data, label);
  const items = readAny(data, ['items', 'bugs', 'stories', 'testcases', 'testTasks', 'builds', 'plans', 'executions', 'projects', 'programs', 'products', 'todos']);
  if (items && typeof items === 'object' && !Array.isArray(items)) return items;
  if (!Array.isArray(items)) throw new Error(`${label} 未返回可识别列表字段`);
  return items;
}

function expectArrayish(data, label) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return data;
  throw new Error(`${label} 返回既不是对象也不是数组`);
}

function expectMatchById(items, targetId, label) {
  if (!targetId) return;
  if (!items.some((item) => String(item?.id) === String(targetId))) {
    throw new Error(`${label} 未包含目标 ID ${targetId}`);
  }
}

function expectId(data, expectedId, label) {
  expectObject(data, label);
  if (String(data.id) !== String(expectedId)) throw new Error(`${label} 返回 id=${data.id}，期望 ${expectedId}`);
}

function expectObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 返回不是对象`);
  return value;
}

function expectArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} 不是数组`);
}

function expectNumber(value, label) {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`${label} 不是数字`);
}

function expectStringLike(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} 不是非空字符串`);
}

function expectIncludes(text, parts) {
  for (const part of parts) {
    if (!text.includes(part)) throw new Error(`文本未包含: ${part}`);
  }
}

function readAny(root, paths) {
  for (const path of paths) {
    const value = readPath(root, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

function readPath(root, path) {
  const segments = path.split('.');
  let current = root;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

function isPositiveId(value) {
  return typeof value === 'number' ? value > 0 : /^\d+$/.test(String(value ?? '')) && Number(value) > 0;
}
