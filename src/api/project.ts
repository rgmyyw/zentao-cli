import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface CreateProjectInput {
  name: string;
  code: string;
  type: string;
  parent?: number;
  model?: string;
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
  teamMembers?: string[];
  products?: number[];
}

export interface UpdateProjectInput {
  name?: string;
  code?: string;
  type?: string;
  parent?: number;
  model?: string;
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

export class ProjectApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjects(input: PaginationInput = {}): Promise<unknown> {
    const response = await this.http.request('GET', '/projects', { params: normalizePagination(input) });
    return toServerListResult(response, ['projects'], input);
  }

  async getProjectDetail(projectId: number): Promise<unknown> {
    return this.http.request('GET', `/projects/${projectId}`);
  }

  async getProjectAll(input: { status?: string; orderBy?: string; limit?: number } = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', this.buildQueryString('/project-all-0.json', {
      status: input.status,
      orderBy: input.orderBy,
      limit: input.limit,
    }));
  }

  async getProjectTeam(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-team-${projectId}.json`);
  }

  async getProjectManagePriv(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-managePriv-${projectId}.json`);
  }

  async getProjectDynamic(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-dynamic-${projectId}.json`);
  }

  async getProjectGroup(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-group-${projectId}.json`);
  }

  async getProjectWhitelist(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-whitelist-${projectId}.json`);
  }

  async getProjectLinkedProducts(projectId: number, from: string = 'project'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-manageProducts-${projectId}-${from}.json`);
  }

  async createProject(input: CreateProjectInput): Promise<unknown> {
    const formData: Record<string, unknown> = {
      name: input.name,
      code: input.code,
      type: input.type,
    };
    if (input.parent !== undefined) formData.parent = input.parent;
    if (input.model !== undefined) formData.model = input.model;
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
    if (input.teamMembers && input.teamMembers.length > 0) formData.teamMembers = input.teamMembers.join(',');
    if (input.products && input.products.length > 0) formData.products = input.products.join(',');
    return this.http.legacyRequest('POST', '/project-create.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async editProject(projectId: number, input: UpdateProjectInput): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.name !== undefined) formData.name = input.name;
    if (input.code !== undefined) formData.code = input.code;
    if (input.type !== undefined) formData.type = input.type;
    if (input.parent !== undefined) formData.parent = input.parent;
    if (input.model !== undefined) formData.model = input.model;
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
    return this.http.legacyRequest('POST', `/project-edit-${projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditProjects(input: { projectIds: number[]; type?: string; PM?: string; PO?: string; QD?: string; RD?: string; acl?: string }): Promise<unknown> {
    if (!Array.isArray(input.projectIds) || input.projectIds.length === 0) {
      throw new Error('projectIds 至少需要 1 项');
    }
    const formData: Record<string, unknown> = { projectIdList: input.projectIds };
    if (input.type !== undefined) formData.type = input.type;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.PO !== undefined) formData.PO = input.PO;
    if (input.QD !== undefined) formData.QD = input.QD;
    if (input.RD !== undefined) formData.RD = input.RD;
    if (input.acl !== undefined) formData.acl = input.acl;
    return this.http.legacyRequest('POST', '/project-batchEdit-0.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async startProject(projectId: number, realBegan?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (realBegan) formData.realBegan = realBegan;
    return this.http.legacyRequest('POST', `/project-start-${projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async suspendProject(projectId: number, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/project-suspend-${projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async activateProject(projectId: number, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/project-activate-${projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async closeProject(projectId: number, realEnd?: string, comment?: string): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (realEnd) formData.realEnd = realEnd;
    if (comment) formData.comment = comment;
    return this.http.legacyRequest('POST', `/project-close-${projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteProject(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-delete-${projectId}-yes.json`);
  }

  async manageProjectMembers(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-manageMembers-${projectId}.json`);
  }

  async unlinkProjectMember(projectId: number, userId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-unlinkMember-${projectId}-${userId}-yes.json`);
  }

  async createProjectGroup(input: { projectId: number; name: string; desc?: string; PM?: string; limit?: number; roles?: string[]; accounts?: string[] }): Promise<unknown> {
    const formData: Record<string, unknown> = { name: input.name };
    const desc = this.normalizeOptionalText(input.desc);
    if (desc !== undefined) formData.desc = desc;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.limit !== undefined) formData.limit = input.limit;
    if (input.roles && input.roles.length > 0) formData.roles = input.roles.join(',');
    if (input.accounts && input.accounts.length > 0) formData.accounts = input.accounts.join(',');
    return this.http.legacyRequest('POST', `/project-createGroup-${input.projectId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async editProjectGroup(input: { groupId: number; name?: string; desc?: string; PM?: string; limit?: number; roles?: string[]; accounts?: string[] }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.name !== undefined) formData.name = input.name;
    const desc = this.normalizeOptionalText(input.desc);
    if (desc !== undefined) formData.desc = desc;
    if (input.PM !== undefined) formData.PM = input.PM;
    if (input.limit !== undefined) formData.limit = input.limit;
    if (input.roles !== undefined) formData.roles = input.roles.join(',');
    if (input.accounts !== undefined) formData.accounts = input.accounts.join(',');
    return this.http.legacyRequest('POST', `/project-editGroup-${input.groupId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async copyProjectGroup(fromGroupId: number, name?: string): Promise<unknown> {
    const formData: Record<string, unknown> = { from: fromGroupId };
    if (name !== undefined) formData.name = name;
    return this.http.legacyRequest('POST', `/project-copyGroup-${fromGroupId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async manageProjectGroupMembers(projectId: number, groupId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-manageGroupMember-${projectId}-${groupId}.json`);
  }

  async addProjectWhitelist(input: { projectId: number; accounts: string[] }): Promise<unknown> {
    if (!Array.isArray(input.accounts) || input.accounts.length === 0) {
      throw new Error('accounts 至少需要 1 项');
    }
    return this.http.legacyRequest('POST', `/project-addWhitelist-${input.projectId}.json`, {
      data: toFormUrlEncoded({ accounts: input.accounts.join(',') }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unbindProjectWhitelist(input: { projectId: number; account: string }): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-unbindWhitelist-${input.projectId}-${input.account}-yes.json`);
  }

  async setProjectOrder(projectId: number, order: number): Promise<unknown> {
    return this.http.legacyRequest('POST', `/project-updateOrder-${projectId}.json`, {
      data: toFormUrlEncoded({ order }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportProject(projectId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/project-export-${projectId}.json`);
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

  private normalizeOptionalText(value?: string): string | undefined {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
}
