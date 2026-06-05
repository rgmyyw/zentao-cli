import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

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
      productId: z.number().int().positive().describe('禅道产品 ID。仅用于查询某个禅道产品下的 Bug。若用户问的是某业务产品的线上 Bug / 生产问题 / 客户反馈问题，先查固定禅道产品“市场和售后问题跟踪”，再按模块匹配真实业务产品，不要直接把业务产品名映射成这里的 productId。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: z.string().optional().default('all'),
      branch: z.string().optional(),
      order: z.string().optional(),
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
      const payload = { bugId, resolution };
      const preview = previewOrAssertWriteAllowed({ action: 'resolveBug', confirm, payload });
      if (preview) return jsonResult(preview);
      return jsonResult(await getApi().bug.resolveBug(bugId, resolution));
    },
  );
}
