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
  keyword: value('KEYWORD', '测试'),
};

const commandSurface = [
  'activateBug',
  'activateExecution',
  'activateStory',
  'activateTask',
  'activateTodo',
  'addComment',
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
  'okBug',
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
  'pauseTask',
  'putoffExecution',
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
];

const schemaChecks = commandSurface.map((name) => cmdAs(`help:${name}`, 'help', name));

const liveQueries = [
  cmd('list'),
  cmd('whoami'),
  cmd('getMyProfile'),
  cmd('getProducts'),
  cmd('getProjects', '--limit', '5'),
  cmd('getPrograms', '--order', 'id_desc'),
  cmd('getMyTasks', '--status', 'all', '--limit', '5'),
  cmd('getMyBugs', '--limit', '5'),
  cmd('getMyTodos'),
  cmd('getMyTaskStatistics'),
  cmd('getMyBugStatistics'),
  cmdIf('getMyWeeklyActivity', ['account'], '--account', vars.account, '--week', 'this'),
  cmd('getExecutionDetail', '--executionId', vars.executionId),
  cmd('getExecutionDynamic', '--executionId', vars.executionId),
  cmd('getExecutionBugs', '--executionId', vars.executionId, '--limit', '5'),
  cmd('getExecutionBuilds', '--executionId', vars.executionId),
  cmd('getExecutionDailyBugStats', '--executionId', vars.executionId, '--iterationName', vars.iterationName),
  cmdIf('getProductDetail', ['productId'], '--productId', vars.productId),
  cmdIf('getProductBugs', ['productId'], '--productId', vars.productId, '--limit', '5'),
  cmdIf('getProductStories', ['productId'], '--productId', vars.productId, '--limit', '5'),
  cmdIf('getProductTestCases', ['productId'], '--productId', vars.productId, '--limit', '5'),
  cmdIf('getTestTasks', ['productId'], '--productId', vars.productId, '--limit', '5'),
  cmdIf('getProductPlans', ['productId'], '--productId', vars.productId, '--order', 'id_desc'),
  cmdIf('searchStories', ['productId'], '--productId', vars.productId, '--keyword', vars.keyword, '--limit', '5'),
  cmdIf('searchStoriesByProductName', ['productName'], '--productName', vars.productName, '--keyword', vars.keyword, '--limit', '5'),
  cmdIf('getProjectDetail', ['projectId'], '--projectId', vars.projectId),
  cmdIf('getProjectExecutions', ['projectId'], '--projectId', vars.projectId),
  cmdIf('getProjectBuilds', ['projectId'], '--projectId', vars.projectId),
  cmdIf('getProjectReleases', ['releaseProjectId'], '--projectId', vars.releaseProjectId),
  cmdIf('getProgramDetail', ['programId'], '--programId', vars.programId),
  cmdIf('getPlanDetail', ['planId'], '--planId', vars.planId),
  cmdIf('getStoryDetail', ['storyId'], '--storyId', vars.storyId),
  cmdIf('getStoryRelatedBugs', ['storyId'], '--storyId', vars.storyId, ...optionalArgs('--productId', vars.productId)),
  cmdIf('getDevelopmentContext:story', ['storyId'], 'getDevelopmentContext', '--entityType', 'story', '--entityId', vars.storyId, ...optionalArgs('--productId', vars.productId)),
  cmdIf('getBugDetail', ['bugId'], '--bugId', vars.bugId),
  cmdIf('getBugRelatedStory', ['bugId'], '--bugId', vars.bugId),
  cmdIf('getDevelopmentContext:bug', ['bugId'], 'getDevelopmentContext', '--entityType', 'bug', '--entityId', vars.bugId),
  cmdIf('getTaskDetail', ['taskId'], '--taskId', vars.taskId),
  cmdIf('getBuildDetail', ['buildId'], '--buildId', vars.buildId),
  cmdIf('getTestCaseDetail', ['testCaseId'], '--testCaseId', vars.testCaseId),
  cmdIf('getTestTaskDetail', ['testTaskId'], '--testTaskId', vars.testTaskId),
  cmdIf('getTodoDetail', ['todoId'], '--todoId', vars.todoId),
  cmdIf('getComments:execution', ['executionId'], 'getComments', '--objectType', 'execution', '--objectID', vars.executionId),
  cmdIf('getComments:story', ['storyId'], 'getComments', '--objectType', 'story', '--objectID', vars.storyId),
  cmdIf('getComments:bug', ['bugId'], 'getComments', '--objectType', 'bug', '--objectID', vars.bugId),
  cmdIf('getComments:task', ['taskId'], 'getComments', '--objectType', 'task', '--objectID', vars.taskId),
];

const commands = [...schemaChecks, ...liveQueries];

if (!dryRun && !existsSync(cliPath)) {
  console.error('缺少 dist/bin/zentao.js，请先运行 pnpm build。');
  process.exit(1);
}

let passed = 0;
let skipped = 0;
let failed = 0;

for (const item of commands) {
  if (item.skip) {
    skipped += 1;
    console.log(`SKIP ${item.label}: 缺少 ${item.missing.map((name) => `ZENTAO_SMOKE_${toEnvName(name)}`).join(', ')}`);
    continue;
  }

  const printable = ['zentao', ...item.args].join(' ');
  if (dryRun) {
    passed += 1;
    console.log(`DRY  ${printable}`);
    continue;
  }

  console.log(`RUN  ${printable}`);
  const result = spawnSync(process.execPath, [cliPath, ...item.args], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status === 0) {
    passed += 1;
    console.log(`OK   ${item.label}`);
    continue;
  }

  failed += 1;
  console.error(`FAIL ${item.label}`);
  if (result.stdout) console.error(result.stdout.trim());
  if (result.stderr) console.error(result.stderr.trim());
  if (!continueOnError) break;
}

console.log(`\nSummary: passed=${passed}, skipped=${skipped}, failed=${failed}`);
process.exit(failed > 0 ? 1 : 0);

function cmd(label, ...args) {
  return { label, args: args.length > 0 ? [label, ...args] : [label] };
}

function cmdAs(label, ...args) {
  return { label, args };
}

function cmdIf(label, required, ...args) {
  const missing = required.filter((name) => !vars[name]);
  const commandName = args[0] && !String(args[0]).startsWith('--') ? String(args[0]) : label;
  return {
    label,
    args: [commandName, ...args.slice(commandName === label ? 0 : 1)],
    skip: missing.length > 0,
    missing,
  };
}

function optionalArgs(flag, val) {
  return val ? [flag, val] : [];
}

function toEnvName(name) {
  return name.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase();
}
