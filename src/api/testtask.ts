import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';

export interface TestTaskListInput extends PaginationInput {
  productId: number;
}

export interface CreateTestTaskInput {
  project: number;
  productID: number;
  name: string;
  build: number | string;
  begin: string;
  end: string;
  execution?: number;
  type?: string[];
  owner?: string;
  status?: string;
  pri?: number;
  desc?: string;
}

export interface UpdateTestTaskInput {
  project?: number;
  productID?: number;
  name?: string;
  build?: number | string;
  execution?: number;
  type?: string[];
  owner?: string;
  status?: string;
  pri?: number;
  begin?: string;
  end?: string;
  desc?: string;
}

export class TestTaskApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getTestTasks(input: TestTaskListInput): Promise<unknown> {
    const response = await this.http.request('GET', '/testtasks', {
      params: {
        ...normalizePagination(input),
        product: input.productId,
      },
    });
    return toServerListResult(response, ['testtasks'], input);
  }

  async getTestTaskDetail(testTaskId: number): Promise<unknown> {
    return this.http.request('GET', `/testtasks/${testTaskId}`);
  }

  async createTestTask(payload: CreateTestTaskInput): Promise<unknown> {
    const { project, productID, ...testTask } = payload;
    return this.http.request('POST', `/projects/${project}/testtasks`, {
      data: {
        product: productID,
        ...testTask,
      },
    });
  }

  async updateTestTask(testTaskId: number, update: UpdateTestTaskInput): Promise<unknown> {
    return this.http.request('PUT', `/testtasks/${testTaskId}`, {
      data: update,
    });
  }
}
