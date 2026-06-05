import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

export class ProductApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProducts(): Promise<unknown> {
    const response = await this.http.request('GET', '/products');
    return toServerListResult(response, ['products']);
  }

  async getProductDetail(productId: number): Promise<unknown> {
    return this.http.request('GET', `/products/${productId}`);
  }
}
