import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

const runActioned = async (action: string, confirm: boolean, params: Record<string, unknown>, fn: () => Promise<unknown>) => {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload: params });
  if (preview) return jsonResult(preview);
  return jsonResult(await fn());
};

export function registerBugTools(server: CliRegistry): void {
  server.tool(
    'getMyBugs',
    {
      productId: z.number().int().positive().optional().describe('可选。禅道产品 ID。不传时默认查询跨所有产品“指派给我的 Bug”；传入时只查该产品内我的 Bug。若用户问的是业务产品的线上 / 生产 / 客户反馈 / 售后反馈问题，不要直接把业务产品名当成这里的 productId。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      branch: z.string().optional(),
      order: z.string().optional(),
    },
    async (input) => jsonResult(await getApi().bug.getMyBugs(input)),
  );

  server.tool(
    'getProductBugs',
    {
      productId: z.number().int().positive().describe('禅道产品 ID。仅用于查询某个禅道产品下的 Bug。若用户问的是某业务产品的线上 Bug / 生产问题 / 客户反馈问题，先查固定禅道产品"市场和售后问题跟踪"，再按模块匹配真实业务产品，不要直接把业务产品名映射成这里的 productId。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: z.string().optional().default('all'),
      branch: z.string().optional(),
      order: z.string().optional(),
      search: z.string().optional().describe('可选。按禅道 REST v1 query 参数搜索 Bug 标题 / 关键字。'),
      module: z.string().optional().describe('可选。按模块名 / 模块别名 / 模块路径过滤 Bug，支持 YJ、yj、Yj 这类写法。'),
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
      resolution: z.enum(['fixed', 'bydesign', 'duplicate', 'external', 'notrepro', 'postponed', 'willnotfix']),
      resolvedBuild: z.string().optional(),
      resolvedDate: z.string().optional().describe('解决日期/时间，禅道 18.5 bugresolve 支持该字段'),
      assignedTo: z.string().optional(),
      comment: z.string().optional(),
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
      title: z.string(),
      project: z.number().int().positive().optional(),
      execution: z.number().int().positive().optional(),
      openedBuild: z.string().optional(),
      assignedTo: z.string().optional(),
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: z.string().optional(),
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: z.string().optional(),
      keywords: z.string().optional(),
      mailto: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...data }) => runActioned('createBug', confirm, data, () => getApi().bug.createBug(data)),
  );

  server.tool(
    'updateBug',
    {
      bugId: z.number().int().positive(),
      title: z.string().optional(),
      assignedTo: z.string().optional(),
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      resolution: z.string().optional(),
      resolvedBuild: z.string().optional(),
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: z.string().optional(),
      keywords: z.string().optional(),
      mailto: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...update }) => runActioned('updateBug', confirm, { bugId, update }, () => getApi().bug.updateBug(bugId, update)),
  );

  server.tool(
    'assignBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: z.string(),
      comment: z.string().optional(),
      mailto: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('assignBug', confirm, { bugId, data }, () => getApi().bug.assignBug(bugId, data)),
  );

  server.tool(
    'confirmBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: z.string().optional(),
      pri: z.number().optional(),
      type: z.string().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('confirmBug', confirm, { bugId, data }, () => getApi().bug.confirmBug(bugId, data)),
  );

  server.tool(
    'closeBug',
    {
      bugId: z.number().int().positive(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runActioned('closeBug', confirm, { bugId, data }, () => getApi().bug.closeBug(bugId, data)),
  );

  server.tool(
    'activateBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: z.string().optional(),
      comment: z.string().optional(),
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
