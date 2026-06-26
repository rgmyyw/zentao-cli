import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult, toServerListResult, type ListResult } from '../core/list-result.js';
import { fetchAllPages, normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';
import type { ZentaoBug, ZentaoListResponse } from '../types/zentao.js';
import { containsHtmlMarkup } from '../utils/html.js';
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
  /** 为 true 时只拉取首页，不扫描全量分页（用于 whoami 等快速预览场景）。 */
  scan?: boolean;
}

export interface BatchCreateBugsInput extends Record<string, unknown> {
  productId: number;
  branch?: number;
  executionId?: number;
  moduleId?: number;
}

export interface BatchEditBugsInput extends Record<string, unknown> {
  productId: number;
  executionId?: number;
  branch?: number;
  bugIds: number[];
}

export interface LinkBugsInput {
  bugId: number;
  linkedBugIds: number[];
}

export interface ExportBugsInput {
  productId: number;
  orderBy?: string;
  browseType?: string;
}

export class BugApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async createBug(data: Record<string, unknown> & { product: number }): Promise<unknown> {
    const normalized = this.normalizeBugWriteInput(data, { requiredFields: ['title'] });
    if (containsHtmlMarkup(normalized.steps)) {
      const legacyPayload = { ...normalized };
      if (typeof legacyPayload.openedBuild === 'string') legacyPayload.openedBuild = [legacyPayload.openedBuild];
      return this.http.legacyRequest('POST', `/bug-create-${data.product}.json`, {
        data: toFormUrlEncoded(legacyPayload),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    return this.http.request('POST', `/products/${data.product}/bugs`, {
      data: normalized,
    });
  }

  async getMyBugs(params: MyBugListParams = {}): Promise<unknown> {
    const normalizedParams = this.normalizeBugQueryParams(params);

    if (normalizedParams.productId) {
      return this.getProductBugs({ ...normalizedParams, productId: normalizedParams.productId, status: 'assigntome' });
    }

    // 快速模式：每个产品只拉首页，收集够 limit 就停，不扫描全部分页。
    if (params.scan === false) {
      const limit = normalizePagination(normalizedParams).limit;
      const response = await this.http.request<ZentaoListResponse<{ id: number; name?: string }> & { products?: Array<{ id: number; name?: string }> }>('GET', '/products');
      const productsResult = toServerListResult<{ id: number; name?: string }>(response, ['products']);
      const allBugs: ZentaoBug[] = [];

      for (const product of productsResult.items) {
        if (allBugs.length >= limit) break;
        const productId = product.id;
        if (!productId) continue;

        const pageResult = await this.getProductBugs({
          productId,
          status: 'assigntome',
          page: 1,
          limit,
          branch: normalizedParams.branch,
          order: normalizedParams.order,
        }) as ListResult<ZentaoBug>;
        const pageItems = pageResult.items ?? [];
        const remaining = limit - allBugs.length;

        allBugs.push(...pageItems.slice(0, remaining).map((bug) => ({
          ...bug,
          product: bug.product ?? productId,
          productName: bug.productName ?? product.name,
        })));
      }

      const sorted = this.sortBugs(allBugs, normalizedParams.order);
      const paginated = toClientPaginatedListResult<ZentaoBug>({ bugs: sorted }, ['bugs'], { page: 1, limit });
      return {
        ...paginated,
        partial: true,
        scope: 'global-assigntome',
        scannedProducts: productsResult.items.length,
      };
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

  async getBugSnapshot(bugId: number): Promise<unknown> {
    const bug = await this.getBugDetail(bugId);
    const actions = this.asArrayOfRecords(bug.actions).slice(0, 8).map((action) => this.pickFields(action, ['id', 'actor', 'action', 'date', 'comment']));

    return {
      bugId,
      focus: this.pickFields(bug as unknown as Record<string, unknown>, [
        'id', 'title', 'status', 'severity', 'pri', 'type', 'product', 'module', 'project', 'execution', 'plan', 'story', 'task', 'assignedTo', 'openedBy', 'resolvedBy', 'resolution', 'resolvedBuild', 'closedBy',
      ]),
      lifecycle: this.pickFields(bug as unknown as Record<string, unknown>, ['openedDate', 'assignedDate', 'resolvedDate', 'closedDate', 'deadline', 'lastEditedDate', 'activatedCount']),
      text: {
        steps: this.compactText(bug.steps),
        keywords: bug.keywords,
      },
      actions,
      summary: {
        hasStory: this.hasLinkedId(bug.story),
        hasTask: this.hasLinkedId(bug.task),
        actionCount: this.asArrayOfRecords(bug.actions).length,
        actionsShown: actions.length,
      },
    };
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

  async confirmStoryChange(bugId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/bug-confirmStoryChange-${bugId}.json`);
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

  async deleteBugViaForm(bugId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/bug-delete-${bugId}-yes.json`);
  }

  async batchCreateBugs(input: BatchCreateBugsInput): Promise<unknown> {
    const { productId, branch = 0, executionId = 0, moduleId = 0, ...data } = input;
    return this.http.legacyRequest('POST', `/bug-batchCreate-${productId}-${branch}-${executionId}-${moduleId}.json`, {
      data: toFormUrlEncoded(this.normalizeBugWriteInput(data, { requiredFields: [] })),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditBugs(input: BatchEditBugsInput): Promise<unknown> {
    const { productId, executionId = 0, branch = 0, bugIds, ...data } = input;
    return this.http.legacyRequest('POST', `/bug-batchEdit-${productId}-${executionId}-${branch}.json`, {
      data: toFormUrlEncoded({ bugIDList: this.normalizeIdArray(bugIds, 'bugIds'), ...this.normalizeBugWriteInput(data, { requiredFields: [] }) }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkBugs(input: LinkBugsInput): Promise<unknown> {
    return this.http.legacyRequest('POST', `/bug-linkBugs-${input.bugId}.json`, {
      data: toFormUrlEncoded({ bugs: this.normalizeIdArray(input.linkedBugIds, 'linkedBugIds') }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportBugs(input: ExportBugsInput): Promise<unknown> {
    const orderBy = encodeURIComponent(input.orderBy?.trim() || 'id_desc');
    const browseType = encodeURIComponent(input.browseType?.trim() || 'all');
    return this.http.legacyRequest('GET', `/bug-export-${input.productId}-${orderBy}-${browseType}.json`);
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

  async batchChangeBugBranch(input: { bugIds: number[]; branchId: number }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/bug-batchChangeBranch-${input.branchId}.json`, {
      data: toFormUrlEncoded({ bugIDList: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeBugModule(input: { bugIds: number[]; moduleId: number }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/bug-batchChangeModule-${input.moduleId}.json`, {
      data: toFormUrlEncoded({ bugIDList: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeBugPlan(input: { bugIds: number[]; planId: number }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', `/bug-batchChangePlan-${input.planId}.json`, {
      data: toFormUrlEncoded({ bugIDList: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchAssignBugs(input: { bugIds: number[]; objectId: number; type?: string; assignedTo: string; comment?: string }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const assignedTo = requireNonBlank(input.assignedTo, 'assignedTo 不能为空');
    const formData: Record<string, unknown> = { bugIDList: bugIds, assignedTo };
    if (input.comment && input.comment.trim()) formData.comment = input.comment.trim();
    return this.http.legacyRequest(
      'POST',
      `/bug-batchAssignTo-${input.objectId}-${input.type ?? 'execution'}.json`,
      {
        data: toFormUrlEncoded(formData),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  }

  async batchConfirmBugs(input: { bugIds: number[] }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    return this.http.legacyRequest('POST', '/bug-batchConfirm.json', {
      data: toFormUrlEncoded({ bugIDList: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchResolveBugs(input: { bugIds: number[]; resolution: string; resolvedBuild?: string; comment?: string }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const resolution = requireNonBlank(input.resolution, 'resolution 不能为空');
    const formData: Record<string, unknown> = { bugIDList: bugIds, resolution };
    if (input.resolvedBuild && input.resolvedBuild.trim()) formData.resolvedBuild = input.resolvedBuild.trim();
    if (input.comment && input.comment.trim()) formData.comment = input.comment.trim();
    return this.http.legacyRequest(
      'POST',
      `/bug-batchResolve-${encodeURIComponent(resolution)}-${encodeURIComponent(input.resolvedBuild?.trim() ?? '')}.json`,
      {
        data: toFormUrlEncoded(formData),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  }

  async batchCloseBugs(input: { bugIds: number[]; releaseId?: string; viewType?: string }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const formData: Record<string, unknown> = { bugIDList: bugIds };
    if (input.releaseId && input.releaseId.trim() !== '') formData.unlinkBugs = bugIds;
    return this.http.legacyRequest(
      'POST',
      `/bug-batchClose-${input.releaseId ?? ''}-${input.viewType ?? ''}.json`,
      {
        data: toFormUrlEncoded(formData),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  }

  async batchActivateBugs(input: { productId: number; branch?: number; bugIds: number[] }): Promise<unknown> {
    const bugIds = this.normalizeIdArray(input.bugIds, 'bugIds');
    const statusListEntries = bugIds.map((id) => `statusList%5B${encodeURIComponent(String(id))}%5D=${encodeURIComponent('activate')}`);
    const statusListData = statusListEntries.join('&');
    const bugIdListData = bugIds.map((id) => `bugIDList%5B%5D=${encodeURIComponent(String(id))}`).join('&');
    const formData = `${statusListData}&${bugIdListData}`;
    return this.http.legacyRequest(
      'POST',
      `/bug-batchActivate-${input.productId}-${input.branch ?? 0}.json`,
      {
        data: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
  }

  private async getAllMyBugsInProduct(params: Omit<BugListParams, 'status' | 'page' | 'limit'>): Promise<ZentaoBug[]> {
    return fetchAllPages<ZentaoBug>({
      fetchPage: (page) => this.getProductBugs({ ...params, status: 'assigntome', page, limit: 100 }) as Promise<ListResult<ZentaoBug>>,
    });
  }

  async getBugTrack(bugId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/bug-track-${bugId}.json`);
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

  private normalizeIdArray(values: unknown, fieldName: string): number[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`${fieldName} 至少需要 1 项`);
    }
    return values.map((value) => {
      const num = Number(value);
      if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`${fieldName} 必须是正整数`);
      }
      return num;
    });
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

  private pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    const picked: Record<string, unknown> = {};
    for (const field of fields) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') picked[field] = record[field];
    }
    return picked;
  }

  private compactText(value: unknown, maxLength = 500): unknown {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  private asArrayOfRecords(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item));
  }

  private hasLinkedId(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '' && value !== 0 && value !== '0';
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
