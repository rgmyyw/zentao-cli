import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerTestTaskTools(server: CliRegistry): void {
  server.tool(
    'getTestTasks',
    {
      productId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().testtask.getTestTasks(input)),
    {
      costHint: 'low',
      nextBestTools: ['getTestTaskDetail', 'getProductTestCases', 'getProductBugs'],
    },
  );

  server.tool(
    'getTestTaskDetail',
    {
      testTaskId: z.number().int().positive(),
    },
    async ({ testTaskId }) => jsonResult(await getApi().testtask.getTestTaskDetail(testTaskId)),
    {
      costHint: 'low',
      nextBestTools: ['getTestTasks', 'getComments', 'getProductTestCases'],
    },
  );
}
