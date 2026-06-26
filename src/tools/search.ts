import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerSearchTools(server: CliRegistry): void {
  server.tool('searchStories', {
    keyword: z.string().trim().min(1),
    productId: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(100).optional().default(20),
    deepSearch: z.boolean().optional().default(false),
  }, async (input) => jsonResult(await getApi().search.searchStories(input)), {
    costHint: 'medium',
    nextBestTools: ['getStoryDetail', 'getDevelopmentContextSnapshot', 'searchStoriesByProductName'],
    recommendations: [
      { tool: 'searchStories', reason: '可在更多产品内深搜', args: { keyword: { source: 'input', path: 'keyword' } } },
      { tool: 'searchStoriesByProductName', reason: '按产品名 + 关键字搜索', args: { keyword: { source: 'input', path: 'keyword' } } },
    ],
  });

  server.tool('searchStoriesByProductName', {
    productName: z.string().trim().min(1),
    keyword: z.string().trim().min(1),
    limit: z.number().int().positive().max(100).optional().default(10),
    deepSearch: z.boolean().optional().default(false),
  }, async ({ productName, keyword, limit, deepSearch }) => jsonResult(await getApi().search.searchStoriesByProductName(productName, keyword, { limit, deepSearch })), {
    costHint: 'medium',
    nextBestTools: ['searchStories', 'getProductStories', 'getStoryDetail'],
    recommendations: [
      { tool: 'searchStories', reason: '直接按 productId 精确搜索', args: { keyword: { source: 'input', path: 'keyword' } } },
      { tool: 'getProductStories', reason: '列出产品下全部需求' },
    ],
  });
}
