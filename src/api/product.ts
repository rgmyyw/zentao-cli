import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface CreateProductInput {
  name: string;
  code: string;
  type: string;
  status?: string;
  line?: number;
  desc?: string;
  PO?: string;
  QD?: string;
  RD?: string;
  acl?: string;
  whitelist?: string[];
  branches?: string[];
}

export interface UpdateProductInput {
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  line?: number;
  desc?: string;
  PO?: string;
  QD?: string;
  RD?: string;
  acl?: string;
  whitelist?: string[];
}

export class ProductApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProducts(): Promise<unknown> {
    const response = await this.http.request('GET', '/products');
    return toServerListResult(response, ['products']);
  }

  async getProductDetail(productId: number): Promise<unknown> {
    return this.http.request('GET', `/products/${productId}`);
  }

  async getProductAll(input: { status?: string; orderBy?: string; limit?: number } = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', this.buildQueryString('/product-all-0.json', {
      status: input.status,
      orderBy: input.orderBy,
      limit: input.limit,
    }));
  }

  async getProductTrack(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-track-${productId}.json`);
  }

  async getProductWhitelist(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-whitelist-${productId}.json`);
  }

  async getProductDashboard(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-dashboard-${productId}.json`);
  }

  async getProductRoadmap(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-roadmap-${productId}.json`);
  }

  async getProductDynamic(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-dynamic-${productId}.json`);
  }

  async getProductManageLine(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-manageLine-${productId}.json`);
  }

  async manageProductLine(
    productId: number,
    input: {
      modules?: Record<string, string>;
      newModules?: string[];
      programs?: Record<string, string>;
      newPrograms?: string[];
    } = {},
  ): Promise<unknown> {
    const formData = new URLSearchParams();
    this.appendIndexedFields(formData, 'modules', input.modules);
    this.appendListFields(formData, 'modules', input.newModules);
    this.appendIndexedFields(formData, 'programs', input.programs);
    this.appendListFields(formData, 'programs', input.newPrograms);
    return this.http.legacyRequest('POST', `/product-manageLine-${productId}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async createProduct(input: CreateProductInput): Promise<unknown> {
    const formData: Record<string, unknown> = {
      name: input.name,
      code: input.code,
      type: input.type,
    };
    if (input.status) formData.status = input.status;
    if (input.line !== undefined) formData.line = input.line;
    if (input.desc) formData.desc = input.desc;
    if (input.PO) formData.PO = input.PO;
    if (input.QD) formData.QD = input.QD;
    if (input.RD) formData.RD = input.RD;
    if (input.acl) formData.acl = input.acl;
    if (input.whitelist && input.whitelist.length > 0) formData.whitelist = input.whitelist.join(',');
    if (input.branches && input.branches.length > 0) formData.branches = input.branches.join(',');
    return this.http.legacyRequest('POST', '/product-create.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async editProduct(productId: number, input: UpdateProductInput): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.name !== undefined) formData.name = input.name;
    if (input.code !== undefined) formData.code = input.code;
    if (input.type !== undefined) formData.type = input.type;
    if (input.status !== undefined) formData.status = input.status;
    if (input.line !== undefined) formData.line = input.line;
    if (input.desc !== undefined) formData.desc = input.desc;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    if (input.whitelist !== undefined) formData.whitelist = input.whitelist.join(',');
    return this.http.legacyRequest('POST', `/product-edit-${productId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditProducts(input: { productIds: number[]; type?: string; PO?: string; QD?: string; RD?: string; acl?: string }): Promise<unknown> {
    if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
      throw new Error('productIds 至少需要 1 项');
    }
    const formData: Record<string, unknown> = { productIdList: input.productIds };
    if (input.type !== undefined) formData.type = input.type;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    return this.http.legacyRequest('POST', '/product-batchEdit-0.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async closeProduct(productId: number, status: 'closed' | 'open' = 'closed'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-close-${productId}-${status}.json`);
  }

  async deleteProduct(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-delete-${productId}-yes.json`);
  }

  async addProductWhitelist(input: { productId: number; accounts: string[]; groups?: number[] }): Promise<unknown> {
    if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
      throw new Error('accounts 至少需要 1 项');
    }
    const formData: Record<string, unknown> = { accounts: input.accounts.join(',') };
    if (input.groups !== undefined) formData.groups = input.groups.join(',');
    return this.http.legacyRequest('POST', `/product-addWhitelist-${input.productId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unbindProductWhitelist(input: { productId: number; account: string; group?: number }): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-unbindWhitelist-${input.productId}-${input.account}${input.group !== undefined ? `-${input.group}` : ''}-yes.json`);
  }

  async setProductOrder(productId: number, order: number): Promise<unknown> {
    return this.http.legacyRequest('POST', `/product-updateOrder-${productId}.json`, {
      data: toFormUrlEncoded({ order }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportProducts(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/product-export-${productId}.json`);
  }

  private buildQueryString(base: string, params: Record<string, string | number | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      qs.set(key, String(value));
    }
    const tail = qs.toString();
    return tail ? `${base}?${tail}` : base;
  }

  private appendIndexedFields(formData: URLSearchParams, field: string, values?: Record<string, string>): void {
    if (!values) return;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== 'string') continue;
      formData.append(`${field}[${key}]`, value);
    }
  }

  private appendListFields(formData: URLSearchParams, field: string, values?: string[]): void {
    if (!Array.isArray(values)) return;
    for (const value of values) {
      if (typeof value !== 'string') continue;
      formData.append(`${field}[]`, value);
    }
  }
}
