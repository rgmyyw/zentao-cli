import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import type { CreateBuildInput } from '../api/build.js';
import type { CloseTestTaskInput, CreateTestTaskInput, TestTaskActionInput, UpdateTestTaskInput } from '../api/testtask.js';
import type { ConfirmTestCaseLibcaseChangeInput, ConfirmTestCaseStoryChangeInput } from '../api/testcase.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { optionalTrimmedText, runWithPreview, jsonResult } from './shared.js';

function parseJsonArray(value: string, fieldName: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => item === null || typeof item !== 'object' || Array.isArray(item))) {
      throw new Error(`${fieldName} 必须是对象数组`);
    }
    return parsed as Array<Record<string, unknown>>;
  } catch (error) {
    if (error instanceof Error && error.message === `${fieldName} 必须是对象数组`) throw error;
    throw new Error(`${fieldName} 必须是合法 JSON 字符串`);
  }
}

export function registerExecutionWriteTools(server: CliRegistry): void {
  server.tool('updateExecution', {
    executionId: z.number().int().positive(),
    project: z.number().int().positive().optional().describe('所属项目 ID。禅道官方文档标为必填，建议从 getExecutionDetail 读回后原样传入'),
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional().describe('迭代代号，实机验证发现当前实例更新执行时通常必填'),
    desc: optionalTrimmedText,
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional().describe('可用工作日'),
    lifetime: optionalTrimmedText.describe('类型：short | long | ops'),
    status: optionalTrimmedText.describe('执行状态：wait | doing | suspended | closed。禅道 18.5 execution::edit entry 接受；需配合 startExecution / closeExecution / suspendExecution 等状态动作完成状态机'),
    PO: optionalTrimmedText.describe('产品负责人禅道账号'),
    PM: optionalTrimmedText.describe('负责人禅道账号'),
    QD: optionalTrimmedText.describe('测试负责人禅道账号'),
    RD: optionalTrimmedText.describe('发布负责人禅道账号'),
    teamMembers: z.array(z.string().trim().min(1)).optional().describe('团队成员账号数组'),
    acl: optionalTrimmedText.describe('访问控制：private | open'),
    whitelist: z.array(z.string().trim().min(1)).optional().describe('白名单账号数组'),
    uid: optionalTrimmedText.describe('附件上传会话 UID；先 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...update }) => runWithPreview('updateExecution', confirm, { executionId, update }, previewOrAssertWriteAllowed, () => getApi().execution.updateExecution(executionId, update)));

  server.tool('startExecution', {
    executionId: z.number().int().positive(),
    realBegan: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('startExecution', confirm, { executionId, payload }, previewOrAssertWriteAllowed, () => getApi().execution.startExecution(executionId, payload)));

  server.tool('closeExecution', {
    executionId: z.number().int().positive(),
    realEnd: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('closeExecution', confirm, { executionId, payload }, previewOrAssertWriteAllowed, () => getApi().execution.closeExecution(executionId, payload)));

  server.tool('suspendExecution', {
    executionId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('suspendExecution', confirm, { executionId, payload }, previewOrAssertWriteAllowed, () => getApi().execution.suspendExecution(executionId, payload)));

  server.tool('activateExecution', {
    executionId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('activateExecution', confirm, { executionId, payload }, previewOrAssertWriteAllowed, () => getApi().execution.activateExecution(executionId, payload)));

  server.tool('putoffExecution', {
    executionId: z.number().int().positive(),
    days: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('putoffExecution', confirm, { executionId, payload }, previewOrAssertWriteAllowed, () => getApi().execution.putoffExecution(executionId, payload as { days: number; comment?: string })));

  server.tool('computeCfd', {
    executionId: z.number().int().positive().describe('执行 ID，对应 18.5 execution/computeCFD 路径 executionID 段；执行后服务端 js::reload parent'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm }) => runWithPreview('computeCfd', confirm, { executionId }, previewOrAssertWriteAllowed, () => getApi().execution.computeCfd(executionId)));

  server.tool('linkStoriesToExecution', {
    executionId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要关联到执行的需求 ID 列表，对应 18.5 execution/linkStory 页面 stories[] 字段'),
    productId: z.number().int().positive().optional().describe('所属产品 ID。CLI 内部会编码为 products[storyId]=productId，逐条 story 关联'),
    branch: z.number().int().nonnegative().optional().describe('所属产品分支 ID。可选，未传时不写入 branch 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyIds, productId, branch, confirm }) => runWithPreview('linkStoriesToExecution', confirm, { executionId, storyIds, productId, branch }, previewOrAssertWriteAllowed, () => getApi().execution.linkStoriesToExecution({ executionId, storyIds, productId, branch })));

  server.tool('unlinkStoryFromExecution', {
    executionId: z.number().int().positive(),
    storyId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyId, confirm }) => runWithPreview('unlinkStoryFromExecution', confirm, { executionId, storyId }, previewOrAssertWriteAllowed, () => getApi().execution.unlinkStoryFromExecution(executionId, storyId)));

  server.tool('batchUnlinkStoriesFromExecution', {
    executionId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要从执行批量移除的需求 ID 列表，对应 18.5 execution/batchUnlinkStory 页面 storyIdList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyIds, confirm }) => runWithPreview('batchUnlinkStoriesFromExecution', confirm, { executionId, storyIds }, previewOrAssertWriteAllowed, () => getApi().execution.batchUnlinkStoriesFromExecution({ executionId, storyIds })));

  server.tool('batchChangeExecutionStatus', {
    executionIds: z.array(z.number().int().positive()).min(1).describe('要变更状态的执行 ID 列表，对应 18.5 execution/batchChangeStatus 页面 executionIdList[] 字段'),
    status: z.string().trim().min(1).describe('目标状态，18.5 执行状态枚举 wait/doing/suspended/closed，对应 PATH_INFO 必传 status 段'),
    projectId: z.number().int().nonnegative().optional().default(0).describe('所属项目 ID，PATH_INFO 必填。0 表示按执行所属项目推断'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionIds, status, projectId, confirm }) => runWithPreview('batchChangeExecutionStatus', confirm, { executionIds, status, projectId }, previewOrAssertWriteAllowed, () => getApi().execution.batchChangeExecutionStatus({ executionIds, status, projectId })));

  server.tool('unlinkMemberFromExecution', {
    executionId: z.number().int().positive(),
    userId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, userId, confirm }) => runWithPreview('unlinkMemberFromExecution', confirm, { executionId, userId }, previewOrAssertWriteAllowed, () => getApi().execution.unlinkMemberFromExecution(executionId, userId)));

  server.tool('deleteExecution', {
    executionId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm }) => runWithPreview('deleteExecution', confirm, { executionId }, previewOrAssertWriteAllowed, () => getApi().execution.deleteExecution(executionId)));

  server.tool('storyEstimate', {
    executionId: z.number().int().positive(),
    storyId: z.number().int().positive(),
    accounts: z.array(z.string().trim().min(1)).min(1).describe('要评估工时的成员账号数组，对应 18.5 story::saveEstimateInfo 页面 account[] 字段'),
    estimates: z.array(z.number().nonnegative()).describe('与 accounts 一一对应的评估工时数组，对应 estimate[] 字段'),
    average: z.number().nonnegative().describe('平均工时，对应 average 字段。saveEstimateInfo 不会自动算平均，必须由调用方传入'),
    round: z.number().int().nonnegative().optional().default(0).describe('第几轮评估，默认 0'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyId, accounts, estimates, average, round, confirm }) => runWithPreview('storyEstimate', confirm, { executionId, storyId, accounts, estimates, average, round }, previewOrAssertWriteAllowed, () => getApi().execution.storyEstimate({ executionId, storyId, accounts, estimates, average, round })));

  server.tool('addExecutionMember', {
    executionId: z.number().int().positive(),
    accounts: z.array(z.string().trim().min(1)).min(1).describe('要加入的成员账号数组。禅道 18.5 execution 模块无 addMember 控制器，真实写入走 manageMembers POST，对应 accounts[] 字段'),
    roles: z.array(z.string().trim().min(1)).optional().describe('对应 accounts 的角色数组（developer/tester/qa/po 等），与 accounts 一一对应，对应 roles[] 字段'),
    hours: z.array(z.string().trim().min(1)).optional().describe('对应 accounts 的每日可用工时数组，对应 hours[] 字段'),
    days: z.array(z.string().trim().min(1)).optional().describe('对应 accounts 的可用工作日数组，对应 days[] 字段'),
    limited: z.array(z.string().trim().min(1)).optional().describe('对应 accounts 的限制方式（yes/no，受限/不受限），与 accounts 一一对应，对应 limited[] 字段'),
    realnames: z.array(z.string().trim().min(1)).optional().describe('对应 accounts 的真实姓名数组'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('addExecutionMember', confirm, { executionId, ...payload }, previewOrAssertWriteAllowed, () => getApi().execution.addMember({ executionId, ...payload })));

  server.tool('linkStoryToExecutionSingle', {
    executionId: z.number().int().positive(),
    storyId: z.number().int().positive(),
    productId: z.number().int().positive().optional().describe('所属产品 ID，CLI 内部编码为 products[storyId]=productId'),
    branch: z.number().int().nonnegative().optional().describe('所属产品分支 ID'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyId, productId, branch, confirm }) => runWithPreview('linkStoryToExecutionSingle', confirm, { executionId, storyId, productId, branch }, previewOrAssertWriteAllowed, () => getApi().execution.linkStoryToExecutionSingle(executionId, storyId, productId, branch)));

  server.tool('importBugToExecution', {
    executionId: z.number().int().positive(),
    bugs: z.array(z.object({
      bugId: z.number().int().positive().describe('要导入的 Bug ID'),
      pri: z.number().int().min(0).describe('对应任务优先级，pri[bugId]'),
      estimate: z.number().nonnegative().describe('预计工时，estimate[bugId]'),
      estStarted: z.string().trim().optional().describe('计划开始日期，estStarted[bugId]'),
      deadline: z.string().trim().optional().describe('计划截止日期，deadline[bugId]'),
      assignedTo: z.string().trim().optional().describe('指派人，assignedTo[bugId]'),
    })).min(1).describe('要导入的 Bug 行数据数组，对应 18.5 execution/importBug 页面 import[bugId]/pri[bugId]/estimate[bugId]/estStarted[bugId]/deadline[bugId]/assignedTo[bugId] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, bugs, confirm }) => runWithPreview('importBugToExecution', confirm, { executionId, bugs }, previewOrAssertWriteAllowed, () => getApi().execution.importBugToExecution({ executionId, bugs })));

  server.tool('batchImportBugsToExecution', {
    executionId: z.number().int().positive().describe('禅道 18.5 execution 模块无 batchImportBug 控制器，确认执行时会明确报错'),
    bugIds: z.array(z.number().int().positive()).min(1).describe('要导入的 Bug ID 列表，CLI 不会真正提交'),
    productId: z.number().int().positive().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, bugIds, productId, confirm }) => runWithPreview('batchImportBugsToExecution', confirm, { executionId, bugIds, productId }, previewOrAssertWriteAllowed, () => getApi().execution.batchImportBugsToExecution({ executionId, bugIds, productId })));

  server.tool('addExecutionWhitelist', {
    executionId: z.number().int().positive().describe('禅道 18.5 execution::addWhitelist 只 fetch 页面，真实写入在 personnel::addWhitelist，确认执行时会明确报错'),
    deptId: z.number().int().nonnegative().optional().default(0),
    copyId: z.number().int().positive().optional(),
    accounts: z.array(z.string().trim().min(1)).min(1),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runWithPreview('addExecutionWhitelist', confirm, { executionId, ...payload }, previewOrAssertWriteAllowed, () => getApi().execution.addWhitelist({ executionId, ...payload })));

  server.tool('unbindExecutionWhitelist', {
    id: z.number().int().positive().describe('白名单关系 ID'),
    confirm: z.boolean().optional().default(false),
  }, async ({ id, confirm }) => runWithPreview('unbindExecutionWhitelist', confirm, { id }, previewOrAssertWriteAllowed, () => getApi().execution.unbindWhitelist(id)));

  server.tool('fixFirstExecution', {
    executionId: z.number().int().positive(),
    estimate: z.number().nonnegative().describe('必填数字 estimate，对应 18.5 execution::fixFirst 模型 is_numeric 校验；未传会在 API 层显式报错'),
    withLeft: z.enum(['yes', 'no']).optional().describe('withLeft=yes 时用 estimate 覆盖 left，否则保留原 burn.left'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, estimate, withLeft, confirm }) => runWithPreview('fixFirstExecution', confirm, { executionId, estimate, withLeft }, previewOrAssertWriteAllowed, () => getApi().execution.fixFirst({ executionId, estimate, withLeft })));

  server.tool('updateExecutionOrder', {
    executionIds: z.array(z.number().int().positive()).min(1).describe('要排序的执行 ID 数组。CLI 内部用逗号串提交到 18.5 execution::updateOrder 页面 executions 字段，对应 18.5 executionModel 期望格式'),
    orderBy: z.string().trim().min(1).default('order_asc').describe('排序方式，必须包含 order 字串（如 order_asc / order_desc），对应 18.5 execution::updateOrder 页面 orderBy 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionIds, orderBy, confirm }) => runWithPreview('updateExecutionOrder', confirm, { executionIds, orderBy }, previewOrAssertWriteAllowed, () => getApi().execution.updateOrder({ executionIds, orderBy })));

  server.tool('storySortExecution', {
    executionId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要排序的需求 ID 数组。CLI 内部用逗号串提交到 18.5 execution::storySort 页面 storys 字段'),
    orderBy: z.string().trim().min(1).default('order_asc').describe('排序方式，对应 18.5 execution::storySort 页面 orderBy 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, storyIds, orderBy, confirm }) => runWithPreview('storySortExecution', confirm, { executionId, storyIds, orderBy }, previewOrAssertWriteAllowed, () => getApi().execution.storySort({ executionId, storyIds, orderBy })));

  server.tool('createExecution', {
    project: z.number().int().positive().describe('所属项目 ID，对齐禅道 18.5 execution/create 路径 {projectID} 段'),
    name: z.string().trim().min(1),
    begin: z.string().trim().min(1).describe('格式 YYYY-MM-DD，必填'),
    end: z.string().trim().min(1).describe('格式 YYYY-MM-DD，必填'),
    code: optionalTrimmedText.describe('迭代代号，启用时必填'),
    days: z.number().int().positive().optional(),
    percent: z.number().optional().describe('进度百分比 0-100，禅道 18.5 execution::create 接受；新建时通常使用 0'),
    lifetime: optionalTrimmedText,
    desc: optionalTrimmedText,
    PO: optionalTrimmedText,
    PM: optionalTrimmedText,
    QD: optionalTrimmedText,
    RD: optionalTrimmedText,
    acl: optionalTrimmedText,
    whitelist: z.array(z.string().trim().min(1)).optional(),
    teamMembers: z.array(z.string().trim().min(1)).optional(),
    products: z.array(z.number().int().positive()).optional(),
    plans: z.array(z.number().int().positive()).optional(),
    parent: z.number().int().positive().optional().describe('父执行 ID，对齐禅道 18.5 execution::create 的 parent 字段，用于创建嵌套执行（如迭代里再分阶段）'),
    uid: optionalTrimmedText.describe('附件上传会话 UID；先 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createExecution', confirm, payload, previewOrAssertWriteAllowed, () => getApi().execution.createExecution(payload)));

  server.tool('batchEditExecutions', {
    executionIds: z.array(z.number().int().positive()).min(1).describe('要批量编辑的执行 ID 列表，对应 18.5 execution/batchEdit 页面 executionIDList[] 字段'),
    names: z.record(z.string().trim().min(1), z.string().trim().min(1)).optional().describe('executionID -> 新名称的映射对象，对应 18.5 executionModel::batchUpdate 期望的 names[<id>] 字段；存在该字段即触发批量保存分支'),
    dayses: z.record(z.string().trim().min(1), z.number().int().positive()).optional().describe('executionID -> 新可用工日的映射对象，对应 dayses[<id>] 字段（注意不是 days）'),
    descs: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新描述的映射对象，对应 descs[<id>] 字段（注意不是 desc）'),
    begins: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新开始日期的映射对象，对应 begins[<id>] 字段'),
    ends: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新结束日期的映射对象，对应 ends[<id>] 字段'),
    lifetimes: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新 lifetime 的映射对象，对应 lifetimes[<id>] 字段'),
    POs: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新产品负责人禅道账号的映射对象，对应 POs[<id>] 字段'),
    PMs: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新负责人禅道账号的映射对象，对应 PMs[<id>] 字段'),
    QDs: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新测试负责人禅道账号的映射对象，对应 QDs[<id>] 字段'),
    RDs: z.record(z.string().trim().min(1), z.string()).optional().describe('executionID -> 新发布负责人禅道账号的映射对象，对应 RDs[<id>] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionIds, names, dayses, descs, begins, ends, lifetimes, POs, PMs, QDs, RDs, confirm }) => runWithPreview('batchEditExecutions', confirm, { executionIds, names, dayses, descs, begins, ends, lifetimes, POs, PMs, QDs, RDs }, previewOrAssertWriteAllowed, () => getApi().execution.batchEditExecutions({ executionIds, names, dayses, descs, begins, ends, lifetimes, POs, PMs, QDs, RDs })));
}

export function registerBuildWriteTools(server: CliRegistry): void {
  server.tool('createBuild', {
    project: z.number().int().positive(),
    execution: z.number().int().positive(),
    product: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    name: z.string().trim().min(1),
    builder: z.string().trim().min(1),
    date: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    desc: optionalTrimmedText,
    scmPath: optionalTrimmedText,
    filePath: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createBuild', confirm, payload, previewOrAssertWriteAllowed, () => getApi().build.createBuild(payload as CreateBuildInput)));

  server.tool('updateBuild', {
    buildId: z.number().int().positive(),
    execution: z.number().int().positive().optional(),
    product: z.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    builder: z.string().trim().min(1).optional(),
    date: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    desc: optionalTrimmedText,
    scmPath: optionalTrimmedText,
    filePath: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, confirm, ...update }) => runWithPreview('updateBuild', confirm, { buildId, update }, previewOrAssertWriteAllowed, () => getApi().build.updateBuild(buildId, update)));

  server.tool('linkStoriesToBuild', {
    buildId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要关联到构建的需求 ID 列表，对应 18.5 build/linkStory 页面 stories[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, storyIds, confirm }) => runWithPreview('linkStoriesToBuild', confirm, { buildId, storyIds }, previewOrAssertWriteAllowed, () => getApi().build.linkStoriesToBuild(buildId, { storyIds })));

  server.tool('unlinkStoryFromBuild', {
    buildId: z.number().int().positive(),
    storyId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, storyId, confirm }) => runWithPreview('unlinkStoryFromBuild', confirm, { buildId, storyId }, previewOrAssertWriteAllowed, () => getApi().build.unlinkStoryFromBuild(buildId, storyId)));

  server.tool('batchUnlinkStoriesFromBuild', {
    buildId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要从构建批量移除的需求 ID 列表，对应 18.5 build/batchUnlinkStory 页面 unlinkStories[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, storyIds, confirm }) => runWithPreview('batchUnlinkStoriesFromBuild', confirm, { buildId, storyIds }, previewOrAssertWriteAllowed, () => getApi().build.batchUnlinkStoriesFromBuild(buildId, { storyIds })));

  server.tool('linkBugsToBuild', {
    buildId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).describe('要关联到构建的 Bug ID 列表，对应 18.5 build/linkBug 页面 bugs[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, bugIds, confirm }) => runWithPreview('linkBugsToBuild', confirm, { buildId, bugIds }, previewOrAssertWriteAllowed, () => getApi().build.linkBugsToBuild(buildId, { bugIds })));

  server.tool('unlinkBugFromBuild', {
    buildId: z.number().int().positive(),
    bugId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, bugId, confirm }) => runWithPreview('unlinkBugFromBuild', confirm, { buildId, bugId }, previewOrAssertWriteAllowed, () => getApi().build.unlinkBugFromBuild(buildId, bugId)));

  server.tool('batchUnlinkBugsFromBuild', {
    buildId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).describe('要从构建批量移除的 Bug ID 列表，对应 18.5 build/batchUnlinkBug 页面 unlinkBugs[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, bugIds, confirm }) => runWithPreview('batchUnlinkBugsFromBuild', confirm, { buildId, bugIds }, previewOrAssertWriteAllowed, () => getApi().build.batchUnlinkBugsFromBuild(buildId, { bugIds })));
}

const testCaseStepSchema = z.object({
  desc: z.string().trim().min(1),
  expect: z.string().trim().min(1),
  type: z.enum(['step', 'item', 'group']).optional().describe('禅道 18.5 支持 step/item/group，默认 step'),
});

export function registerTestCaseWriteTools(server: CliRegistry): void {
  server.tool('createTestCase', {
    productId: z.number().int().positive(),
    title: z.string().trim().min(1),
    type: z.string().trim().min(1),
    steps: z.array(testCaseStepSchema).min(1),
    branch: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    story: z.number().int().nonnegative().optional(),
    stage: optionalTrimmedText,
    precondition: optionalTrimmedText,
    script: optionalTrimmedText,
    pri: z.number().int().optional(),
    keywords: optionalTrimmedText.describe('禅道 18.5 REST v1 创建用例不接收该字段，传入会被忽略'),
    project: z.number().int().positive().optional().describe('禅道 18.5 REST v1 创建产品用例不绑定项目，传入会被忽略'),
    execution: z.number().int().positive().optional().describe('禅道 18.5 REST v1 创建产品用例不绑定执行，传入会被忽略'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, confirm, ...payload }) => runWithPreview('createTestCase', confirm, { productId, ...payload }, previewOrAssertWriteAllowed, () => getApi().testcase.createTestCase(productId, payload)));

  server.tool('updateTestCase', {
    testCaseId: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    story: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
    stage: optionalTrimmedText,
    precondition: optionalTrimmedText,
    script: optionalTrimmedText,
    pri: z.number().int().optional(),
    steps: z.array(testCaseStepSchema).min(1).optional(),
    keywords: optionalTrimmedText.describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    project: z.number().int().positive().optional().describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    execution: z.number().int().positive().optional().describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testCaseId, confirm, ...update }) => runWithPreview('updateTestCase', confirm, { testCaseId, update }, previewOrAssertWriteAllowed, () => getApi().testcase.updateTestCase(testCaseId, update)));

  server.tool('confirmTestCaseStoryChange', {
    caseId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, confirm }) => runWithPreview('confirmTestCaseStoryChange', confirm, { caseId }, previewOrAssertWriteAllowed, () => getApi().testcase.confirmStoryChange(caseId as ConfirmTestCaseStoryChangeInput['caseId'])));

  server.tool('confirmTestCaseLibcaseChange', {
    caseId: z.number().int().positive(),
    libcaseId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, libcaseId, confirm }) => runWithPreview('confirmTestCaseLibcaseChange', confirm, { caseId, libcaseId }, previewOrAssertWriteAllowed, () => getApi().testcase.confirmLibcaseChange({ caseId, libcaseId } as ConfirmTestCaseLibcaseChangeInput)));

  server.tool('ignoreTestCaseLibcaseChange', {
    caseId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, confirm }) => runWithPreview('ignoreTestCaseLibcaseChange', confirm, { caseId }, previewOrAssertWriteAllowed, () => getApi().testcase.ignoreLibcaseChange(caseId)));

  server.tool('batchConfirmTestCaseStoryChange', {
    productId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要批量确认需求变更的测试用例 ID 列表，对应 18.5 testcase/batchConfirmStoryChange 页面 caseIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, caseIds, confirm }) => runWithPreview('batchConfirmTestCaseStoryChange', confirm, { productId, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.batchConfirmStoryChange(productId, { caseIds })));

  server.tool('linkBugToTestCase', {
    caseId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).describe('要关联的 Bug ID 列表，对应 18.5 testcase/linkBugs 页面 bugIdList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, bugIds, confirm }) => runWithPreview('linkBugToTestCase', confirm, { caseId, bugIds }, previewOrAssertWriteAllowed, () => getApi().testcase.linkBugToTestCase(caseId, bugIds)));

  server.tool('unlinkBugFromTestCase', {
    caseId: z.number().int().positive(),
    bugId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, bugId, confirm }) => runWithPreview('unlinkBugFromTestCase', confirm, { caseId, bugId }, previewOrAssertWriteAllowed, () => getApi().testcase.unlinkBugFromTestCase(caseId, bugId)));

  server.tool('linkCasesToTestCase', {
    caseId: z.number().int().positive(),
    linkedCaseIds: z.array(z.number().int().positive()).min(1).describe('要关联的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, linkedCaseIds, confirm }) => runWithPreview('linkCasesToTestCase', confirm, { caseId, linkedCaseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.linkCases(caseId, linkedCaseIds)));

  server.tool('createBugFromTestCase', {
    caseId: z.number().int().positive(),
    productId: z.number().int().positive().optional(),
    branch: z.number().int().nonnegative().optional(),
    build: z.number().int().positive().optional(),
    title: optionalTrimmedText,
    pri: z.number().int().optional(),
    severity: z.number().int().optional(),
    type: optionalTrimmedText,
    steps: optionalTrimmedText,
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, confirm, ...payload }) => runWithPreview('createBugFromTestCase', confirm, { caseId, ...payload }, previewOrAssertWriteAllowed, () => getApi().testcase.createBugFromTestCase({ caseId, ...payload })));

  server.tool('batchCreateTestCases', {
    productId: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    moduleId: z.number().int().nonnegative().optional(),
    storyId: z.number().int().nonnegative().optional(),
    cases: z.array(testCaseStepSchema.partial({ desc: true, expect: true }).extend({
      title: z.string().trim().min(1),
      type: z.string().trim().min(1),
      pri: z.number().int().optional(),
      stage: z.union([z.string().trim(), z.array(z.string().trim().min(1)).min(1)]).optional(),
      precondition: z.string().trim().optional(),
      keywords: z.string().trim().optional(),
      module: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
      story: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
      branch: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
      scene: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
      color: z.string().optional(),
      needReview: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
      steps: z.array(testCaseStepSchema).optional(),
    })).min(1).describe('要批量创建的测试用例数组。每项对应 18.5 testcase/batchCreate 页面的一行，支持 title/type/pri/stage/module/story/branch/scene/color/needReview/steps'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, confirm, ...payload }) => runWithPreview('batchCreateTestCases', confirm, { productId, ...payload }, previewOrAssertWriteAllowed, () => getApi().testcase.batchCreateTestCases({ productId, ...payload })));

  server.tool('batchEditTestCases', {
    productId: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    type: optionalTrimmedText,
    moduleId: z.number().int().nonnegative().optional(),
    cases: z.string().trim().min(1).describe('测试用例行 JSON 数组。每项至少含 caseId/title/type/pri/module/story，对应 18.5 testcase/batchEdit 页面 caseIDList[] 与 title[id]/types[id]/pris[id]/modules[id]/story[id] 等字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, branch, type, moduleId, cases, confirm }) => {
    const parsedCases = parseJsonArray(cases, 'cases');
    return runWithPreview('batchEditTestCases', confirm, { productId, branch, type, moduleId, cases: parsedCases }, previewOrAssertWriteAllowed, () => getApi().testcase.batchEditTestCases({ productId, branch, type, moduleId, cases: parsedCases as never }));
  });

  server.tool('batchDeleteTestCases', {
    productId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要批量删除的测试用例 ID 列表，对应 18.5 testcase/batchDelete 页面 caseIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, caseIds, confirm }) => runWithPreview('batchDeleteTestCases', confirm, { productId, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.batchDeleteTestCases({ productId, caseIds })));

  server.tool('batchChangeTestCaseBranch', {
    branchId: z.number().int().nonnegative(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要切换分支的测试用例 ID 列表，对应 18.5 testcase/batchChangeBranch 页面 caseIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ branchId, caseIds, confirm }) => runWithPreview('batchChangeTestCaseBranch', confirm, { branchId, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.batchChangeTestCaseBranch({ productId: 0, branchId, caseIds })));

  server.tool('batchChangeTestCaseModule', {
    moduleId: z.number().int().nonnegative(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要切换模块的测试用例 ID 列表，对应 18.5 testcase/batchChangeModule 页面 caseIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ moduleId, caseIds, confirm }) => runWithPreview('batchChangeTestCaseModule', confirm, { moduleId, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.batchChangeTestCaseModule({ productId: 0, moduleId, caseIds })));

  server.tool('batchChangeTestCaseType', {
    type: z.string().trim().min(1).describe('目标用例类型，对应 18.5 testcase/batchCaseTypeChange 页面 type 字段'),
    result: z.string().trim().min(1).describe('目标用例类型，对应 18.5 testcase/batchCaseTypeChange 路径 result 段'),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要批量变更类型的测试用例 ID 列表'),
    confirm: z.boolean().optional().default(false),
  }, async ({ type, result, caseIds, confirm }) => runWithPreview('batchChangeTestCaseType', confirm, { type, result, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.batchChangeTestCaseType({ productId: 0, type, result, caseIds })));

  server.tool('deleteTestCase', {
    caseId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, confirm }) => runWithPreview('deleteTestCase', confirm, { caseId }, previewOrAssertWriteAllowed, () => getApi().testcase.deleteTestCase(caseId)));

  server.tool('exportTestCases', {
    productId: z.number().int().positive(),
    orderBy: optionalTrimmedText,
    taskId: z.number().int().positive().optional(),
  }, async ({ productId, orderBy, taskId }) => jsonResult(await getApi().testcase.exportTestCases({ productId, orderBy, taskId })));

  server.tool('exportTestCaseTemplate', {
    productId: z.number().int().positive(),
  }, async ({ productId }) => jsonResult(await getApi().testcase.exportTestCaseTemplate(productId)));

  server.tool('importTestCases', {
    productId: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    file: optionalTrimmedText,
  }, async ({ productId, branch, file }) => jsonResult(await getApi().testcase.importTestCases({ productId, branch, file })));

  server.tool('importTestCasesFromLib', {
    productId: z.number().int().positive(),
    libId: z.number().int().positive().describe('目标产品库 ID，对应 18.5 testcase/importFromLib 页面 libID 字段'),
    branch: z.number().int().nonnegative().optional(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要从库导入的用例 ID 列表，对应 fromCaseIDList[] 字段'),
  }, async ({ productId, libId, branch, caseIds }) => jsonResult(await getApi().testcase.importTestCasesFromLib({ productId, libId, branch, caseIds })));

  server.tool('importTestCaseToLib', {
    caseId: z.number().int().positive(),
    libId: z.number().int().positive().describe('目标产品库 ID，对应 18.5 testcase/importToLib 路径 libID 段'),
  }, async ({ caseId, libId }) => jsonResult(await getApi().testcase.importTestCaseToLib(caseId, libId)));

  server.tool('reviewTestCase', {
    caseId: z.number().int().positive(),
    result: z.enum(['pass', 'fail']),
    reason: optionalTrimmedText,
  }, async ({ caseId, result, reason }) => jsonResult(await getApi().testcase.reviewTestCase(caseId, result, reason)));

  server.tool('batchReviewTestCases', {
    productId: z.number().int().positive(),
    result: z.enum(['pass', 'fail']),
    reason: optionalTrimmedText,
    caseIds: z.array(z.number().int().positive()).min(1).describe('要批量评审的测试用例 ID 列表，对应 18.5 testcase/batchReview 页面 caseIdList[] 字段'),
  }, async ({ productId, result, reason, caseIds }) => jsonResult(await getApi().testcase.batchReviewTestCases({ productId, result, reason, caseIds })));

  server.tool('confirmTestCaseChange', {
    caseId: z.number().int().positive().describe('测试用例 ID，对应 18.5 testcase/confirmChange 路径'),
    taskId: z.number().int().positive().optional().describe('可选。任务 ID，对应路径 ?taskID='),
    from: optionalTrimmedText.describe('可选。来源页面，对应路径 ?from='),
  }, async ({ caseId, taskId, from }) => jsonResult(await getApi().testcase.confirmTestCaseChange({ caseId, taskId, from })));

  server.tool('editTestCaseViaForm', {
    caseId: z.number().int().positive().describe('测试用例 ID，对应 18.5 testcase/edit 路径 {id} 段'),
    title: optionalTrimmedText,
    type: optionalTrimmedText,
    pri: z.number().int().optional(),
    stage: optionalTrimmedText,
    precondition: optionalTrimmedText,
    keywords: optionalTrimmedText,
    moduleId: z.number().int().nonnegative().optional(),
    storyId: z.number().int().nonnegative().optional(),
    steps: z.array(testCaseStepSchema).optional(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ caseId, confirm, ...update }) => runWithPreview('editTestCaseViaForm', confirm, { caseId, update }, previewOrAssertWriteAllowed, () => getApi().testcase.editTestCaseViaForm({ caseId, ...update })));

  server.tool('linkCasesToBug', {
    bugId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要关联到 Bug 的用例 ID 列表，对应 18.5 testcase/linkCases 页面 caseIdList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ bugId, caseIds, confirm }) => runWithPreview('linkCasesToBug', confirm, { bugId, caseIds }, previewOrAssertWriteAllowed, () => getApi().testcase.linkCasesToBug({ bugId, caseIds })));

  server.tool('batchAssignTestCases', {
    productId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).describe('要批量分派的测试用例 ID 列表。禅道 18.5 无 testcase/batchAssignTo 控制器'),
    assignedTo: z.string().trim().min(1).describe('目标负责人账号。确认执行时会明确报 testcase/batchAssignTo 不支持'),
    lastEditedDate: optionalTrimmedText.describe('兼容保留字段，禅道 18.5 下不会真正提交'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, caseIds, assignedTo, lastEditedDate, confirm }) => runWithPreview('batchAssignTestCases', confirm, { productId, caseIds, assignedTo, lastEditedDate }, previewOrAssertWriteAllowed, () => getApi().testcase.batchAssignTestCases({ productId, caseIds, assignedTo, lastEditedDate })));
}

export function registerTestTaskWriteTools(server: CliRegistry): void {
  server.tool('createTestTask', {
    project: z.number().int().positive().describe('所属项目 ID，实机验证发现当前实例创建测试单时必填'),
    product: z.number().int().positive().optional().describe('所属产品 ID，对应 18.5 testtasksEntry::post 的 product 字段；与 productID 二选一，优先使用 product'),
    productID: z.number().int().positive().optional().describe('产品 ID 别名；与 product 等价；优先使用 product'),
    name: z.string().trim().min(1),
    build: z.union([z.number().int().positive(), z.string().trim().min(1)]),
    begin: z.string().trim().min(1).describe('格式 YYYY-MM-DD'),
    end: z.string().trim().min(1).describe('格式 YYYY-MM-DD'),
    execution: z.number().int().positive().optional(),
    type: z.array(z.string().trim().min(1)).optional(),
    owner: optionalTrimmedText,
    status: optionalTrimmedText,
    pri: z.number().int().optional(),
    desc: optionalTrimmedText,
    uid: optionalTrimmedText.describe('附件上传会话 UID；先 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => {
    const { productID, ...rest } = payload;
    if (productID !== undefined && rest.product === undefined) (rest as Record<string, unknown>).product = productID;
    return runWithPreview('createTestTask', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.createTestTask({ ...rest, product: rest.product ?? productID } as unknown as CreateTestTaskInput));
  });

  server.tool('updateTestTask', {
    testTaskId: z.number().int().positive(),
    project: z.number().int().positive().optional(),
    product: z.number().int().positive().optional().describe('产品 ID；与 productID 二选一'),
    productID: z.number().int().positive().optional().describe('产品 ID 别名'),
    name: z.string().trim().min(1).optional(),
    build: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
    execution: z.number().int().positive().optional(),
    type: z.array(z.string().trim().min(1)).optional(),
    owner: optionalTrimmedText,
    status: optionalTrimmedText,
    pri: z.number().int().optional(),
    begin: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    end: optionalTrimmedText.describe('格式 YYYY-MM-DD'),
    desc: optionalTrimmedText,
    uid: optionalTrimmedText.describe('附件上传会话 UID；先 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...update }) => {
    const { productID, ...rest } = update;
    if (productID !== undefined && rest.product === undefined) (rest as Record<string, unknown>).product = productID;
    const payload = { ...rest, product: rest.product ?? productID };
    return runWithPreview('updateTestTask', confirm, { testTaskId, update: payload }, previewOrAssertWriteAllowed, () => getApi().testtask.updateTestTask(testTaskId, payload as unknown as UpdateTestTaskInput));
  });

  server.tool('startTestTask', {
    testTaskId: z.number().int().positive(),
    comment: optionalTrimmedText.describe('开始备注。对应 18.5 testtask/start 页面 comment 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...payload }) => runWithPreview('startTestTask', confirm, { testTaskId, payload }, previewOrAssertWriteAllowed, () => getApi().testtask.startTestTask(testTaskId, payload as TestTaskActionInput)));

  server.tool('activateTestTask', {
    testTaskId: z.number().int().positive(),
    comment: optionalTrimmedText.describe('激活备注。对应 18.5 testtask/activate 页面 comment 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...payload }) => runWithPreview('activateTestTask', confirm, { testTaskId, payload }, previewOrAssertWriteAllowed, () => getApi().testtask.activateTestTask(testTaskId, payload as TestTaskActionInput)));

  server.tool('blockTestTask', {
    testTaskId: z.number().int().positive(),
    comment: optionalTrimmedText.describe('阻塞备注。对应 18.5 testtask/block 页面 comment 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...payload }) => runWithPreview('blockTestTask', confirm, { testTaskId, payload }, previewOrAssertWriteAllowed, () => getApi().testtask.blockTestTask(testTaskId, payload as TestTaskActionInput)));

  server.tool('closeTestTask', {
    testTaskId: z.number().int().positive(),
    realFinishedDate: optionalTrimmedText.describe('实际完成时间。对应 18.5 testtask/close 页面 realFinishedDate 字段'),
    mailto: z.array(z.string().trim().min(1)).optional().describe('抄送账号数组。对应 18.5 testtask/close 页面 mailto[] 字段'),
    comment: optionalTrimmedText.describe('关闭备注。对应 18.5 testtask/close 页面 comment 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...payload }) => runWithPreview('closeTestTask', confirm, { testTaskId, payload }, previewOrAssertWriteAllowed, () => getApi().testtask.closeTestTask(testTaskId, payload as CloseTestTaskInput)));

  server.tool('deleteTestTask', {
    testTaskId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm }) => runWithPreview('deleteTestTask', confirm, { testTaskId }, previewOrAssertWriteAllowed, () => getApi().testtask.deleteTestTask(testTaskId)));

  server.tool('unlinkCase', {
    rowID: z.number().int().positive().describe('测试单用例执行记录（testrun）的 ID，对应 18.5 testtask/unlinkCase 页面 rowID 参数'),
    confirm: z.enum(['yes', 'no']).optional().default('yes'),
    draft: z.boolean().optional().default(false),
  }, async ({ rowID, confirm, draft }) => runWithPreview('unlinkCase', draft, { rowID, confirm }, previewOrAssertWriteAllowed, () => getApi().testtask.unlinkCase(rowID, confirm)));

  server.tool('batchUnlinkCases', {
    testTaskId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).max(200).describe('要从测试单批量移除的用例 ID 列表，对应 18.5 testtask/batchUnlinkCases 页面 caseIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, caseIds, confirm }) => {
    const payload = { testTaskId, payload: { caseIds } };
    return runWithPreview('batchUnlinkCases', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.batchUnlinkCases({ taskID: testTaskId, caseIDList: caseIds }));
  });

  server.tool('runCase', {
    runID: z.number().int().positive().optional().describe('testrun 记录 ID；与 caseID 二选一'),
    caseId: z.number().int().positive().optional().describe('用例 ID；runID 缺省时必填'),
    version: z.number().int().optional(),
    confirm: z.string().optional().describe("'yes' 强制执行自动用例脚本"),
    result: z.string().trim().min(1).describe("测试结果，如 'pass' / 'fail' / 'blocked' / 'skip'"),
    stepDesc: optionalTrimmedText,
    realStory: z.number().int().optional(),
    expect: optionalTrimmedText,
    actual: optionalTrimmedText,
    comment: optionalTrimmedText,
    assignedTo: optionalTrimmedText,
    draft: z.boolean().optional().default(false),
  }, async ({ runID, caseId, version, confirm, result, stepDesc, realStory, expect, actual, comment, assignedTo, draft }) => {
    const payload = { runID, caseId, version, confirm, result, stepDesc, realStory, expect, actual, comment, assignedTo };
    return runWithPreview('runCase', draft, payload, previewOrAssertWriteAllowed, () => getApi().testtask.runCase({ runID, caseID: caseId, version, confirm, result, stepDesc, realStory, expect, actual, comment, assignedTo }));
  });

  server.tool('batchRunTestCases', {
    productId: z.number().int().positive(),
    from: z.enum(['testcase', 'testtask']).optional().default('testtask').describe("'testcase' 从用例库批量录入；'testtask' 从测试单批量录入"),
    testTaskId: z.number().int().positive().optional().describe('当 from=testtask 时必填'),
    confirm: z.string().optional(),
    caseIds: z.array(z.number().int().positive()).min(1).max(200).describe('要批量录入的用例 ID 列表，对应 18.5 testtask/batchRun 页面 caseIDList[] 字段'),
    results: z.record(z.string(), z.object({
      result: z.string().trim().min(1),
      stepDesc: z.string().optional(),
      expect: z.string().optional(),
      actual: z.string().optional(),
      comment: z.string().optional(),
      assignedTo: z.string().optional(),
    })).describe('每条用例的结果明细，key 为 caseID，对应 18.5 testtask/batchRun 页面 results[caseID][...] 字段'),
    draft: z.boolean().optional().default(false),
  }, async ({ productId, from, testTaskId, confirm, caseIds, results, draft }) => {
    const payload = { productId, from, testTaskId, confirm, caseIds, results };
    return runWithPreview('batchRunTestCases', draft, payload, previewOrAssertWriteAllowed, () => getApi().testtask.batchRunTestCases({ productID: productId, from, taskID: testTaskId, confirm, caseIDList: caseIds, results }));
  });

  server.tool('batchAssignTestTasks', {
    testTaskId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).max(200).describe('要指派的用例 ID 列表，对应 18.5 testtask/batchAssign 页面 caseIDList[] 字段'),
    assignedTo: z.string().trim().min(1).describe('被指派人账号，对应 18.5 testtask/batchAssign 页面 assignedTo 字段'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, caseIds, assignedTo, comment, confirm }) => {
    const payload = { testTaskId, caseIds, assignedTo, comment };
    return runWithPreview('batchAssignTestTasks', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.batchAssignTestTasks({ taskID: testTaskId, caseIDList: caseIds, assignedTo, comment }));
  });

  server.tool('importTestTaskUnitResult', {
    productId: z.number().int().positive(),
    execution: z.number().int().optional(),
    build: z.number().int().optional(),
    owner: optionalTrimmedText,
    members: z.array(z.string().trim().min(1)).optional().describe('测试单参与人账号列表，对应 18.5 testtask/importUnitResult 页面 members[] 字段'),
    frame: optionalTrimmedText,
    projectId: z.number().int().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, execution, build, owner, members, frame, projectId, confirm }) => {
    const payload = { productId, execution, build, owner, members, frame, projectId };
    return runWithPreview('importTestTaskUnitResult', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.importTestTaskUnitResult({ productID: productId, execution, build, owner, members, frame, projectID: projectId }));
  });

  server.tool('linkCaseToTestTask', {
    testTaskId: z.number().int().positive(),
    caseIds: z.array(z.number().int().positive()).min(1).max(200).describe('要关联到测试单的用例 ID 列表，对应 18.5 testtask/linkCase 页面 caseIDList[] 字段'),
    type: z.string().trim().min(1).optional().default('all').describe('关联范围类型，对应 18.5 testtask/linkCase 页面 type 参数'),
    param: z.number().int().optional().default(0).describe('关联范围参数（如 moduleID），对应 18.5 testtask/linkCase 页面 param 参数'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, caseIds, type, param, confirm }) => {
    const payload = { testTaskId, caseIds, type, param };
    return runWithPreview('linkCaseToTestTask', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.linkCase({ taskID: testTaskId, type, param, caseIDList: caseIds }));
  });
}
