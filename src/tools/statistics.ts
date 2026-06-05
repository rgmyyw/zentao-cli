import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerStatisticsTools(server: CliRegistry): void {
  server.tool('getMyTaskStatistics', {}, async () => jsonResult(await getApi().statistics.getMyTaskStatistics()));

  server.tool(
    'getMyBugStatistics',
    {
      productId: z.number().int().positive().optional().describe('可选。禅道产品 ID。不传时统计跨所有产品指派给我的 Bug；传入时收窄到指定产品。'),
    },
    async ({ productId }) => jsonResult(await getApi().statistics.getMyBugStatistics(productId)),
  );
}
