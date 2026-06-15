import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface ProductPlanListInput {
  productId: number;
  branch?: string;
  status?: string;
  query?: string;
  order?: string;
}

export interface ClosePlanInput {
  closedReason: string;
  comment?: string;
}

export interface PlanActionInput {
  comment?: string;
}

export class PlanApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProductPlans(input: ProductPlanListInput): Promise<unknown> {
    const normalizedInput = this.normalizePlanListInput(input);
    const response = await this.http.request('GET', `/products/${normalizedInput.productId}/plans`, {
      params: {
        branch: normalizedInput.branch,
        status: normalizedInput.status,
        query: normalizedInput.query,
        order: normalizedInput.order,
      },
    });
    return toServerListResult(response, ['plans']);
  }

  private normalizePlanListInput(input: ProductPlanListInput): ProductPlanListInput {
    return {
      ...input,
      branch: this.normalizeOptionalString(input.branch),
      status: this.normalizeOptionalString(input.status),
      query: this.normalizeOptionalString(input.query),
      order: this.normalizeOptionalString(input.order),
    };
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  }

  async getPlanDetail(planId: number): Promise<unknown> {
    return this.http.request('GET', `/productplans/${planId}`);
  }

  async linkStoriesToPlan(planId: number, storyIds: number[]): Promise<unknown> {
    return this.http.request('POST', `/productplans/${planId}/linkstories`, { data: { stories: storyIds } });
  }

  async unlinkStoriesFromPlan(planId: number, storyIds: number[]): Promise<unknown> {
    return this.http.request('POST', `/productplans/${planId}/unlinkstories`, { data: { stories: storyIds } });
  }

  async linkBugsToPlan(planId: number, bugIds: number[]): Promise<unknown> {
    return this.http.request('POST', `/productplans/${planId}/linkbugs`, { data: { bugs: bugIds } });
  }

  async unlinkBugsFromPlan(planId: number, bugIds: number[]): Promise<unknown> {
    return this.http.request('POST', `/productplans/${planId}/unlinkbugs`, { data: { bugs: bugIds } });
  }

  async startPlan(planId: number, input: PlanActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', `/productplan-start-${planId}-yes.json${this.buildCommentQuery(input.comment)}`);
  }

  async finishPlan(planId: number, input: PlanActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', `/productplan-finish-${planId}-yes.json${this.buildCommentQuery(input.comment)}`);
  }

  async activatePlan(planId: number, input: PlanActionInput = {}): Promise<unknown> {
    return this.http.legacyRequest('GET', `/productplan-activate-${planId}-yes.json${this.buildCommentQuery(input.comment)}`);
  }

  async closePlan(planId: number, input: ClosePlanInput): Promise<unknown> {
    const normalized = this.normalizeClosePlanInput(input);
    return this.http.legacyRequest('POST', `/productplan-close-${planId}.json`, {
      data: toFormUrlEncoded(normalized as unknown as Record<string, unknown>).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeClosePlanInput(input: ClosePlanInput): ClosePlanInput {
    return {
      closedReason: this.normalizeRequiredString(input.closedReason, 'closedReason'),
      comment: this.normalizeOptionalString(input.comment),
    };
  }

  private normalizeRequiredString(value: string, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} 不能为空`);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new Error(`${fieldName} 不能为空`);
    }

    return normalized;
  }

  private buildCommentQuery(comment?: string): string {
    const normalizedComment = this.normalizeOptionalString(comment);
    if (!normalizedComment) return '';
    return `?${toFormUrlEncoded({ comment: normalizedComment }).toString()}`;
  }
}
