import { describe, expect, it } from 'vitest';
import { normalizePagination } from '../../src/core/pagination.js';

describe('normalizePagination', () => {
  it('对非法分页参数回退默认值', () => {
    expect(normalizePagination({ page: 0, limit: -5 })).toEqual({ page: 1, limit: 20 });
    expect(normalizePagination({ page: Number.NaN, limit: Number.POSITIVE_INFINITY })).toEqual({ page: 1, limit: 20 });
  });

  it('会向下取整并限制最大 limit', () => {
    expect(normalizePagination({ page: 3.8, limit: 150.2 })).toEqual({ page: 3, limit: 100 });
  });
});
