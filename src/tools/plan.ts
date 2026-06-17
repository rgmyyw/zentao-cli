import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText } from './shared.js';
import { runWithPreview } from './shared.js';

export function registerPlanTools(server: CliRegistry): void {
  server.tool('getProductPlans', {
    productId: z.number().int().positive(),
    branch: optionalTrimmedText,
    status: optionalTrimmedText,
    query: optionalTrimmedText.describe('禅道 18.5 REST v1 支持的计划搜索关键字'),
    order: optionalTrimmedText.describe('排序字段，例如 id_desc'),
  }, async (input) => jsonResult(await getApi().plan.getProductPlans(input)), { costHint: 'low', nextBestTools: ['getPlanDetail', 'getProductStories', 'getProductBugs'] });

  server.tool('getPlanDetail', { planId: z.number().int().positive() }, async ({ planId }) => jsonResult(await getApi().plan.getPlanDetail(planId)), { costHint: 'low', nextBestTools: ['getProductPlans', 'getProductStories', 'getProductBugs'] });

  server.tool('startPlan', {
    planId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, confirm, ...payload }) => runWithPreview('startPlan', confirm, { planId, payload }, previewOrAssertWriteAllowed, () => getApi().plan.startPlan(planId, payload)));

  server.tool('finishPlan', {
    planId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, confirm, ...payload }) => runWithPreview('finishPlan', confirm, { planId, payload }, previewOrAssertWriteAllowed, () => getApi().plan.finishPlan(planId, payload)));

  server.tool('activatePlan', {
    planId: z.number().int().positive(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, confirm, ...payload }) => runWithPreview('activatePlan', confirm, { planId, payload }, previewOrAssertWriteAllowed, () => getApi().plan.activatePlan(planId, payload)));

  server.tool('closePlan', {
    planId: z.number().int().positive(),
    closedReason: z.string().trim().min(1).describe('关闭原因。18.5 页面默认候选通常为 done/cancel'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, confirm, ...payload }) => runWithPreview('closePlan', confirm, { planId, payload }, previewOrAssertWriteAllowed, () => getApi().plan.closePlan(planId, payload)));
}
