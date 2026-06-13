export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_TOTAL_PAGES = 1000;

export function normalizePagination(input: PaginationInput = {}): PaginationParams {
  const pageCandidate = Number.isFinite(input.page) && input.page && input.page > 0 ? Math.floor(input.page) : DEFAULT_PAGE;
  const page = Math.max(pageCandidate, DEFAULT_PAGE);
  const rawLimitCandidate = Number.isFinite(input.limit) && input.limit && input.limit > 0 ? Math.floor(input.limit) : DEFAULT_LIMIT;
  const rawLimit = Math.max(rawLimitCandidate, 1);
  const limit = Math.min(rawLimit, MAX_LIMIT);

  return { page, limit };
}

export function normalizeTotalPages(total: unknown, limit: number, fallbackItemCount = 0): number {
  const parsedTotal = typeof total === 'number' && Number.isFinite(total)
    ? total
    : typeof total === 'string' && total.trim() !== ''
      ? Number(total)
      : fallbackItemCount;
  const safeTotal = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : fallbackItemCount;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
  return Math.min(Math.ceil(safeTotal / safeLimit), MAX_TOTAL_PAGES);
}

export async function fetchRemainingPagesConcurrently<T>(
  firstPage: { items: T[]; total?: unknown },
  fetchPage: (page: number) => Promise<T[]>,
  options: { limit?: number; concurrency?: number } = {},
): Promise<T[]> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const concurrency = options.concurrency ?? 3;
  const totalPages = normalizeTotalPages(firstPage.total, limit, firstPage.items.length);

  const allItems = [...firstPage.items];
  if (totalPages <= 1) return allItems;

  for (let startPage = 2; startPage <= totalPages; startPage += concurrency) {
    const endPage = Math.min(startPage + concurrency - 1, totalPages);
    const pageIndexes = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
    const pages = await Promise.all(pageIndexes.map((page) => fetchPage(page)));
    for (const items of pages) {
      allItems.push(...items);
    }
  }

  return allItems;
}

export interface FetchAllPagesOptions<T> {
  /** 单页拉取回调，需要返回 items + 可选 total；page 一定是 ≥ 1 的整数。 */
  fetchPage: (page: number) => Promise<{ items: T[]; total?: unknown }>;
  /** 每页大小；默认 100（与原代码中显式传入的 100 保持一致）。 */
  pageSize?: number;
  /** 并发拉取剩余页的最大并发度；默认 3。 */
  concurrency?: number;
}

/**
 * 拉取全量分页结果：先调 fetchPage(1) 拿到首页 + total，再并发拉剩余页。
 * 用于替代"first page + fetchRemainingPagesConcurrently + 固定 limit=100"的样板代码。
 */
export async function fetchAllPages<T>(options: FetchAllPagesOptions<T>): Promise<T[]> {
  const pageSize = options.pageSize ?? 100;
  const firstPage = await options.fetchPage(1);
  return fetchRemainingPagesConcurrently(
    { items: firstPage.items, total: firstPage.total },
    async (page) => (await options.fetchPage(page)).items,
    { limit: pageSize, concurrency: options.concurrency },
  );
}
