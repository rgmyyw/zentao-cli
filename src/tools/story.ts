import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerStoryTools(server: CliRegistry): void {
  server.tool(
    'getProductStories',
    {
      productId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().story.getProductStories(input)),
  );

  server.tool(
    'getStoryDetail',
    {
      storyId: z.number().int().positive(),
    },
    async ({ storyId }) => jsonResult(await getApi().story.getStoryDetail(storyId)),
  );
}
