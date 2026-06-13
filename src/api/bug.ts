import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult, toServerListResult, type ListResult } from '../core/list-result.js';
import { fetchAllPages, normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';
import type { ZentaoBug, ZentaoListResponse } from '../types/zentao.js';
import { toFormUrlEncoded } from '../utils/form.js';
import { bugMatchesKeyword, bugMatchesModuleAlias, normalizeBugFilterText } from './bug-filter.js';

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
  resolution: 'fixed' | 'bydesign' | 'duplicate' | 'external' | 'notrepro' | 'postponed' | 'willnotfix' | 'tostory';
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
    return this.http.request('POST', `/products/${data.product}/bugs`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: ['title'] }),
    });
  }

  async getMyBugs(params: MyBugListParams = {}): Promise<unknown> {
    const normalizedParams = this.normalizeBugQueryParams(params);

    if (normalizedParams.productId) {
      return this.getProductBugs({ ...normalizedParams, productId: normalizedParams.productId, status: 'assigntome' });
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
        branch: normalizedParams.branch,
        order: normalizedParams.order,
      });

      allBugs.push(...bugs.map((bug) => ({
        ...bug,
        product: bug.product ?? productId,
        productName: bug.productName ?? product.name,
      })));
    }

    const sorted = this.sortBugs(allBugs, normalizedParams.order);
    const paginated = toClientPaginatedListResult<ZentaoBug>({ bugs: sorted }, ['bugs'], normalizedParams);
    return {
      ...paginated,
      scope: 'global-assigntome',
      scannedProducts: products.length,
    };
  }

  async getProductBugs(params: BugListParams): Promise<unknown> {
    const normalizedParams = this.normalizeBugQueryParams(params);
    const needsClientFilter = !!(normalizedParams.moduleId || normalizedParams.module || normalizedParams.search);

    if (needsClientFilter) {
      return this.getProductBugsWithClientFilter(normalizedParams);
    }

    const pagination = normalizePagination(normalizedParams);
    const response = await this.http.request<ZentaoListResponse<ZentaoBug> & { bugs?: ZentaoBug[] }>('GET', `/products/${normalizedParams.productId}/bugs`, {
      params: {
        ...pagination,
        branch: normalizedParams.branch ?? 'all',
        order: normalizedParams.order ?? 'id_desc',
        status: normalizedParams.status === 'all' ? undefined : normalizedParams.status,
      },
    });
    return toServerListResult(response, ['bugs'], normalizedParams);
  }

  private async getProductBugsWithClientFilter(params: BugListParams): Promise<ListResult<ZentaoBug>> {
    const pageSize = 100;
    const allBugs = await fetchAllPages<ZentaoBug>({
      pageSize,
      fetchPage: async (page) => {
        const response = await this.fetchProductBugsPage(params, page, pageSize);
        return toServerListResult<ZentaoBug>(response, ['bugs']);
      },
    });

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
    const current = await this.getBugDetail(bugId);
    const preserved = this.pickBugEditDefaults(current);
    const formData = toFormUrlEncoded(this.normalizeBugWriteInput({ ...preserved, ...update }, { requiredFields: [] }));
    return this.http.legacyRequest('POST', `/bug-edit-${bugId}.json`, {
      data: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async assignBug(bugId: number, data: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/assign`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: ['assignedTo'] }),
    });
  }

  async confirmBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/confirm`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: [] }),
    });
  }

  async closeBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/close`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: [] }),
    });
  }

  async activateBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/bugs/${bugId}/activate`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: [] }),
    });
  }

  async deleteBug(bugId: number): Promise<unknown> {
    return this.http.request('DELETE', `/bugs/${bugId}`);
  }

  async okBug(bugId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    // 禅道 18.5 REST 没暴露 /bugs/{id}/ok，UI 的 OK 按钮调旧版控制器
    return this.http.legacyRequest('POST', `/bug-ok-${bugId}.json`, {
      data: this.normalizeBugWriteInput(data, { requiredFields: [] }),
    });
  }

  async resolveBug(bugId: number, input: ResolveBugInput): Promise<unknown> {
    const payload = this.normalizeBugWriteInput({ ...input }, { requiredFields: [] }) as unknown as ResolveBugInput;
    if (payload.resolution === 'fixed' && !payload.resolvedBuild) payload.resolvedBuild = 'trunk';
    if (payload.resolution === 'duplicate' && !payload.duplicateBug) {
      throw new Error('resolution=duplicate 时必须提供 duplicateBug');
    }

    return this.http.request('POST', `/bugs/${bugId}/resolve`, { data: payload });
  }

  private async getAllMyBugsInProduct(params: Omit<BugListParams, 'status' | 'page' | 'limit'>): Promise<ZentaoBug[]> {
    return fetchAllPages<ZentaoBug>({
      fetchPage: (page) => this.getProductBugs({ ...params, status: 'assigntome', page, limit: 100 }) as Promise<ListResult<ZentaoBug>>,
    });
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

  private normalizeBugWriteInput(
    input: Record<string, unknown>,
    options: { requiredFields: Array<'title' | 'assignedTo'> },
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...input };

    for (const field of options.requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(normalized, field)) {
        throw new Error(`${field} 不能为空`);
      }
      normalized[field] = requireNonBlank(normalized[field] as string | undefined | null, `${field} 不能为空`);
    }

    for (const key of ['title', 'assignedTo', 'comment', 'resolvedBuild', 'resolvedDate', 'openedBuild', 'type', 'steps', 'keywords', 'mailto', 'status', 'resolution', 'project', 'execution', 'plan'] as const) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) {
        continue;
      }

      const value = normalized[key];
      if (typeof value !== 'string') {
        continue;
      }

      const trimmed = value.trim();
      if (!trimmed && (key === 'assignedTo' || key === 'title')) {
        delete normalized[key];
        continue;
      }

      normalized[key] = trimmed;
    }

    return normalized;
  }

  private pickBugEditDefaults(bug: ZentaoBug): Record<string, unknown> {
    const openedBuild = Array.isArray(bug.openedBuild)
      ? bug.openedBuild
          .map((item) => (item && typeof item === 'object' && 'id' in item ? String(item.id) : ''))
          .filter(Boolean)
          .join(',')
      : typeof bug.openedBuild === 'string'
        ? bug.openedBuild
        : undefined;

    const assignedTo = bug.assignedTo && typeof bug.assignedTo === 'object' && 'account' in bug.assignedTo
      ? String(bug.assignedTo.account ?? '')
      : typeof bug.assignedTo === 'string'
        ? bug.assignedTo
        : undefined;

    return {
      title: bug.title,
      keywords: bug.keywords,
      severity: bug.severity,
      pri: bug.pri,
      type: bug.type,
      steps: bug.steps,
      story: bug.story,
      task: bug.task,
      module: bug.module,
      project: bug.project,
      execution: bug.execution,
      plan: bug.plan,
      openedBuild,
      assignedTo,
    };
  }

  private normalizeBugQueryParams<T extends PaginationInput & {
    branch?: string;
    order?: string;
    status?: string;
    search?: string;
    module?: string;
  }>(params: T): T {
    const normalized = { ...params } as T & Record<string, unknown>;

    for (const key of ['branch', 'order', 'status', 'search', 'module'] as const) {
      const value = normalized[key];
      if (typeof value !== 'string') {
        continue;
      }

      const trimmed = value.trim();
      if (trimmed === '') {
        delete normalized[key];
      } else {
        normalized[key] = trimmed;
      }
    }

    return normalized;
  }
}
