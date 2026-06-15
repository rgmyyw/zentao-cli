import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';
import { toFormUrlEncoded } from '../utils/form.js';
import type { ZentaoStory } from '../types/zentao.js';

export interface StoryListInput extends PaginationInput {
  productId: number;
}

export interface LinkStoriesToStoryInput {
  storyIds: number[];
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

  async linkStoriesToStory(storyId: number, input: LinkStoriesToStoryInput): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    return this.http.legacyRequest('POST', `/story-linkStory-${storyId}-linkStories-0.json`, {
      data: toFormUrlEncoded({ stories: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkStoryFromStory(storyId: number, linkedStoryId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/story-linkStory-${storyId}-remove-${linkedStoryId}.json`);
  }

  async recallStory(storyId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/story-recall-${storyId}-list-yes.json`);
  }

  async submitStoryReview(storyId: number): Promise<unknown> {
    return this.http.legacyRequest('POST', `/story-submitReview-${storyId}-story.json`);
  }

  async processStoryChange(storyId: number, result: 'yes' | 'no' = 'yes'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/story-processStoryChange-${storyId}-${result}.json`);
  }

  async batchReviewStories(input: { storyIds: number[]; result: 'pass' | 'reject' | 'clarify' | 'revert'; reason?: string }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    return this.http.legacyRequest('POST', `/story-batchReview-${input.result}-${encodeURIComponent(reason)}-story.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchCloseStories(input: { storyIds: number[]; productId: number; executionId?: number; closedReasons?: Record<number, string>; comments?: Record<number, string> }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const executionPart = input.executionId && input.executionId > 0 ? String(input.executionId) : '0';
    const enc = encodeURIComponent;
    const parts: string[] = [];
    for (const storyId of storyIds) {
      parts.push(`storyIdList${enc('[')}${enc(String(storyId))}${enc(']')}=${enc(String(storyId))}`);
    }
    for (const storyId of storyIds) {
      const reason = input.closedReasons?.[storyId];
      if (reason) parts.push(`closedReasons${enc('[')}${enc(String(storyId))}${enc(']')}=${enc(reason)}`);
    }
    for (const storyId of storyIds) {
      const comment = input.comments?.[storyId];
      if (comment) parts.push(`comments${enc('[')}${enc(String(storyId))}${enc(']')}=${enc(comment)}`);
    }
    return this.http.legacyRequest('POST', `/story-batchClose-${input.productId}-${executionPart}-story.json`, {
      data: parts.join('&'),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeStoryModule(input: { storyIds: number[]; moduleId: number; storyType?: 'story' | 'requirement' }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const storyType = input.storyType ?? 'story';
    return this.http.legacyRequest('POST', `/story-batchChangeModule-${input.moduleId}-${storyType}.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeStoryPlan(input: { storyIds: number[]; planId: number; oldPlanId?: number }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const oldPlanId = input.oldPlanId && input.oldPlanId > 0 ? input.oldPlanId : 0;
    return this.http.legacyRequest('POST', `/story-batchChangePlan-${input.planId}-${oldPlanId}.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeStoryBranch(input: { storyIds: number[]; branchId: number; confirm?: 'yes' | 'no'; storyType?: 'story' | 'requirement' }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const storyType = input.storyType ?? 'story';
    const confirm = input.confirm ?? 'yes';
    return this.http.legacyRequest('POST', `/story-batchChangeBranch-${input.branchId}-${confirm}-${storyType}.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeStoryStage(input: { storyIds: number[]; stage: string }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    if (typeof input.stage !== 'string' || !input.stage.trim()) {
      throw new Error('stage 不能为空');
    }
    return this.http.legacyRequest('POST', `/story-batchChangeStage-${encodeURIComponent(input.stage.trim())}.json`, {
      data: toFormUrlEncoded({ storyIdList: storyIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchAssignStoriesTo(input: { storyIds: number[]; assignedTo: string; comment?: string; storyType?: 'story' | 'requirement' }): Promise<unknown> {
    const storyIds = this.normalizeIdArray(input.storyIds, 'storyIds');
    const assignedTo = requireNonBlank(input.assignedTo, 'assignedTo 不能为空');
    const storyType = input.storyType ?? 'story';
    const comment = typeof input.comment === 'string' && input.comment.trim() !== '' ? input.comment.trim() : '';
    const data = toFormUrlEncoded({ storyIdList: storyIds, assignedTo, comment });
    return this.http.legacyRequest('POST', `/story-batchAssignTo-${storyType}.json`, {
      data,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      normalized[field] = requireNonBlank(normalized[field] as string | undefined | null, `${field} 不能为空`);
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

  private normalizeIdArray(values: number[], fieldName: string): number[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`${fieldName} 至少需要 1 项`);
    }

    return values;
  }

}
