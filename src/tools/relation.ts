import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerRelationTools(server: CliRegistry): void {
  server.tool(
    'getStoryRelatedBugs',
    {
      storyId: z.number().int().positive(),
      productId: z.number().int().positive().optional().describe('可选。若 story 详情没有直接返回 bugs，则用产品 Bug 列表兜底过滤。'),
    },
    async ({ storyId, productId }) => jsonResult(await getApi().relation.getStoryRelatedBugs(storyId, productId)),
    { costHint: 'low', nextBestTools: ['getStoryDetail', 'getDevelopmentContextSnapshot', 'getBugSnapshot'] },
  );

  server.tool(
    'getBugRelatedStory',
    {
      bugId: z.number().int().positive(),
    },
    async ({ bugId }) => jsonResult(await getApi().relation.getBugRelatedStory(bugId)),
    { costHint: 'low', nextBestTools: ['getBugSnapshot', 'getStoryDetail', 'getDevelopmentContextSnapshot'] },
  );
}
