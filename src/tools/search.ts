import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerSearchTools(server: CliRegistry): void {
  server.tool('searchStories', {
    keyword: z.string().min(1),
    productId: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional().default(20),
    deepSearch: z.boolean().optional().default(false),
  }, async (input) => jsonResult(await getApi().search.searchStories(input)));

  server.tool('searchStoriesByProductName', {
    productName: z.string().min(1),
    keyword: z.string().min(1),
    limit: z.number().int().positive().max(100).optional().default(10),
    deepSearch: z.boolean().optional().default(false),
  }, async ({ productName, keyword, limit, deepSearch }) => jsonResult(await getApi().search.searchStoriesByProductName(productName, keyword, { limit, deepSearch })));
}
