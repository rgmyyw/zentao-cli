import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';

export interface ProductPlanListInput {
  productId: number;
  branch?: string;
  status?: string;
  query?: string;
  order?: string;
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
}
