#!/usr/bin/env node
// Zero-dependency coverage checker: zentao-cli CLI tools vs zentao 18.5 controllers
// Usage:
//   node scripts/coverage.mjs               # human-readable report
//   node scripts/coverage.mjs --json       # JSON to stdout
//   node scripts/coverage.mjs --json path   # JSON to file
//   node scripts/coverage.mjs --missing     # print all missing entries
//   node scripts/coverage.mjs --missing <module>  # print one module's missing entries

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const ZENTAO_18 = '/Users/lixiaoming/Desktop/desktop/opensource/zentaopms-18.5';

// ---------- CLI args ----------
const argv = process.argv.slice(2);
const JSON_IDX = argv.indexOf('--json');
const MISSING_IDX = argv.indexOf('--missing');
const wantJson = JSON_IDX !== -1;
const jsonOutPath = wantJson && argv[JSON_IDX + 1] && !argv[JSON_IDX + 1].startsWith('-')
  ? argv[JSON_IDX + 1]
  : null;
const wantMissing = MISSING_IDX !== -1;
const missingModule = wantMissing && argv[MISSING_IDX + 1] && !argv[MISSING_IDX + 1].startsWith('-')
  ? argv[MISSING_IDX + 1]
  : null;

// ---------- Module list ----------
const MODULES = [
  'execution','testcase','product','project','program',
  'task','build','bug','testtask','story','release','todo',
];

// ---------- Entries (real user-callable page actions, hand-verified) ----------
const ENTRIES = {
  execution: ['create','edit','batchEdit','batchChangeStatus','start','putoff','suspend','activate','close','delete','manageMembers','unlinkMember','linkStory','unlinkStory','batchUnlinkStory','storyEstimate','addWhitelist','unbindWhitelist','fixFirst','computeBurn','computeCFD','storySort','updateOrder','kanban','taskKanban','executionKanban','storyKanban','importBug','all','track'],
  testcase:  ['create','edit','batchCreate','batchEdit','delete','batchDelete','batchChangeBranch','batchChangeModule','batchCaseTypeChange','linkCases','linkBugs','confirmChange','confirmLibcaseChange','ignoreLibcaseChange','confirmStoryChange','batchConfirmStoryChange','export','exportTemplate','import','importFromLib','importToLib','review','batchReview','createBug','updateOrder'],
  product:   ['create','edit','batchEdit','close','delete','addWhitelist','unbindWhitelist','updateOrder','manageLine','all','track'],
  project:   ['create','edit','batchEdit','start','suspend','close','activate','delete','unlinkMember','manageMembers','manageGroupMember','copyGroup','editGroup','createGroup','addWhitelist','unbindWhitelist','manageProducts','updateOrder'],
  program:   ['create','edit','close','start','activate','suspend','delete','createStakeholder','unlinkStakeholder','batchUnlinkStakeholders','unbindWhitelist','updateOrder','track'],
  task:      ['create','batchCreate','edit','batchEdit','assignTo','batchChangeModule','batchAssignTo','confirmStoryChange','start','recordEstimate','editEstimate','deleteEstimate','finish','pause','restart','close','batchCancel','batchClose','cancel','activate','delete','export','editTeam'],
  build:     ['create','edit','delete','linkStory','unlinkStory','batchUnlinkStory','linkBug','unlinkBug','batchUnlinkBug'],
  bug:       ['create','batchCreate','edit','batchEdit','assignTo','batchChangeBranch','batchChangeModule','batchChangePlan','batchAssignTo','confirmBug','batchConfirm','resolve','batchResolve','activate','batchActivate','close','batchClose','confirmStoryChange','linkBugs','delete','export','track'],
  testtask:  ['create','edit','start','activate','close','block','delete','linkCase','unlinkCase','batchUnlinkCases','runCase','batchRun','batchAssign','importUnitResult'],
  story:     ['create','batchCreate','edit','batchEdit','change','activate','review','batchReview','recall','submitReview','close','batchClose','batchChangeModule','batchChangePlan','batchChangeBranch','batchChangeStage','batchToTask','assignTo','batchAssignTo','linkStory','linkStories','linkRequirements','processStoryChange','delete','export'],
  release:   ['create','edit','delete','linkStory','unlinkStory','batchUnlinkStory','linkBug','unlinkBug','batchUnlinkBug','changeStatus','notify','export'],
  todo:      ['create','batchCreate','edit','batchEdit','start','activate','close','assignTo','delete','finish','batchFinish','batchClose','import2Today','export','createCycle'],
};

// ---------- Alias map: entry -> CLI tool name(s) ----------
const ALIAS = {
  'execution|create':['createExecution'],
  'execution|edit':['updateExecution'],
  'execution|batchEdit':['batchEditExecutions'],
  'execution|batchChangeStatus':['batchChangeExecutionStatus'],
  'execution|start':['startExecution'],
  'execution|putoff':['putoffExecution'],
  'execution|suspend':['suspendExecution'],
  'execution|activate':['activateExecution'],
  'execution|close':['closeExecution'],
  'execution|delete':['deleteExecution'],
  'execution|manageMembers':['getExecutionManageMembers'],
  'execution|unlinkMember':['unlinkMemberFromExecution'],
  'execution|linkStory':['linkStoriesToExecution','linkStoryToExecutionSingle'],
  'execution|unlinkStory':['unlinkStoryFromExecution'],
  'execution|batchUnlinkStory':['batchUnlinkStoriesFromExecution'],
  'execution|storyEstimate':['storyEstimate'],
  'execution|addWhitelist':['addExecutionWhitelist'],
  'execution|unbindWhitelist':['unbindExecutionWhitelist'],
  'execution|fixFirst':['fixFirstExecution'],
  'execution|computeBurn':['computeExecutionBurn'],
  'execution|computeCFD':['computeCfd'],
  'execution|storySort':['storySortExecution'],
  'execution|updateOrder':['updateExecutionOrder'],
  'execution|kanban':['getExecutionKanban'],
  'execution|taskKanban':['getExecutionTaskKanban'],
  'execution|executionKanban':['getExecutionExecutionKanban'],
  'execution|storyKanban':['getExecutionStoryKanban'],
  'execution|importBug':['importBugToExecution','batchImportBugsToExecution'],
  'execution|all':['getExecutionAll'],
  'execution|track':['getExecutionTrack'],
  'testcase|create':['createTestCase'],
  'testcase|edit':['updateTestCase','editTestCaseViaForm'],
  'testcase|batchCreate':['batchCreateTestCases'],
  'testcase|batchEdit':['batchEditTestCases'],
  'testcase|delete':['deleteTestCase'],
  'testcase|batchDelete':['batchDeleteTestCases'],
  'testcase|batchChangeBranch':['batchChangeTestCaseBranch'],
  'testcase|batchChangeModule':['batchChangeTestCaseModule'],
  'testcase|batchCaseTypeChange':['batchChangeTestCaseType'],
  'testcase|linkCases':['linkCasesToTestCase'],
  'testcase|linkBugs':['linkBugToTestCase'],
  'testcase|confirmChange':['confirmTestCaseChange'],
  'testcase|confirmLibcaseChange':['confirmTestCaseLibcaseChange'],
  'testcase|ignoreLibcaseChange':['ignoreTestCaseLibcaseChange'],
  'testcase|confirmStoryChange':['confirmTestCaseStoryChange'],
  'testcase|batchConfirmStoryChange':['batchConfirmTestCaseStoryChange'],
  'testcase|export':['exportTestCases'],
  'testcase|exportTemplate':['exportTestCaseTemplate'],
  'testcase|import':['importTestCases'],
  'testcase|importFromLib':['importTestCasesFromLib'],
  'testcase|importToLib':['importTestCaseToLib'],
  'testcase|review':['reviewTestCase'],
  'testcase|batchReview':['batchReviewTestCases'],
  'testcase|createBug':['createBugFromTestCase'],
  'testcase|updateOrder':['updateTestCaseOrder'],
  'product|create':['createProduct'],
  'product|edit':['editProduct'],
  'product|batchEdit':['batchEditProducts'],
  'product|close':['closeProduct'],
  'product|delete':['deleteProduct'],
  'product|addWhitelist':['addProductWhitelist'],
  'product|unbindWhitelist':['unbindProductWhitelist'],
  'product|updateOrder':['setProductOrder'],
  'product|manageLine':['manageProductLine'],
  'product|all':['getProductAll'],
  'product|track':['getProductTrack'],
  'project|create':['createProject'],
  'project|edit':['editProject'],
  'project|batchEdit':['batchEditProjects'],
  'project|start':['startProject'],
  'project|suspend':['suspendProject'],
  'project|close':['closeProject'],
  'project|activate':['activateProject'],
  'project|delete':['deleteProject'],
  'project|unlinkMember':['unlinkProjectMember'],
  'project|manageMembers':['getProjectManageMembers'],
  'project|manageGroupMember':['getProjectGroup'],
  'project|copyGroup':['copyProjectGroup'],
  'project|editGroup':['editProjectGroup'],
  'project|createGroup':['createProjectGroup'],
  'project|addWhitelist':['addProjectWhitelist'],
  'project|unbindWhitelist':['unbindProjectWhitelist'],
  'project|manageProducts':['getProjectLinkedProducts'],
  'project|updateOrder':['setProjectOrder'],
  'program|create':['createProgram'],
  'program|edit':['editProgram'],
  'program|close':['closeProgram'],
  'program|start':['startProgram'],
  'program|activate':['activateProgram'],
  'program|suspend':['suspendProgram'],
  'program|delete':['deleteProgram'],
  'program|createStakeholder':['createProgramStakeholder'],
  'program|unlinkStakeholder':['unlinkProgramStakeholder'],
  'program|batchUnlinkStakeholders':['batchUnlinkProgramStakeholders'],
  'program|unbindWhitelist':['unbindProgramWhitelist'],
  'program|updateOrder':['setProgramOrder'],
  'program|track':['getProgramTrack'],
  'task|create':['createTask'],
  'task|batchCreate':['batchCreateTasks'],
  'task|edit':['updateTask'],
  'task|batchEdit':['batchEditTasks'],
  'task|assignTo':['assignTask'],
  'task|batchChangeModule':['batchChangeTaskModule'],
  'task|batchAssignTo':['batchAssignTasksTo'],
  'task|confirmStoryChange':['confirmTaskStoryChange'],
  'task|start':['startTask'],
  'task|recordEstimate':['recordTaskEstimate'],
  'task|editEstimate':['editTaskEstimate'],
  'task|deleteEstimate':['deleteTaskEstimate'],
  'task|finish':['finishTask'],
  'task|pause':['pauseTask'],
  'task|restart':['restartTask'],
  'task|close':['closeTask'],
  'task|batchCancel':['batchCancelTasks'],
  'task|batchClose':['batchCloseTasks'],
  'task|cancel':['cancelTask'],
  'task|activate':['activateTask'],
  'task|delete':['deleteTask'],
  'task|export':['exportTasks'],
  'task|editTeam':['editTaskTeam'],
  'build|create':['createBuild'],
  'build|edit':['updateBuild'],
  'build|delete':['deleteBuild'],
  'build|linkStory':['linkStoriesToBuild'],
  'build|unlinkStory':['unlinkStoryFromBuild'],
  'build|batchUnlinkStory':['batchUnlinkStoriesFromBuild'],
  'build|linkBug':['linkBugsToBuild'],
  'build|unlinkBug':['unlinkBugFromBuild'],
  'build|batchUnlinkBug':['batchUnlinkBugsFromBuild'],
  'bug|create':['createBug'],
  'bug|batchCreate':['batchCreateBugs'],
  'bug|edit':['updateBug'],
  'bug|batchEdit':['batchEditBugs'],
  'bug|assignTo':['assignBug'],
  'bug|batchChangeBranch':['batchChangeBugBranch'],
  'bug|batchChangeModule':['batchChangeBugModule'],
  'bug|batchChangePlan':['batchChangeBugPlan'],
  'bug|batchAssignTo':['batchAssignBugs'],
  'bug|confirmBug':['confirmBug'],
  'bug|batchConfirm':['batchConfirmBugs'],
  'bug|resolve':['resolveBug'],
  'bug|batchResolve':['batchResolveBugs'],
  'bug|activate':['activateBug'],
  'bug|batchActivate':['batchActivateBugs'],
  'bug|close':['closeBug'],
  'bug|batchClose':['batchCloseBugs'],
  'bug|confirmStoryChange':['confirmBugStoryChange'],
  'bug|linkBugs':['linkBugs'],
  'bug|delete':['deleteBug','deleteBugViaForm'],
  'bug|export':['exportBugs'],
  'bug|track':['getBugTrack'],
  'testtask|create':['createTestTask'],
  'testtask|edit':['updateTestTask'],
  'testtask|start':['startTestTask'],
  'testtask|activate':['activateTestTask'],
  'testtask|close':['closeTestTask'],
  'testtask|block':['blockTestTask'],
  'testtask|delete':['deleteTestTask'],
  'testtask|linkCase':['linkCaseToTestTask'],
  'testtask|unlinkCase':['unlinkCase'],
  'testtask|batchUnlinkCases':['batchUnlinkCases'],
  'testtask|runCase':['runCase'],
  'testtask|batchRun':['batchRunTestCases'],
  'testtask|batchAssign':['batchAssignTestTasks'],
  'testtask|importUnitResult':['importTestTaskUnitResult'],
  'story|create':['createStory'],
  'story|batchCreate':['batchCreateStories'],
  'story|edit':['updateStory'],
  'story|batchEdit':['batchEditStories'],
  'story|change':['changeStory'],
  'story|activate':['activateStory'],
  'story|review':['reviewStory'],
  'story|batchReview':['batchReviewStories'],
  'story|recall':['recallStory'],
  'story|submitReview':['submitStoryReview'],
  'story|close':['closeStory'],
  'story|batchClose':['batchCloseStories'],
  'story|batchChangeModule':['batchChangeStoryModule'],
  'story|batchChangePlan':['batchChangeStoryPlan'],
  'story|batchChangeBranch':['batchChangeStoryBranch'],
  'story|batchChangeStage':['batchChangeStoryStage'],
  'story|batchToTask':['batchToTaskStories'],
  'story|assignTo':['assignStory'],
  'story|batchAssignTo':['batchAssignStoriesTo'],
  'story|linkStory':['linkStoriesToStory'],
  'story|linkStories':['linkStoriesToStory'],
  'story|linkRequirements':['linkRequirements'],
  'story|processStoryChange':['processStoryChange'],
  'story|delete':['deleteStory'],
  'story|export':['exportStories'],
  'release|create':['createRelease'],
  'release|edit':['updateRelease'],
  'release|delete':['deleteRelease'],
  'release|linkStory':['linkStoriesToRelease'],
  'release|unlinkStory':['unlinkStoryFromRelease'],
  'release|batchUnlinkStory':['batchUnlinkStoriesFromRelease'],
  'release|linkBug':['linkBugsToRelease'],
  'release|unlinkBug':['unlinkBugFromRelease'],
  'release|batchUnlinkBug':['batchUnlinkBugsFromRelease'],
  'release|changeStatus':['changeReleaseStatus'],
  'release|notify':['notifyRelease'],
  'release|export':['exportRelease'],
  'todo|create':['createTodo'],
  'todo|batchCreate':['batchCreateTodos'],
  'todo|edit':['updateTodo'],
  'todo|batchEdit':['batchEditTodos'],
  'todo|start':['startTodo'],
  'todo|activate':['activateTodo'],
  'todo|close':['closeTodo'],
  'todo|assignTo':['assignTodo'],
  'todo|delete':['deleteTodo'],
  'todo|finish':['finishTodo'],
  'todo|batchFinish':['batchFinishTodos'],
  'todo|batchClose':['batchCloseTodos'],
  'todo|import2Today':['importTodosToToday'],
  'todo|export':['exportTodos'],
  'todo|createCycle':['createTodoCycle'],
};

// ---------- Helpers ----------
function getCliToolNames(repo) {
  const toolsDir = join(repo, 'src', 'tools');
  if (!existsSync(toolsDir)) return new Set();
  const files = readdirSync(toolsDir).filter((f) => f.endsWith('.ts'));
  if (files.length === 0) return new Set();

  // Concatenate all tool files, then walk server.tool(...) call sites in JS.
  // This mirrors the awk split (blocks separated by "===END===") and the
  // grep -oE "['"][a-z][a-zA-Z0-9_]+['"]" extraction (first string per block
  // is the tool name) without depending on shell quoting.
  let combined = '';
  for (const f of files) {
    combined += readFileSync(join(toolsDir, f), 'utf8') + '\n';
  }

  const names = new Set();
  // Match every server.tool( call site, then advance a tiny paren-balance walker
  // to find the matching closing paren — that's the block we care about.
  const callRe = /server\.tool\s*\(/g;
  const stringRe = /(['"`])([a-zA-Z][a-zA-Z0-9_]*)\1/g;
  let m;
  while (true) {
    m = callRe.exec(combined);
    if (m === null) break;
    let i = m.index + m[0].length;
    let depth = 1;
    let inStr = null;
    while (i < combined.length && depth > 0) {
      const ch = combined[i];
      if (inStr) {
        if (ch === '\\') { i += 2; continue; }
        if (ch === inStr) inStr = null;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0) break;
      i++;
    }
    const block = combined.slice(m.index, i + 1);
    // First string literal in the block is the tool name.
    stringRe.lastIndex = 0;
    const sm = stringRe.exec(block);
    if (sm) names.add(sm[2]);
  }
  return names;
}

function computeCoverage(cliSet) {
  const perModule = {};
  let totalCovered = 0;
  let totalEntries = 0;
  const allMissing = {};
  for (const mod of MODULES) {
    const entries = ENTRIES[mod] || [];
    let covered = 0;
    const missing = [];
    for (const e of entries) {
      const key = `${mod}|${e}`;
      const aliases = ALIAS[key] || [];
      const hit = aliases.some((name) => cliSet.has(name));
      if (hit) covered += 1;
      else missing.push(e);
    }
    perModule[mod] = {
      covered,
      total: entries.length,
      ratio: entries.length === 0 ? 0 : covered / entries.length,
      missing,
      entries,
    };
    totalCovered += covered;
    totalEntries += entries.length;
    allMissing[mod] = missing;
  }
  return {
    perModule,
    totalCovered,
    totalEntries,
    totalRatio: totalEntries === 0 ? 0 : totalCovered / totalEntries,
    allMissing,
  };
}

// ---------- Main ----------
function main() {
  const cliSet = getCliToolNames(REPO);
  const result = computeCoverage(cliSet);

  const payload = {
    total: cliSet.size,
    covered: result.totalCovered,
    entries: result.totalEntries,
    ratio: result.totalRatio,
    perModule: Object.fromEntries(
      Object.entries(result.perModule).map(([k, v]) => [k, {
        covered: v.covered,
        total: v.total,
        ratio: v.ratio,
        missing: v.missing,
      }])
    ),
    cliToolNames: [...cliSet].sort(),
    generatedAt: new Date().toISOString(),
  };

  if (wantJson) {
    const text = JSON.stringify(payload, null, 2);
    if (jsonOutPath) {
      writeFileSync(jsonOutPath, text);
    } else {
      process.stdout.write(text + '\n');
    }
    if (payload.ratio < 1) process.exitCode = 1;
    return;
  }

  if (wantMissing) {
    if (missingModule) {
      const m = result.perModule[missingModule];
      if (!m) {
        process.stderr.write(`Unknown module: ${missingModule}\n`);
        process.exit(2);
      }
      process.stdout.write(`${missingModule}: ${m.missing.join(', ')}\n`);
    } else {
      for (const mod of MODULES) {
        const m = result.perModule[mod];
        if (m.missing.length) {
          process.stdout.write(`${mod}: ${m.missing.join(', ')}\n`);
        }
      }
    }
    if (payload.ratio < 1) process.exitCode = 1;
    return;
  }

  // Default: human-readable summary.
  const lines = [];
  lines.push('=== zentao-cli vs zentao 18.5 控制器入口覆盖率 ===');
  lines.push(`CLI 工具总数: ${cliSet.size}`);
  lines.push('');
  lines.push('模块         覆盖  总数  比例');
  for (const mod of MODULES) {
    const m = result.perModule[mod];
    const pct = (m.ratio * 100).toFixed(0) + '%';
    lines.push(
      `${mod.padEnd(12)} ${String(m.covered).padStart(4)}  ${String(m.total).padStart(4)}  ${pct.padStart(4)}`
    );
  }
  lines.push(
    `${'合计'.padEnd(12)} ${String(result.totalCovered).padStart(4)}  ${String(result.totalEntries).padStart(4)}  ${(result.totalRatio * 100).toFixed(1)}%`
  );
  lines.push('');
  lines.push('=== 各模块缺失入口 ===');
  for (const mod of MODULES) {
    const m = result.perModule[mod];
    if (m.missing.length) {
      lines.push(`${mod}: ${m.missing.join(', ')}`);
    }
  }
  process.stdout.write(lines.join('\n') + '\n');

  if (payload.ratio < 1) process.exitCode = 1;
}

main();