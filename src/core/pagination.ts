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
