import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import type { CreateBuildInput } from '../api/build.js';
import type { CreateTestTaskInput, UpdateTestTaskInput } from '../api/testtask.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

async function runPreviewed(action: string, confirm: boolean | undefined, payload: unknown, runner: () => Promise<unknown>) {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload });
  if (preview) return jsonResult(preview);
  return jsonResult(await runner());
}

export function registerExecutionWriteTools(server: CliRegistry): void {
  server.tool('updateExecution', {
    executionId: z.number().int().positive(),
    project: z.number().int().positive().optional().describe('所属项目 ID。禅道官方文档标为必填，建议从 getExecutionDetail 读回后原样传入'),
    name: z.string().optional(),
    code: z.string().optional().describe('迭代代号，实机验证发现当前实例更新执行时通常必填'),
    desc: z.string().optional(),
    begin: z.string().optional().describe('格式 YYYY-MM-DD'),
    end: z.string().optional().describe('格式 YYYY-MM-DD'),
    days: z.number().int().positive().optional().describe('可用工作日'),
    lifetime: z.string().optional().describe('类型：short | long | ops'),
    PO: z.string().optional().describe('产品负责人禅道账号'),
    PM: z.string().optional().describe('负责人禅道账号'),
    QD: z.string().optional().describe('测试负责人禅道账号'),
    RD: z.string().optional().describe('发布负责人禅道账号'),
    teamMembers: z.array(z.string()).optional().describe('团队成员账号数组'),
    acl: z.string().optional().describe('访问控制：private | open'),
    whitelist: z.array(z.string()).optional().describe('白名单账号数组'),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...update }) => runPreviewed('updateExecution', confirm, { executionId, update }, () => getApi().execution.updateExecution(executionId, update)));

  server.tool('startExecution', {
    executionId: z.number().int().positive(),
    realBegan: z.string().optional().describe('格式 YYYY-MM-DD'),
    comment: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runPreviewed('startExecution', confirm, { executionId, payload }, () => getApi().execution.startExecution(executionId, payload)));

  server.tool('closeExecution', {
    executionId: z.number().int().positive(),
    realEnd: z.string().optional().describe('格式 YYYY-MM-DD'),
    comment: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runPreviewed('closeExecution', confirm, { executionId, payload }, () => getApi().execution.closeExecution(executionId, payload)));

  server.tool('suspendExecution', {
    executionId: z.number().int().positive(),
    comment: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runPreviewed('suspendExecution', confirm, { executionId, payload }, () => getApi().execution.suspendExecution(executionId, payload)));

  server.tool('activateExecution', {
    executionId: z.number().int().positive(),
    comment: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runPreviewed('activateExecution', confirm, { executionId, payload }, () => getApi().execution.activateExecution(executionId, payload)));

  server.tool('putoffExecution', {
    executionId: z.number().int().positive(),
    days: z.number().int().positive(),
    comment: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ executionId, confirm, ...payload }) => runPreviewed('putoffExecution', confirm, { executionId, payload }, () => getApi().execution.putoffExecution(executionId, payload as { days: number; comment?: string })));
}

export function registerBuildWriteTools(server: CliRegistry): void {
  server.tool('createBuild', {
    project: z.number().int().positive(),
    execution: z.number().int().positive(),
    product: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    name: z.string().min(1),
    builder: z.string().min(1),
    date: z.string().optional().describe('格式 YYYY-MM-DD'),
    desc: z.string().optional(),
    scmPath: z.string().optional(),
    filePath: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runPreviewed('createBuild', confirm, payload, () => getApi().build.createBuild(payload as CreateBuildInput)));

  server.tool('updateBuild', {
    buildId: z.number().int().positive(),
    execution: z.number().int().positive().optional(),
    product: z.number().int().positive().optional(),
    name: z.string().optional(),
    builder: z.string().optional(),
    date: z.string().optional().describe('格式 YYYY-MM-DD'),
    desc: z.string().optional(),
    scmPath: z.string().optional(),
    filePath: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ buildId, confirm, ...update }) => runPreviewed('updateBuild', confirm, { buildId, update }, () => getApi().build.updateBuild(buildId, update)));
}

const testCaseStepSchema = z.object({
  desc: z.string().min(1),
  expect: z.string().min(1),
  type: z.enum(['step', 'item', 'group']).optional().describe('禅道 18.5 支持 step/item/group，默认 step'),
});

export function registerTestCaseWriteTools(server: CliRegistry): void {
  server.tool('createTestCase', {
    productId: z.number().int().positive(),
    title: z.string().min(1),
    type: z.string().min(1),
    steps: z.array(testCaseStepSchema).min(1),
    branch: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    story: z.number().int().nonnegative().optional(),
    stage: z.string().optional(),
    precondition: z.string().optional(),
    script: z.string().optional(),
    pri: z.number().int().optional(),
    keywords: z.string().optional().describe('禅道 18.5 REST v1 创建用例不接收该字段，传入会被忽略'),
    project: z.number().int().positive().optional().describe('禅道 18.5 REST v1 创建产品用例不绑定项目，传入会被忽略'),
    execution: z.number().int().positive().optional().describe('禅道 18.5 REST v1 创建产品用例不绑定执行，传入会被忽略'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, confirm, ...payload }) => runPreviewed('createTestCase', confirm, { productId, ...payload }, () => getApi().testcase.createTestCase(productId, payload)));

  server.tool('updateTestCase', {
    testCaseId: z.number().int().positive(),
    branch: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    story: z.number().int().nonnegative().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    stage: z.string().optional(),
    precondition: z.string().optional(),
    script: z.string().optional(),
    pri: z.number().int().optional(),
    steps: z.array(testCaseStepSchema).min(1).optional(),
    keywords: z.string().optional().describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    project: z.number().int().positive().optional().describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    execution: z.number().int().positive().optional().describe('禅道 18.5 REST v1 更新用例不接收该字段，传入会被忽略'),
    confirm: z.boolean().optional().default(false),
  }, async ({ testCaseId, confirm, ...update }) => runPreviewed('updateTestCase', confirm, { testCaseId, update }, () => getApi().testcase.updateTestCase(testCaseId, update)));
}

export function registerTestTaskWriteTools(server: CliRegistry): void {
  server.tool('createTestTask', {
    project: z.number().int().positive().describe('所属项目 ID，实机验证发现当前实例创建测试单时必填'),
    productID: z.number().int().positive(),
    name: z.string().min(1),
    build: z.union([z.number().int().positive(), z.string().min(1)]),
    begin: z.string().min(1).describe('格式 YYYY-MM-DD'),
    end: z.string().min(1).describe('格式 YYYY-MM-DD'),
    execution: z.number().int().positive().optional(),
    type: z.array(z.string()).optional(),
    owner: z.string().optional(),
    status: z.string().optional(),
    pri: z.number().int().optional(),
    desc: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => runPreviewed('createTestTask', confirm, payload, () => getApi().testtask.createTestTask(payload as CreateTestTaskInput)));

  server.tool('updateTestTask', {
    testTaskId: z.number().int().positive(),
    project: z.number().int().positive().optional(),
    productID: z.number().int().positive().optional(),
    name: z.string().optional(),
    build: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
    execution: z.number().int().positive().optional(),
    type: z.array(z.string()).optional(),
    owner: z.string().optional(),
    status: z.string().optional(),
    pri: z.number().int().optional(),
    begin: z.string().optional().describe('格式 YYYY-MM-DD'),
    end: z.string().optional().describe('格式 YYYY-MM-DD'),
    desc: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ testTaskId, confirm, ...update }) => runPreviewed('updateTestTask', confirm, { testTaskId, update }, () => getApi().testtask.updateTestTask(testTaskId, update as UpdateTestTaskInput)));
}
