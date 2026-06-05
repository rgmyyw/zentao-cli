import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination } from '../core/pagination.js';
import type { ZentaoBug, ZentaoExecution, ZentaoListResponse } from '../types/zentao.js';

export interface UpdateExecutionInput {
  project?: number;
  name?: string;
  code?: string;
  desc?: string;
  begin?: string;
  end?: string;
  days?: number;
  lifetime?: string;
  PO?: string;
  PM?: string;
  QD?: string;
  RD?: string;
  teamMembers?: string[];
  acl?: string;
  whitelist?: string[];
}

export interface ExecutionActionInput {
  comment?: string;
  realBegan?: string;
  realEnd?: string;
}

export interface PutoffExecutionInput {
  days: number;
  comment?: string;
}

export class ExecutionApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getExecutionDetail(executionId: number): Promise<ZentaoExecution> {
    return this.http.request<ZentaoExecution>('GET', `/executions/${executionId}`);
  }

  async getProjectExecutions(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/executions`);
    return toServerListResult(response, ['executions']);
  }

  async getExecutionBuilds(executionId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/executions/${executionId}/builds`);
    return toServerListResult(response, ['builds']);
  }

  async getExecutionBugs(executionId: number, params: { page?: number; limit?: number; status?: string } = {}): Promise<unknown> {
    const pagination = normalizePagination(params);
    const response = await this.http.request<ZentaoListResponse<ZentaoBug> & { bugs?: ZentaoBug[] }>('GET', `/executions/${executionId}/bugs`, {
      params: {
        ...pagination,
        status: params.status,
      },
    });
    return toServerListResult(response, ['bugs'], params);
  }

  async updateExecution(executionId: number, update: UpdateExecutionInput): Promise<unknown> {
    return this.http.request('PUT', `/executions/${executionId}`, { data: update });
  }

  async startExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/start`, { data: payload });
  }

  async closeExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/close`, { data: payload });
  }

  async suspendExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/suspend`, { data: payload });
  }

  async activateExecution(executionId: number, payload: ExecutionActionInput = {}): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/activate`, { data: payload });
  }

  async putoffExecution(executionId: number, payload: PutoffExecutionInput): Promise<unknown> {
    return this.http.request('POST', `/executions/${executionId}/putoff`, { data: payload });
  }
}
