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

export function normalizePagination(input: PaginationInput = {}): PaginationParams {
  const pageCandidate = Number.isFinite(input.page) && input.page && input.page > 0 ? Math.floor(input.page) : DEFAULT_PAGE;
  const page = Math.max(pageCandidate, DEFAULT_PAGE);
  const rawLimitCandidate = Number.isFinite(input.limit) && input.limit && input.limit > 0 ? Math.floor(input.limit) : DEFAULT_LIMIT;
  const rawLimit = Math.max(rawLimitCandidate, 1);
  const limit = Math.min(rawLimit, MAX_LIMIT);

  return { page, limit };
}
