import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

export class ProgramApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getPrograms(order?: string): Promise<unknown> {
    const response = await this.http.request('GET', '/programs', { params: { order } });
    return toServerListResult(response, ['programs']);
  }

  async getProgramDetail(programId: number): Promise<unknown> {
    return this.http.request('GET', `/programs/${programId}`);
  }
}
