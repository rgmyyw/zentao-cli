import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';

export interface TestCaseListInput extends PaginationInput {
  productId: number;
  status?: string;
  moduleId?: number;
}

export interface TestCaseStepInput {
  desc: string;
  expect: string;
  type?: 'step' | 'item' | 'group';
}

export interface CreateTestCaseInput {
  productId: number;
  title: string;
  type: string;
  steps: TestCaseStepInput[];
  branch?: number;
  module?: number;
  story?: number;
  stage?: string;
  precondition?: string;
  script?: string;
  pri?: number;
  keywords?: string;
  project?: number;
  execution?: number;
}

export interface UpdateTestCaseInput {
  branch?: number;
  module?: number;
  story?: number;
  title?: string;
  type?: string;
  stage?: string;
  precondition?: string;
  script?: string;
  pri?: number;
  steps?: TestCaseStepInput[];
  keywords?: string;
  project?: number;
  execution?: number;
}

export class TestCaseApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getProductTestCases(input: TestCaseListInput): Promise<unknown> {
    const response = await this.http.request<Record<string, unknown>>('GET', `/products/${input.productId}/testcases`, {
      params: {
        ...normalizePagination(input),
        status: input.status,
        module: input.moduleId,
      },
    });

    return toClientPaginatedListResult(response, ['cases', 'testcases'], input);
  }

  async getTestCaseDetail(testCaseId: number): Promise<unknown> {
    return this.http.request('GET', `/testcases/${testCaseId}`);
  }

  async createTestCase(productId: number, testCase: Omit<CreateTestCaseInput, 'productId'>): Promise<unknown> {
    return this.http.request('POST', `/products/${productId}/testcases`, {
      data: testCase,
    });
  }

  async updateTestCase(testCaseId: number, update: UpdateTestCaseInput): Promise<unknown> {
    return this.http.request('PUT', `/testcases/${testCaseId}`, {
      data: update,
    });
  }
}
