import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface CreateProgramInput {
  name: string;
  parent?: number;
  budget?: string;
  budgetUnit?: string;
  begin?: string;
  end?: string;
  days?: number;
  desc?: string;
  PM?: string;
  PO?: string;
  QD?: string;
  RD?: string;
  acl?: string;
  whitelist?: string[];
}

export interface UpdateProgramInput {
  name?: string;
  parent?: number;
  budget?: string;
  budgetUnit?: string;
  begin?: string;
  end?: string;
  days?: number;
  desc?: string;
  PM?: string;
  PO?: string;
  QD?: string;
  RD?: string;
  acl?: string;
  whitelist?: string[];
}

export class ProgramApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getPrograms(order?: string): Promise<unknown> {
    const response = await this.http.request('GET', '/programs', { params: { order: this.normalizeOptionalString(order) } });
    return toServerListResult(response, ['programs']);
  }

  async getProgramDetail(programId: number): Promise<unknown> {
    return this.http.request('GET', `/programs/${programId}`);
  }

  async getProgramAll(input: { status?: string; orderBy?: string; limit?: number } = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', this.buildQueryString('/program-all-0.json', {
      status: input.status,
      orderBy: input.orderBy,
      limit: input.limit,
    }));
  }

  async getProgramTrack(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-track-${programId}.json`);
  }

  async getProgramStakeholders(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-stakeholder-${programId}.json`);
  }

  async getProgramProducts(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-product-${programId}.json`);
  }

  async getProgramProjects(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-project-${programId}.json`);
  }

  async getProgramKanban(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-kanban-${programId}.json`);
  }

  async createProgram(input: CreateProgramInput): Promise<unknown> {
    const formData: Record<string, unknown> = { name: input.name };
    if (input.parent !== undefined) formData.parent = input.parent;
    if (input.budget !== undefined) formData.budget = input.budget;
    if (input.budgetUnit !== undefined) formData.budgetUnit = input.budgetUnit;
    if (input.begin !== undefined) formData.begin = input.begin;
    if (input.end !== undefined) formData.end = input.end;
    if (input.days !== undefined) formData.days = input.days;
    if (input.desc !== undefined) formData.desc = input.desc;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    if (input.whitelist && input.whitelist.length > 0) formData.whitelist = input.whitelist.join(',');
    return this.http.legacyRequest('POST', '/program-create.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async editProgram(programId: number, input: UpdateProgramInput): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.name !== undefined) formData.name = input.name;
    if (input.parent !== undefined) formData.parent = input.parent;
    if (input.budget !== undefined) formData.budget = input.budget;
    if (input.budgetUnit !== undefined) formData.budgetUnit = input.budgetUnit;
    if (input.begin !== undefined) formData.begin = input.begin;
    if (input.end !== undefined) formData.end = input.end;
    if (input.days !== undefined) formData.days = input.days;
    if (input.desc !== undefined) formData.desc = input.desc;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    if (input.whitelist !== undefined) formData.whitelist = input.whitelist.join(',');
    return this.http.legacyRequest('POST', `/program-edit-${programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async startProgram(programId: number, realBegan?: string, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (realBegan) formData.realBegan = realBegan;
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/program-start-${programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async activateProgram(programId: number, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/program-activate-${programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async suspendProgram(programId: number, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/program-suspend-${programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async closeProgram(programId: number, realEnd?: string, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (realEnd) formData.realEnd = realEnd;
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/program-close-${programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteProgram(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-delete-${programId}-yes.json`);
  }

  async createProgramStakeholder(input: { programId: number; account: string; role?: string }): Promise<unknown> {
    const formData: Record<string, unknown> = { user: input.account };
    if (input.role !== undefined) formData.role = input.role;
    return this.http.legacyRequest('POST', `/program-createStakeholder-${input.programId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkProgramStakeholder(input: { programId: number; account: string }): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-unlinkStakeholder-${input.programId}-${input.account}-yes.json`);
  }

  async batchUnlinkProgramStakeholders(input: { programId: number; accounts: string[] }): Promise<unknown> {
    if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
      throw new Error('accounts 至少需要 1 项');
    }
    return this.http.legacyRequest('POST', `/program-batchUnlinkStakeholders-${input.programId}.json`, {
      data: toFormUrlEncoded({ userIdList: input.accounts }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unbindProgramWhitelist(input: { programId: number; account: string }): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-unbindWhitelist-${input.programId}-${input.account}-yes.json`);
  }

  async setProgramOrder(programId: number, order: number): Promise<unknown> {
    return this.http.legacyRequest('POST', `/program-updateOrder-${programId}.json`, {
      data: toFormUrlEncoded({ order }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportProgram(programId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/program-export-${programId}.json`);
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
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
}
