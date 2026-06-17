import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerContextTools(server: CliRegistry): void {
  server.tool(
    'getDevelopmentContext',
    {
      entityType: z.enum(['story', 'bug']),
      entityId: z.number().int().positive(),
      productId: z.number().int().positive().optional().describe('可选。story 上下文查询关联 Bug 时可用于兜底过滤。'),
    },
    async (input) => jsonResult(await getApi().developmentContext.getDevelopmentContext(input)),
  );

  server.tool(
    'getDevelopmentContextSnapshot',
    {
      entityType: z.enum(['story', 'bug']),
      entityId: z.number().int().positive(),
      productId: z.number().int().positive().optional().describe('可选。story 上下文查询关联 Bug 时可用于兜底过滤。'),
    },
    async (input) => jsonResult(await getApi().developmentContext.getDevelopmentContextSnapshot(input)),
    { costHint: 'low', nextBestTools: ['getDevelopmentContext', 'getStoryRelatedBugs', 'getBugRelatedStory'] },
  );
}
