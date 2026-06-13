import { describe, expect, it, vi } from 'vitest';
import { fetchRemainingPagesConcurrently, normalizePagination } from '../../src/core/pagination.js';

describe('normalizePagination', () => {
  it('对非法分页参数回退默认值', () => {
    expect(normalizePagination({ page: 0, limit: -5 })).toEqual({ page: 1, limit: 20 });
    expect(normalizePagination({ page: Number.NaN, limit: Number.POSITIVE_INFINITY })).toEqual({ page: 1, limit: 20 });
  });

  it('会向下取整并限制最大 limit', () => {
    expect(normalizePagination({ page: 3.8, limit: 150.2 })).toEqual({ page: 3, limit: 100 });
  });
});

describe('fetchRemainingPagesConcurrently', () => {
  it('有 total 时并发拉取剩余页，请求次数等于剩余页数', async () => {
    const fetchPage = vi.fn(async (page: number) => [{ page }, { page }]);
    const firstPage = { items: [{ page: 1 }, { page: 1 }], total: 10 };

    const result = await fetchRemainingPagesConcurrently(firstPage, fetchPage, { limit: 2, concurrency: 3 });

    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(result).toHaveLength(10);
  });

  it('默认并发度不超过 3', async () => {
    let maxInFlight = 0;
    let inFlight = 0;
    const fetchPage = vi.fn(async (_page: number) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => { setTimeout(resolve, 5); });
      inFlight -= 1;
      return [{ id: _page }];
    });

    await fetchRemainingPagesConcurrently({ items: [], total: 20 }, fetchPage, { limit: 2 });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
