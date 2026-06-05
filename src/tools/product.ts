import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProductTools(server: CliRegistry): void {
  server.tool(
    'getProducts',
    {},
    async () => jsonResult(await getApi().product.getProducts()),
  );

  server.tool(
    'getProductDetail',
    {
      productId: z.number().int().positive().describe('禅道产品 ID。若用户问的是业务产品的线上/客户反馈/售后/生产问题，不要先用业务产品名找禅道产品；应固定查询“市场和售后问题跟踪”产品，再按 Bug 模块匹配真实业务产品。'),
    },
    async ({ productId }) => jsonResult(await getApi().product.getProductDetail(productId)),
  );
}
