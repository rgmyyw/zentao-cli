import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import type { CreateBuildInput } from '../api/build.js';
import type { CloseTestTaskInput, CreateTestTaskInput, TestTaskActionInput, UpdateTestTaskInput } from '../api/testtask.js';
import type { ConfirmTestCaseLibcaseChangeInput, ConfirmTestCaseStoryChangeInput } from '../api/testcase.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { optionalTrimmedText, runWithPreview } from './shared.js';

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
    PO: optionalTrimmedText.describe('产品负责人禅道账号'),
    PM: optionalTrimmedText.describe('负责人禅道账号'),
    QD: optionalTrimmedText.describe('测试负责人禅道账号'),
    RD: optionalTrimmedText.describe('发布负责人禅道账号'),
    teamMembers: z.array(z.string().trim().min(1)).optional().describe('团队成员账号数组'),
    acl: optionalTrimmedText.describe('访问控制：private | open'),
    whitelist: z.array(z.string().trim().min(1)).optional().describe('白名单账号数组'),
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
}

export function registerTestTaskWriteTools(server: CliRegistry): void {
  server.tool('createTestTask', {
    project: z.number().int().positive().describe('所属项目 ID，实机验证发现当前实例创建测试单时必填'),
    productID: z.number().int().positive(),
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
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runWithPreview('createTestTask', confirm, payload, previewOrAssertWriteAllowed, () => getApi().testtask.createTestTask(payload as CreateTestTaskInput)));

  server.tool('updateTestTask', {
    testTaskId: z.number().int().positive(),
    project: z.number().int().positive().optional(),
    productID: z.number().int().positive().optional(),
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
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...update }) => runWithPreview('updateTestTask', confirm, { testTaskId, update }, previewOrAssertWriteAllowed, () => getApi().testtask.updateTestTask(testTaskId, update as UpdateTestTaskInput)));

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
}
