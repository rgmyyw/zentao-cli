import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

export class ProgramApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getPrograms(order?: string): Promise<unknown> {
    const response = await this.http.request('GET', '/programs', { params: { order: this.normalizeOptionalString(order) } });
    return toServerListResult(response, ['programs']);
  }

  async getProgramDetail(programId: number): Promise<unknown> {
    return this.http.request('GET', `/programs/${programId}`);
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  }
}
