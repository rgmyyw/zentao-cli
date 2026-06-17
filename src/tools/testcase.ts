import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';

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
    {
      costHint: 'low',
      nextBestTools: ['getTestCaseDetail', 'getTestTasks', 'getProductStories'],
    },
  );

  server.tool(
    'getTestCaseDetail',
    {
      testCaseId: z.number().int().positive(),
    },
    async ({ testCaseId }) => jsonResult(await getApi().testcase.getTestCaseDetail(testCaseId)),
    {
      costHint: 'low',
      nextBestTools: ['getProductTestCases', 'getComments', 'getBugSnapshot'],
    },
  );

  server.tool(
    'updateTestCaseOrder',
    {
      scenes: z.array(z.number().int().positive()).min(1).describe('拖拽排序后的场景/用例 ID 顺序，对应 18.5 testcase/updateOrder 页面 scenes 字段'),
      orderBy: z.string().trim().optional().default('sort_desc').describe('排序字段，默认 sort_desc；18.5 页面固定传该值'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ scenes, orderBy, confirm }) => runWithPreview('updateTestCaseOrder', confirm, { scenes, orderBy }, previewOrAssertWriteAllowed, () => getApi().testcase.updateTestCaseOrder({ scenes, orderBy })),
  );
}
