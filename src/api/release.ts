import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

export class ReleaseApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProjectReleases(projectId: number): Promise<unknown> {
    const response = await this.http.request('GET', `/projects/${projectId}/releases`);
    return toServerListResult(response, ['releases']);
  }

  async getReleaseDetail(releaseId: number): Promise<unknown> {
    return this.http.request('GET', `/releases/${releaseId}`);
  }
}
