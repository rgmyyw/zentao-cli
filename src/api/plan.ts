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
    const response = await this.http.request('GET', `/products/${input.productId}/plans`, {
      params: {
        branch: input.branch,
        status: input.status,
        query: input.query,
        order: input.order,
      },
    });
    return toServerListResult(response, ['plans']);
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
