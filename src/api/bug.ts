import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult, toServerListResult, type ListResult } from '../core/list-result.js';
import { normalizePagination, normalizeTotalPages, type PaginationInput } from '../core/pagination.js';
import type { ZentaoBug, ZentaoListResponse } from '../types/zentao.js';

export interface BugListParams extends PaginationInput {
  productId: number;
  status?: string;
  branch?: string;
  order?: string;
  search?: string;
  module?: string;
  moduleId?: number;
}

export interface ResolveBugInput {
  resolution: 'fixed' | 'bydesign' | 'duplicate' | 'external' | 'notrepro' | 'postponed' | 'willnotfix';
  resolvedBuild?: string;
  resolvedDate?: string;
  assignedTo?: string;
  comment?: string;
  duplicateBug?: number;
}

export interface MyBugListParams extends PaginationInput {
  productId?: number;
  branch?: string;
  order?: string;
}

export class BugApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async createBug(data: Record<string, unknown> & { product: number }): Promise<unknown> {
    return this.http.request('POST', `/products/${data.product}/bugs`, { data });
  }

  async getMyBugs(params: MyBugListParams = {}): Promise<unknown> {
    if (params.productId) {
      return this.getProductBugs({ ...params, productId: params.productId, status: 'assigntome' });
    }

    const response = await this.http.request<ZentaoListResponse<{ id: number; name?: string }> & { products?: Array<{ id: number; name?: string }> }>('GET', '/products');
    const productsResult = toServerListResult<{ id: number; name?: string }>(response, ['products']);
    const products = productsResult.items;
    const allBugs: ZentaoBug[] = [];

    for (const product of products) {
      const productId = product.id;
      if (!productId) continue;

      const bugs = await this.getAllMyBugsInProduct({
        productId,
        branch: params.branch,
        order: params.order,
      });

      allBugs.push(...bugs.map((bug) => ({
        ...bug,
        product: bug.product ?? productId,
        productName: bug.productName ?? product.name,
      })));
    }

    const sorted = this.sortBugs(allBugs, params.order);
    const paginated = toClientPaginatedListResult<ZentaoBug>({ bugs: sorted }, ['bugs'], params);
    return {
      ...paginated,
      scope: 'global-assigntome',
      scannedProducts: products.length,
    };
  }

  async getProductBugs(params: BugListParams): Promise<unknown> {
    const needsClientFilter = !!(params.moduleId || params.module || params.search);

    if (needsClientFilter) {
      return this.getProductBugsWithClientFilter(params);
    }

    const pagination = normalizePagination(params);
    const response = await this.http.request<ZentaoListResponse<ZentaoBug> & { bugs?: ZentaoBug[] }>('GET', `/products/${params.productId}/bugs`, {
      params: {
        ...pagination,
        branch: params.branch ?? 'all',
        order: params.order ?? 'id_desc',
        status: params.status === 'all' ? undefined : params.status,
      },
    });
    return toServerListResult(response, ['bugs'], params);
  }

  private async getProductBugsWithClientFilter(params: BugListParams): Promise<ListResult<ZentaoBug>> {
    const pageSize = 100;
    const firstPage = await this.fetchProductBugsPage(params, 1, pageSize);
    const firstResult = toServerListResult<ZentaoBug>(firstPage, ['bugs']);
    const total = firstResult.total;
    const allBugs = [...firstResult.items];
    const totalPages = normalizeTotalPages(total, pageSize, allBugs.length);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.fetchProductBugsPage(params, page, pageSize);
      const result = toServerListResult<ZentaoBug>(response, ['bugs']);
      allBugs.push(...result.items);
    }

    let filtered = allBugs;

    if (params.moduleId) {
      filtered = filtered.filter((bug) => {
        const bugModuleId = (bug as Record<string, unknown>).module ?? (bug as Record<string, unknown>).moduleId;
        return Number(bugModuleId) === params.moduleId;
      });
    }

    if (params.module) {
      const keyword = normalizeBugFilterText(params.module);
      filtered = filtered.filter((bug) => bugMatchesModuleAlias(bug, keyword));
    }

    if (params.search) {
      const keyword = normalizeBugFilterText(params.search);
      filtered = filtered.filter((bug) => bugMatchesKeyword(bug, keyword, ['id', 'title', 'name', 'keywords', 'steps', 'moduleTitle', 'moduleName', 'modulePath', 'path']));
    }

    const sorted = this.sortBugs(filtered, params.order);

    const result = toClientPaginatedListResult<ZentaoBug>({ bugs: sorted }, ['bugs'], params);
    return {
      ...result,
      scanned: allBugs.length,
      ...(filtered.length !== allBugs.length ? { matched: filtered.length } : {}),
    } as ListResult<ZentaoBug> & { matched?: number };
  }

  private async fetchProductBugsPage(params: BugListParams, page: number, limit: number): Promise<unknown> {
    return this.http.request('GET', `/products/${params.productId}/bugs`, {
      params: {
        page,
        limit,
        branch: params.branch ?? 'all',
        order: params.order ?? 'id_desc',
        status: params.status === 'all' ? undefined : params.status,
      },
    });
  }

  async getBugDetail(bugId: number): Promise<ZentaoBug> {
    return this.http.request<ZentaoBug>('GET', `/bugs/${bugId}`);
  }

  async updateBug(bugId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/bugs/${bugId}`, { data: update });
  }

  async assignBug(bugId: number, data: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/assign`, { data });
  }

  async confirmBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/confirm`, { data });
  }

  async closeBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/close`, { data });
  }

  async activateBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/activate`, { data });
  }

  async deleteBug(bugId: number): Promise<unknown> {
    return this.http.request('DELETE', `/bugs/${bugId}`);
  }

  async resolveBug(bugId: number, input: ResolveBugInput): Promise<unknown> {
    const payload: ResolveBugInput = { ...input };
    if (payload.resolution === 'fixed' && !payload.resolvedBuild) payload.resolvedBuild = 'trunk';
    if (payload.resolution === 'duplicate' && !payload.duplicateBug) {
      throw new Error('resolution=duplicate 时必须提供 duplicateBug');
    }

    return this.http.request('POST', `/bugs/${bugId}/resolve`, { data: payload });
  }

  private async getAllMyBugsInProduct(params: Omit<BugListParams, 'status' | 'page' | 'limit'>): Promise<ZentaoBug[]> {
    const limit = 100;
    const firstPage = await this.getProductBugs({ ...params, status: 'assigntome', page: 1, limit }) as ListResult<ZentaoBug>;
    const bugs = [...firstPage.items];
    const totalPages = normalizeTotalPages(firstPage.total, limit, bugs.length);

    for (let page = 2; page <= totalPages; page += 1) {
      const response = await this.getProductBugs({ ...params, status: 'assigntome', page, limit }) as ListResult<ZentaoBug>;
      bugs.push(...response.items);
    }

    return bugs;
  }

  private sortBugs(bugs: ZentaoBug[], order?: string): ZentaoBug[] {
    const normalizedOrder = (order ?? 'id_desc').toLowerCase();
    const sorted = [...bugs];

    if (normalizedOrder === 'id_asc') {
      sorted.sort((a, b) => a.id - b.id);
      return sorted;
    }

    sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }
}

function normalizeBugFilterText(value: string): string {
  return value.trim().toLowerCase();
}

function bugMatchesKeyword(bug: ZentaoBug, keyword: string, fields: string[]): boolean {
  if (!keyword) return true;

  const record = bug as Record<string, unknown>;
  for (const field of fields) {
    const value = record[field];
    if (value === undefined || value === null) continue;
    if (String(value).toLowerCase().includes(keyword)) return true;
  }

  return false;
}

function bugMatchesModuleAlias(bug: ZentaoBug, keyword: string): boolean {
  if (!keyword) return true;

  const fields = ['module', 'moduleId', 'moduleName', 'moduleTitle', 'modulePath', 'path', 'title', 'keywords', 'v1', 'v2'];
  if (bugMatchesKeyword(bug, keyword, fields)) return true;

  const record = bug as Record<string, unknown>;
  const aliasSources = fields
    .map((field) => record[field])
    .filter((value): value is string | number => value !== undefined && value !== null)
    .map((value) => String(value));

  return aliasSources.some((value) => normalizeAliasText(value).includes(keyword));
}

function normalizeAliasText(value: string): string {
  let result = '';

  for (const char of value.toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      result += char;
      continue;
    }

    const initial = chineseInitialMap[char];
    if (initial) {
      result += initial;
    }
  }

  return result;
}

const chineseInitialMap: Record<string, string> = {
  '超': 'c',
  '管': 'g',
  '云': 'y',
  '镜': 'j',
  '助': 'z',
  '手': 's',
  '脉': 'm',
  '眺': 't',
  '警': 'j',
  '务': 'w',
  '数': 's',
  '盘': 'p',
  '析': 'x',
  '案': 'a',
  '系': 'x',
  '统': 't',
  '寻': 'x',
  '迹': 'j',
  '客': 'k',
  '户': 'h',
  '成': 'c',
  '功': 'g',
  '部': 'b',
  '服': 'f',
  '止': 'z',
  '付': 'f',
  '通': 't',
  '两': 'l',
  '卡': 'k',
  '其': 'q',
  '他': 't',
};
