import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

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
      status: z.string().optional().describe('可选，按禅道接口支持的状态过滤'),
    },
    async ({ executionId, page, limit, status }) => jsonResult(await getApi().execution.getExecutionBugs(executionId, { page, limit, status })),
  );

  server.tool(
    'getExecutionDailyBugStats',
    {
      executionId: z.number().int().positive(),
      iterationName: z.string().optional().describe('输出报告里的迭代名称，例如 1.2.3迭代。'),
      date: z.string().optional().describe('统计日期，默认今天。支持 today/今天/yesterday/昨天/YYYY-MM-DD。'),
    },
    async ({ executionId, iterationName, date }) => jsonResult(await getApi().execution.getExecutionDailyBugStats(executionId, { iterationName, date })),
  );
}
