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

  async createStory(data: Record<string, unknown> & { product: number }): Promise<unknown> {
    return this.http.request('POST', `/products/${data.product}/stories`, {
      data: this.normalizeStoryInput(data, { requiredFields: ['title'] }),
    });
  }

  async updateStory(storyId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/stories/${storyId}`, {
      data: this.normalizeStoryInput(update, { requiredFields: [] }),
    });
  }

  async changeStory(storyId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/change`, {
      data: this.normalizeStoryInput(update, { requiredFields: ['title'] }),
    });
  }

  async closeStory(storyId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/close`, {
      data: this.normalizeStoryInput(data, { requiredFields: [] }),
    });
  }

  async assignStory(storyId: number, data: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/assignto`, {
      data: this.normalizeStoryInput(data, { requiredFields: ['assignedTo'] }),
    });
  }

  async activateStory(storyId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/activate`, {
      data: this.normalizeStoryInput(data, { requiredFields: [] }),
    });
  }

  async reviewStory(storyId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/stories/${storyId}/review`, {
      data: this.normalizeStoryInput(data, { requiredFields: [] }),
    });
  }

  private normalizeStoryInput(
    input: Record<string, unknown>,
    options: { requiredFields: Array<'title' | 'assignedTo'> },
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...input };

    for (const field of options.requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(normalized, field)) {
        throw new Error(`${field} 不能为空`);
      }
      normalized[field] = this.requireNonBlank(normalized[field], `${field} 不能为空`);
    }

    for (const key of ['title', 'assignedTo', 'comment', 'reviewer', 'reviewedBy', 'spec', 'verify', 'type', 'source', 'sourceNote', 'category', 'keywords', 'stage', 'mailto', 'closedReason', 'reviewedDate'] as const) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) {
        continue;
      }

      const value = normalized[key];
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      }
    }

    for (const key of ['mailto', 'notifyEmail'] as const) {
      if (!Object.prototype.hasOwnProperty.call(normalized, key)) {
        continue;
      }

      const value = normalized[key];
      if (!Array.isArray(value)) {
        continue;
      }

      normalized[key] = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    return normalized;
  }

  private requireNonBlank(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new Error(message);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new Error(message);
    }

    return normalized;
  }
}
