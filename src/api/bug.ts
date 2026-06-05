import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult, toServerListResult, type ListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import type { ZentaoBug, ZentaoListResponse } from '../types/zentao.js';

export interface BugListParams extends PaginationInput {
  productId: number;
  status?: string;
  branch?: string;
  order?: string;
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

  async getBugDetail(bugId: number): Promise<ZentaoBug> {
    return this.http.request<ZentaoBug>('GET', `/bugs/${bugId}`);
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
    const total = firstPage.total ?? bugs.length;
    const totalPages = Math.ceil(total / limit);

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
