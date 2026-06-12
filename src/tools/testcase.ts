import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

export function registerTestCaseTools(server: CliRegistry): void {
  server.tool(
    'getProductTestCases',
    {
      productId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: optionalTrimmedText,
      moduleId: z.number().int().positive().optional(),
    },
    async (input) => jsonResult(await getApi().testcase.getProductTestCases(input)),
  );

  server.tool(
    'getTestCaseDetail',
    {
      testCaseId: z.number().int().positive(),
    },
    async ({ testCaseId }) => jsonResult(await getApi().testcase.getTestCaseDetail(testCaseId)),
  );
}
