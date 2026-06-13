import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { requireNonBlank } from '../core/validation.js';

export interface CreateBuildInput {
  project: number;
  execution: number;
  product: number;
  branch?: number;
  name: string;
  builder: string;
  date?: string;
  desc?: string;
  scmPath?: string;
  filePath?: string;
}

export interface UpdateBuildInput {
  execution?: number;
  product?: number;
  name?: string;
  builder?: string;
  date?: string;
  desc?: string;
  scmPath?: string;
  filePath?: string;
}

export class BuildApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjectBuilds(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/builds`);
    return toServerListResult(response, ['builds']);
  }

  async getBuildDetail(buildId: number): Promise<unknown> {
    return this.http.request('GET', `/builds/${buildId}`);
  }

  async createBuild(payload: CreateBuildInput): Promise<unknown> {
    const { project, ...build } = this.normalizeBuildInput(payload, ['name', 'builder']);
    return this.http.request('POST', `/projects/${project}/builds`, { data: build });
  }

  async updateBuild(buildId: number, update: UpdateBuildInput): Promise<unknown> {
    return this.http.request('PUT', `/builds/${buildId}`, { data: this.normalizeBuildInput(update, []) });
  }

  private normalizeBuildInput<T extends object>(input: T, requiredFields: Array<'name' | 'builder'>): T {
    const normalized = { ...(input as Record<string, unknown>) };

    for (const field of ['name', 'builder', 'date', 'desc', 'scmPath', 'filePath'] as const) {
      const value = normalized[field];
      if (typeof value !== 'string') continue;

      if (requiredFields.includes(field as 'name' | 'builder')) {
        normalized[field] = requireNonBlank(value, `${field} 不能为空`);
        continue;
      }

      const trimmed = this.normalizeOptionalString(value);
      if (trimmed === undefined) delete normalized[field];
      else normalized[field] = trimmed;
    }

    return normalized as T;
  }

  private normalizeOptionalString(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

}
