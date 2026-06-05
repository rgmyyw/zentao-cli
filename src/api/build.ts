import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

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
    const { project, ...build } = payload;
    return this.http.request('POST', `/projects/${project}/builds`, { data: build });
  }

  async updateBuild(buildId: number, update: UpdateBuildInput): Promise<unknown> {
    return this.http.request('PUT', `/builds/${buildId}`, { data: update });
  }
}
