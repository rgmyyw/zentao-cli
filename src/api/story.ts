import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import type { ZentaoStory } from '../types/zentao.js';

export interface StoryListInput extends PaginationInput {
  productId: number;
}

export class StoryApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProductStories(input: StoryListInput): Promise<unknown> {
    const response = await this.http.request('GET', `/products/${input.productId}/stories`, {
      params: normalizePagination(input),
    });
    return toServerListResult(response, ['stories'], input);
  }

  async getStoryDetail(storyId: number): Promise<ZentaoStory> {
    return this.http.request<ZentaoStory>('GET', `/stories/${storyId}`);
  }

  async updateStory(storyId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/stories/${storyId}`, { data: update });
  }

  async changeStory(storyId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/change`, { data: update });
  }
}
