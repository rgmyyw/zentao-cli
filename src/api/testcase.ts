import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';

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
    const normalizedInput = this.normalizeTestCaseListInput(input);
    const response = await this.http.request<Record<string, unknown>>('GET', `/products/${normalizedInput.productId}/testcases`, {
      params: {
        ...normalizePagination(normalizedInput),
        status: normalizedInput.status,
        module: normalizedInput.moduleId,
      },
    });

    return toClientPaginatedListResult(response, ['cases', 'testcases'], normalizedInput);
  }

  async getTestCaseDetail(testCaseId: number): Promise<unknown> {
    return this.http.request('GET', `/testcases/${testCaseId}`);
  }

  async createTestCase(productId: number, testCase: Omit<CreateTestCaseInput, 'productId'>): Promise<unknown> {
    const normalizedTestCase = this.normalizeTestCaseInput(testCase, ['title', 'type']);
    return this.http.request('POST', `/products/${productId}/testcases`, {
      data: normalizedTestCase,
    });
  }

  async updateTestCase(testCaseId: number, update: UpdateTestCaseInput): Promise<unknown> {
    const normalizedUpdate = this.normalizeTestCaseInput(update, []);
    return this.http.request('PUT', `/testcases/${testCaseId}`, {
      data: normalizedUpdate,
    });
  }

  private normalizeTestCaseInput<T extends object>(input: T, requiredFields: Array<'title' | 'type'>): T {
    const normalized = { ...(input as Record<string, unknown>) };

    for (const field of ['title', 'type', 'stage', 'precondition', 'script', 'keywords'] as const) {
      const value = normalized[field];
      if (typeof value !== 'string') continue;

      if (requiredFields.includes(field as 'title' | 'type')) {
        normalized[field] = requireNonBlank(value as string | undefined | null, `${field} 不能为空`);
        continue;
      }

      const trimmed = this.normalizeOptionalString(value);
      if (trimmed === undefined) delete normalized[field];
      else normalized[field] = trimmed;
    }

    if (Array.isArray(normalized.steps)) {
      normalized.steps = normalized.steps.map((step) => this.normalizeStep(step));
    }

    return normalized as T;
  }

  private normalizeStep(step: unknown): TestCaseStepInput {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      throw new Error('steps 中的步骤必须是对象');
    }

    const record = step as Record<string, unknown>;
    const normalized: TestCaseStepInput = {
      desc: requireNonBlank(record.desc as string | undefined | null, 'steps.desc 不能为空'),
      expect: requireNonBlank(record.expect as string | undefined | null, 'steps.expect 不能为空'),
    };

    const type = record.type;
    if (typeof type === 'string') {
      const trimmed = this.normalizeOptionalString(type);
      if (trimmed) normalized.type = trimmed as TestCaseStepInput['type'];
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private normalizeTestCaseListInput(input: TestCaseListInput): TestCaseListInput {
    return {
      ...input,
      status: this.normalizeOptionalString(input.status),
    };
  }
}
