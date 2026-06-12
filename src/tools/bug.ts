import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

const runActioned = async (action: string, confirm: boolean, params: Record<string, unknown>, fn: () => Promise<unknown>) => {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload: params });
  if (preview) return jsonResult(preview);
  return jsonResult(await fn());
};

export function registerBugTools(server: CliRegistry): void {
  server.tool(
    'getMyBugs',
    {
      productId: z.number().int().positive().optional().describe('可选。禅道产品 ID。不传时默认查询跨所有产品“指派给我的 Bug”；传入时只查该产品内我的 Bug。若用户问线上 / 生产 / 客户反馈 / 售后反馈问题，先判断来源：市场 / 售后 / 客户反馈查“市场和售后问题跟踪”，测试 / 开发自发现查“测试”，不要直接把业务产品名当成这里的 productId。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      branch: optionalTrimmedText,
      order: optionalTrimmedText,
    },
    async (input) => jsonResult(await getApi().bug.getMyBugs(input)),
  );

  server.tool(
    'getProductBugs',
    {
      productId: z.number().int().positive().describe('禅道产品 ID。仅用于查询某个禅道产品下的 Bug。若用户问的是外部线上 / 生产 / 客户反馈问题，先查固定禅道产品"市场和售后问题跟踪"，再按模块匹配真实业务产品；若明确是测试或开发在线上发现并记录在“测试”下的问题，应先定位禅道产品"测试"，再按模块过滤。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: optionalTrimmedText.default('all'),
      branch: optionalTrimmedText,
      order: optionalTrimmedText,
      search: optionalTrimmedText.describe('可选。客户端按 Bug 标题 / 关键字 / 复现步骤 / 模块路径过滤。'),
      module: optionalTrimmedText.describe('可选。按产品 Bug 的模块名 / 模块别名 / 模块路径过滤，支持 YJ、yj、Yj 这类写法。外部线上问题通常用于“市场和售后问题跟踪”产品；测试或开发自发现问题通常用于“测试”产品下的模块。'),
      moduleId: z.number().int().positive().optional().describe('可选。按模块 ID 过滤 Bug。用于查询特定模块下的问题。'),
    },
    async (input) => jsonResult(await getApi().bug.getProductBugs(input)),
  );

  server.tool(
    'getBugDetail',
    {
      bugId: z.number().int().positive(),
    },
    async ({ bugId }) => jsonResult(await getApi().bug.getBugDetail(bugId)),
  );

  server.tool(
    'resolveBug',
    {
      bugId: z.number().int().positive(),
      resolution: z.enum(['fixed', 'bydesign', 'duplicate', 'external', 'notrepro', 'postponed', 'willnotfix', 'tostory']),
      resolvedBuild: optionalTrimmedText,
      resolvedDate: optionalTrimmedText.describe('解决日期/时间，禅道 18.5 bugresolve 支持该字段'),
      assignedTo: optionalTrimmedText,
      comment: optionalTrimmedText,
      duplicateBug: z.number().int().positive().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...resolution }) => {
      return runActioned('resolveBug', confirm, { bugId, resolution }, () => getApi().bug.resolveBug(bugId, resolution));
    },
  );

  server.tool(
    'createBug',
    {
      product: z.number().int().positive(),
      title: z.string().trim().min(1),
      project: z.number().int().positive().optional(),
      execution: z.number().int().positive().optional(),
      openedBuild: optionalTrimmedText,
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: optionalTrimmedText,
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: optionalTrimmedText,
      keywords: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...data }) => runActioned('createBug', confirm, data, () => getApi().bug.createBug(data)),
  );

  server.tool(
    'updateBug',
    {
      bugId: z.number().int().positive(),
      title: z.string().trim().min(1).optional(),
      project: z.number().int().positive().optional().describe('可选。所属项目 ID。跨项目调整 Bug 到指定执行时通常需要和 execution 一起传；如果用户只知道 executionId，可先运行 `zentao getExecutionDetail --executionId <id>` 取返回里的 project / projectId，再回填到这里。'),
      execution: z.number().int().positive().optional().describe('可选。目标执行 ID。用于把 Bug 关联/移动到指定执行。若服务端同时要求 project，请先用 `zentao getExecutionDetail --executionId <id>` 查出 projectId，再与 project 一起传。'),
      plan: z.number().int().nonnegative().optional().describe('可选。所属计划 ID。需要补回 Bug 计划时可传；传 `0` 可清空计划。'),
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: optionalTrimmedText,
      status: optionalTrimmedText,
      resolution: optionalTrimmedText,
      openedBuild: optionalTrimmedText,
      resolvedBuild: optionalTrimmedText,
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: optionalTrimmedText,
      keywords: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...update }) => runActioned('updateBug', confirm, { bugId, update }, () => getApi().bug.updateBug(bugId, update)),
  );

  server.tool(
    'assignBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: z.string().trim().min(1),
      comment: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('assignBug', confirm, { bugId, data }, () => getApi().bug.assignBug(bugId, data)),
  );

  server.tool(
    'okBug',
    {
      bugId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('okBug', confirm, { bugId, data }, () => getApi().bug.okBug(bugId, data)),
  );

  server.tool(
    'confirmBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      type: optionalTrimmedText,
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('confirmBug', confirm, { bugId, data }, () => getApi().bug.confirmBug(bugId, data)),
  );

  server.tool(
    'closeBug',
    {
      bugId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('closeBug', confirm, { bugId, data }, () => getApi().bug.closeBug(bugId, data)),
  );

  server.tool(
    'activateBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('activateBug', confirm, { bugId, data }, () => getApi().bug.activateBug(bugId, data)),
  );

  server.tool(
    'deleteBug',
    {
      bugId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm }) => runActioned('deleteBug', confirm, { bugId }, () => getApi().bug.deleteBug(bugId)),
  );
}
