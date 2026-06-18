import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult, optionalTrimmedText } from './shared.js';

export function registerStatisticsTools(server: CliRegistry): void {
  server.tool('getMyTaskStatistics', {}, async () => jsonResult(await getApi().statistics.getMyTaskStatistics()), { costHint: 'low', nextBestTools: ['getMyTasks', 'getMyWeeklyActivity', 'getExecutionSnapshot'] });

  server.tool(
    'getMyBugStatistics',
    {
      productId: z.number().int().positive().optional().describe('可选。禅道产品 ID。不传时统计跨所有产品指派给我的 Bug；传入时收窄到指定产品。'),
    },
    async ({ productId }) => jsonResult(await getApi().statistics.getMyBugStatistics(productId)),
    { costHint: 'low', nextBestTools: ['getMyBugs', 'getProductBugs', 'getBugSnapshot'] },
  );

  server.tool(
    'getMyWeeklyActivity',
    {
      account: optionalTrimmedText.describe('可选。禅道账号，例如 lixm1；不传时默认使用当前登录账号。'),
      week: z.enum(['last', 'this']).optional().default('last').describe('统计哪一周：last=上周，this=本周。'),
      dateRange: optionalTrimmedText.describe('自然语言日期范围，例如：上周、本周、今天、昨天、最近3天、3天前、2026-05-28、2026-05-25到2026-05-29。传入后优先于 week。'),
      startDate: optionalTrimmedText.describe('开始日期，例如 2026-05-25。和 endDate 搭配时优先于 week。'),
      endDate: optionalTrimmedText.describe('结束日期，例如 2026-05-29。和 startDate 搭配时优先于 week。'),
      days: z.number().int().positive().optional().describe('最近 N 天，例如 3 表示最近3天。优先于 week，低于 dateRange 和 startDate/endDate。'),
    },
    async ({ account, week, dateRange, startDate, endDate, days }) => jsonResult(await getApi().statistics.getMyWeeklyActivity({ account, week, dateRange, startDate, endDate, days })),
    { costHint: 'medium', nextBestTools: ['getMyTasks', 'getMyBugs', 'getExecutionSnapshot'] },
  );
}
