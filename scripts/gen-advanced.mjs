// scripts/gen-advanced.mjs
// 按场景分组生成 reference/<scene>-advanced.md 兜底文档
// 涵盖 -advanced.md 专属命令 + 各主文档缺失的命令
import { readFile, writeFile } from 'node:fs/promises';

const cli = JSON.parse(await readFile('/tmp/commands.json', 'utf8'));
const byName = new Map(cli.map((c) => [c.name, c]));

// 每个 -advanced 文档包含的命令名
const advancedGroups = {
  'bug-advanced.md': {
    title: 'Bug 高级操作',
    blurb: 'Bug 批量修改、状态变更、删除、关联等低频 / 批量操作。日常主链路见 `bug.md`。',
    commands: [
      'okBug',
      'confirmBugStoryChange',
      'deleteBug',
      'deleteBugViaForm',
      'batchCreateBugs',
      'batchEditBugs',
      'linkBugs',
      'exportBugs',
      'batchChangeBugBranch',
      'batchChangeBugModule',
      'batchChangeBugPlan',
      'batchAssignBugs',
      'batchConfirmBugs',
      'batchResolveBugs',
      'batchCloseBugs',
      'batchActivateBugs',
    ],
  },
  'task-advanced.md': {
    title: '任务高级操作',
    blurb: '任务批量、状态变更、删除、工时调整等低频操作。日常主链路见 `task.md`。',
    commands: [
      'startTask',
      'pauseTask',
      'restartTask',
      'closeTask',
      'activateTask',
      'assignTask',
      'deleteTask',
      'batchFinishTasks',
      'batchCancelTasks',
      'batchCloseTasks',
      'batchChangeTaskBranch',
      'batchChangeTaskModule',
      'batchChangeTaskPlan',
      'batchAssignTasksTo',
      'batchActivateTasks',
      'batchChangeTaskStory',
      'batchCreateTasks',
      'batchEditTasks',
      'importTaskToLib',
      'exportTasks',
      'editTaskTeam',
      'batchToTaskStories',
    ],
  },
  'story-advanced.md': {
    title: '需求高级操作',
    blurb: '需求批量、评审、关闭、阶段变更等低频操作。日常主链路见 `story.md`。',
    commands: [
      'createStory',
      'batchCreateStories',
      'batchEditStories',
      'deleteStory',
      'exportStories',
      'assignStory',
      'activateStory',
      'reviewStory',
      'linkStoriesToStory',
      'linkRequirements',
      'unlinkStoryFromStory',
      'batchReviewStories',
      'batchChangeStoryModule',
      'batchChangeStoryPlan',
      'batchChangeStoryBranch',
      'batchChangeStoryStage',
      'batchAssignStoriesTo',
    ],
  },
  'execution-advanced.md': {
    title: '执行 / 迭代高级操作',
    blurb: '执行批量、状态变更、成员、看板、链接等低频 / 管理员操作。日常主链路见 `execution.md`。',
    commands: [
      'updateExecution',
      'startExecution',
      'closeExecution',
      'suspendExecution',
      'activateExecution',
      'putoffExecution',
      'computeCfd',
      'computeExecutionBurn',
      'confirmExecutionStoryChange',
      'createExecution',
      'batchEditExecutions',
      'batchChangeExecutionStatus',
      'deleteExecution',
      'getExecutionAll',
      'getExecutionTrack',
      'getExecutionManageMembers',
      'getExecutionSnapshot',
      'getExecutionKanban',
      'getExecutionTaskKanban',
      'getExecutionStoryKanban',
      'getExecutionStoryTasks',
      'getExecutionExecutionKanban',
      'linkStoriesToExecution',
      'linkStoryToExecutionSingle',
      'unlinkStoryFromExecution',
      'batchUnlinkStoriesFromExecution',
      'unlinkMemberFromExecution',
      'addExecutionMember',
      'importBugToExecution',
      'batchImportBugsToExecution',
      'addExecutionWhitelist',
      'unbindExecutionWhitelist',
      'storyEstimate',
      'fixFirstExecution',
      'updateExecutionOrder',
      'storySortExecution',
    ],
  },
  'product-advanced.md': {
    title: '产品高级操作',
    blurb: '产品批量、状态变更、白名单、动态、路线图等低频 / 管理员操作。日常主链路见 `product.md`。',
    commands: [
      'createProduct',
      'editProduct',
      'batchEditProducts',
      'closeProduct',
      'deleteProduct',
      'addProductWhitelist',
      'unbindProductWhitelist',
      'setProductOrder',
      'manageProductLine',
      'getProductAll',
      'getProductTrack',
      'getProductWhitelist',
      'getProductDashboard',
      'getProductRoadmap',
      'getProductDynamic',
      'exportProducts',
    ],
  },
  'project-advanced.md': {
    title: '项目高级操作',
    blurb: '项目批量、状态变更、成员、分组、白名单等低频 / 管理员操作。日常主链路见 `project.md`。',
    commands: [
      'createProject',
      'editProject',
      'batchEditProjects',
      'startProject',
      'suspendProject',
      'activateProject',
      'closeProject',
      'deleteProject',
      'unlinkProjectMember',
      'addProjectWhitelist',
      'unbindProjectWhitelist',
      'setProjectOrder',
      'getProjectTeam',
      'getProjectGroup',
      'getProjectManageMembers',
      'getProjectWhitelist',
      'getProjectDynamic',
      'getProjectLinkedProducts',
      'createProjectGroup',
      'editProjectGroup',
      'copyProjectGroup',
    ],
  },
  'build-advanced.md': {
    title: '构建高级操作',
    blurb: '构建通知、指派、删除等低频操作。日常主链路见 `build.md`。',
    commands: [
      'notifyBuildBug',
      'assignBuildTo',
      'deleteBuild',
    ],
  },
  'testcase-advanced.md': {
    title: '测试用例高级操作',
    blurb: '测试用例批量、导入、导出、用例库、关联等低频操作。日常主链路见 `testcase.md`。',
    commands: [
      'confirmTestCaseStoryChange',
      'confirmTestCaseLibcaseChange',
      'ignoreTestCaseLibcaseChange',
      'batchConfirmTestCaseStoryChange',
      'confirmTestCaseChange',
      'reviewTestCase',
      'batchReviewTestCases',
      'batchAssignTestCases',
      'linkBugToTestCase',
      'unlinkBugFromTestCase',
      'linkCasesToTestCase',
      'linkCasesToBug',
      'createBugFromTestCase',
      'batchCreateTestCases',
      'batchEditTestCases',
      'batchDeleteTestCases',
      'batchChangeTestCaseBranch',
      'batchChangeTestCaseModule',
      'batchChangeTestCaseType',
      'deleteTestCase',
      'editTestCaseViaForm',
      'updateTestCaseOrder',
      'exportTestCases',
      'exportTestCaseTemplate',
      'importTestCases',
      'importTestCasesFromLib',
      'importTestCaseToLib',
    ],
  },
  'testtask-advanced.md': {
    title: '测试单高级操作',
    blurb: '测试单批量、用例运行、单位结果导入等低频操作。日常主链路见 `testtask.md`。',
    commands: [
      'activateTestTask',
      'blockTestTask',
      'deleteTestTask',
      'unlinkCase',
      'batchUnlinkCases',
      'runCase',
      'batchRunTestCases',
      'batchAssignTestTasks',
      'importTestTaskUnitResult',
      'linkCaseToTestTask',
    ],
  },
};

for (const [filename, group] of Object.entries(advancedGroups)) {
  const lines = [];
  lines.push(`# ${group.title}`);
  lines.push('');
  lines.push(group.blurb);
  lines.push('');
  lines.push('## 命令列表');
  lines.push('');
  lines.push('| 命令 | 简介 |');
  lines.push('| --- | --- |');
  for (const name of group.commands) {
    const c = byName.get(name);
    if (!c) {
      lines.push(`| \`${name}\` | ⚠️ CLI 中未注册（可能已废弃）|`);
      continue;
    }
    const desc = (c.description || '-').replace(/\|/g, '\\|').slice(0, 160);
    lines.push(`| \`${name}\` | ${desc} |`);
  }
  lines.push('');
  lines.push('> 写操作必须传 `--confirm true`。完整参数以 `zentao help <command>` 输出为准。');
  await writeFile(`.agents/skills/zentao-cli/reference/${filename}`, lines.join('\n'));
  console.log(`生成 ${filename}: ${group.commands.length} 个命令`);
}

// 新增独立小文档
const smallDocs = {
  'program.md': {
    title: '项目集 Program',
    blurb: '项目集（Program）/ 项目群 创建、状态变更、成员、干系人、白名单、排序等。',
    commands: [
      'getPrograms',
      'getProgramDetail',
      'createProgram',
      'editProgram',
      'startProgram',
      'activateProgram',
      'suspendProgram',
      'closeProgram',
      'deleteProgram',
      'createProgramStakeholder',
      'unlinkProgramStakeholder',
      'batchUnlinkProgramStakeholders',
      'unbindProgramWhitelist',
      'setProgramOrder',
      'getProgramAll',
      'getProgramTrack',
      'getProgramStakeholders',
    ],
  },
  'comment.md': {
    title: '评论',
    blurb: '查询 / 添加对象评论。禅道 18.5 的 `getComments` 在执行 / 项目对象上会 fallback 到对象 `actions`，结果会标注 `source`。',
    commands: ['getComments', 'addComment'],
  },
  'context.md': {
    title: '开发上下文',
    blurb: '聚合一个需求或 Bug 的开发上下文：自身信息、关联 Bug、用例、任务、动态摘要。仅支持 `entityType=story|bug`，不接收 `executionId`。',
    commands: ['getDevelopmentContext', 'getDevelopmentContextSnapshot'],
  },
  'relation.md': {
    title: '关联查询',
    blurb: '从需求查 Bug、从 Bug 反查需求；用于跨对象链路分析。',
    commands: ['getStoryRelatedBugs', 'getBugRelatedStory'],
  },
  'search.md': {
    title: '搜索',
    blurb: '需求搜索：按产品内关键词搜，或按产品名兜底搜。',
    commands: ['searchStories', 'searchStoriesByProductName'],
  },
  'resource-analysis.md': {
    title: '资源分析',
    blurb: 'Bug / 任务资源占用与分布分析。',
    commands: ['analyzeBugResources', 'analyzeTaskResources'],
  },
  'url-intent.md': {
    title: 'URL 解析',
    blurb: '把禅道旧版页面 URL / 页面文件路径解析成对象类型 + ID，再调对应 CLI 命令。',
    commands: ['parseUrlIntent'],
  },
};

for (const [filename, group] of Object.entries(smallDocs)) {
  const lines = [];
  lines.push(`# ${group.title}`);
  lines.push('');
  lines.push(group.blurb);
  lines.push('');
  lines.push('## 命令列表');
  lines.push('');
  lines.push('| 命令 | 简介 |');
  lines.push('| --- | --- |');
  for (const name of group.commands) {
    const c = byName.get(name);
    if (!c) {
      lines.push(`| \`${name}\` | ⚠️ CLI 中未注册（可能已废弃）|`);
      continue;
    }
    const desc = (c.description || '-').replace(/\|/g, '\\|').slice(0, 160);
    lines.push(`| \`${name}\` | ${desc} |`);
  }
  lines.push('');
  await writeFile(`.agents/skills/zentao-cli/reference/${filename}`, lines.join('\n'));
  console.log(`生成 ${filename}: ${group.commands.length} 个命令`);
}
