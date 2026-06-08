import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { toFormUrlEncoded } from '../utils/form.js';

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
    /**
     * 禅道 18.5 v1 testtaskEntry 只有 get/delete，没有 put 更新入口。
     * 旧版 testtask::edit() 控制器通过 $this->send() 返回 JSON，走 .json 扩展。
     */
    const formData = toFormUrlEncoded(update as Record<string, unknown>);
    return this.http.legacyRequest('POST', `/testtask-edit-${testTaskId}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }
}
