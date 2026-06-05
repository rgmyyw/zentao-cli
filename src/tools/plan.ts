import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerPlanTools(server: CliRegistry): void {
  server.tool('getProductPlans', {
    productId: z.number().int().positive(),
    branch: z.string().optional(),
    status: z.string().optional(),
    query: z.string().optional().describe('禅道 18.5 REST v1 支持的计划搜索关键字'),
    order: z.string().optional().describe('排序字段，例如 id_desc'),
  }, async (input) => jsonResult(await getApi().plan.getProductPlans(input)));

  server.tool('getPlanDetail', { planId: z.number().int().positive() }, async ({ planId }) => jsonResult(await getApi().plan.getPlanDetail(planId)));
}
