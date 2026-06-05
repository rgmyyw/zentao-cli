import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';

export class ProjectApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjects(input: PaginationInput = {}): Promise<unknown> {
    const response = await this.http.request('GET', '/projects', { params: normalizePagination(input) });
    return toServerListResult(response, ['projects'], input);
  }

  async getProjectDetail(projectId: number): Promise<unknown> {
    return this.http.request('GET', `/projects/${projectId}`);
  }
}
