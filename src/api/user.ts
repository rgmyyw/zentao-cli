import type { ZentaoHttpClient } from '../core/http.js';

export class UserApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getMyProfile(): Promise<unknown> {
    return this.http.request('GET', '/user');
  }
}
