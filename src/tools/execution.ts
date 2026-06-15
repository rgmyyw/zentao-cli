import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, runWithPreview } from './shared.js';

const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

export function registerExecutionTools(server: CliRegistry): void {
  server.tool(
    'getExecutionDetail',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionDetail(executionId)),
  );

  server.tool(
    'getExecutionDynamic',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionDynamic(executionId)),
  );

  server.tool(
    'getProjectExecutions',
    {
      projectId: z.number().int().positive(),
    },
    async ({ projectId }) => jsonResult(await getApi().execution.getProjectExecutions(projectId)),
  );

  server.tool(
    'getExecutionBuilds',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionBuilds(executionId)),
  );

  server.tool(
    'getExecutionBugs',
    {
      executionId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: optionalTrimmedText.describe('可选，按禅道接口支持的状态过滤'),
      search: optionalTrimmedText.describe('可选。客户端按 Bug 标题 / 关键字 / 复现步骤 / 模块路径过滤。'),
      module: optionalTrimmedText.describe('可选。按执行 Bug 的模块名 / 模块别名 / 模块路径过滤。仅用于已明确要查某个执行 / 迭代下 Bug 的场景。'),
      moduleId: z.number().int().positive().optional().describe('可选。按执行 Bug 的模块 ID 过滤。'),
    },
    async ({ executionId, page, limit, status, search, module, moduleId }) => jsonResult(await getApi().execution.getExecutionBugs(executionId, { page, limit, status, search, module, moduleId })),
  );

  server.tool(
    'getExecutionDailyBugStats',
    {
      executionId: z.number().int().positive(),
      iterationName: optionalTrimmedText.describe('输出报告里的迭代名称，例如 1.2.3迭代。'),
      date: optionalTrimmedText.describe('统计日期，默认今天。支持 today/今天/yesterday/昨天/YYYY-MM-DD。'),
    },
    async ({ executionId, iterationName, date }) => jsonResult(await getApi().execution.getExecutionDailyBugStats(executionId, { iterationName, date })),
  );

  server.tool(
    'confirmExecutionStoryChange',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/confirmStoryChange 页面按钮'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ executionId, confirm }) => runWithPreview('confirmExecutionStoryChange', confirm, { executionId }, previewOrAssertWriteAllowed, () => getApi().execution.confirmStoryChange(executionId)),
  );

  server.tool(
    'computeExecutionBurn',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/computeBurn 页面按钮'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ executionId, confirm }) => runWithPreview('computeExecutionBurn', confirm, { executionId }, previewOrAssertWriteAllowed, () => getApi().execution.computeBurn(executionId)),
  );
}
