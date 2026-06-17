import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';
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

export interface TestTaskActionInput {
  comment?: string;
}

export interface CloseTestTaskInput extends TestTaskActionInput {
  realFinishedDate?: string;
  mailto?: string[];
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
    const { project, productID, ...testTask } = this.normalizeTestTaskInput(payload, ['name', 'begin', 'end']);
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
    const formData = toFormUrlEncoded(this.normalizeTestTaskInput(update, []) as Record<string, unknown>);
    return this.http.legacyRequest('POST', `/testtask-edit-${testTaskId}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async startTestTask(testTaskId: number, input: TestTaskActionInput = {}): Promise<unknown> {
    return this.submitStatusAction('start', testTaskId, 'doing', input);
  }

  async activateTestTask(testTaskId: number, input: TestTaskActionInput = {}): Promise<unknown> {
    return this.submitStatusAction('activate', testTaskId, 'doing', input);
  }

  async blockTestTask(testTaskId: number, input: TestTaskActionInput = {}): Promise<unknown> {
    return this.submitStatusAction('block', testTaskId, 'blocked', input);
  }

  async closeTestTask(testTaskId: number, input: CloseTestTaskInput = {}): Promise<unknown> {
    const normalized = this.normalizeActionInput(input) as Record<string, unknown>;
    normalized.status = 'done';
    if (Array.isArray(input.mailto)) {
      normalized.mailto = input.mailto
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item): item is string => typeof item === 'string' && item !== '');
    }
    if (typeof input.realFinishedDate === 'string') {
      const realFinishedDate = this.normalizeOptionalString(input.realFinishedDate);
      if (realFinishedDate !== undefined) normalized.realFinishedDate = realFinishedDate;
    }

    return this.http.legacyRequest('POST', `/testtask-close-${testTaskId}.json`, {
      data: toFormUrlEncoded(normalized).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteTestTask(testTaskId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testtask-delete-${testTaskId}-yes.json`);
  }

  async unlinkCase(rowID: number, confirm: 'yes' | 'no' = 'yes'): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testtask-unlinkCase-${rowID}-${confirm}.json`);
  }

  async batchUnlinkCases(input: { taskID: number; caseIDList: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIDList) || input.caseIDList.length === 0) {
      throw new Error('caseIDList 至少需要 1 项');
    }
    return this.http.legacyRequest('POST', `/testtask-batchUnlinkCases-${input.taskID}.json`, {
      data: toFormUrlEncoded({ caseIDList: input.caseIDList }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async runCase(input: { runID?: number; caseID?: number; version?: number; confirm?: string; result: string; stepDesc?: string; realStory?: number; expect?: string; actual?: string; comment?: string; assignedTo?: string }): Promise<unknown> {
    if (!input.runID && !input.caseID) {
      throw new Error('runID 和 caseID 至少需要传一个');
    }
    const formData: Record<string, unknown> = { result: input.result };
    if (typeof input.stepDesc === 'string') formData.stepDesc = input.stepDesc;
    if (input.realStory !== undefined) formData.realStory = input.realStory;
    if (typeof input.expect === 'string') formData.expect = input.expect;
    if (typeof input.actual === 'string') formData.actual = input.actual;
    if (typeof input.comment === 'string') formData.comment = input.comment;
    if (typeof input.assignedTo === 'string') formData.assignedTo = input.assignedTo;

    const params: string[] = [];
    if (input.runID !== undefined) params.push(`runID=${input.runID}`);
    if (input.caseID !== undefined) params.push(`caseID=${input.caseID}`);
    if (input.version !== undefined) params.push(`version=${input.version}`);
    if (input.confirm) params.push(`confirm=${input.confirm}`);
    const qs = params.length ? `?${params.join('&')}` : '';

    return this.http.legacyRequest('POST', `/testtask-runCase-0.json${qs}`, {
      data: toFormUrlEncoded(formData).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchRunTestCases(input: { productID: number; from?: 'testcase' | 'testtask'; taskID?: number; confirm?: string; caseIDList: number[]; results: Record<string, { result: string; stepDesc?: string; expect?: string; actual?: string; comment?: string; assignedTo?: string }> }): Promise<unknown> {
    if (!Array.isArray(input.caseIDList) || input.caseIDList.length === 0) {
      throw new Error('caseIDList 至少需要 1 项');
    }
    if (!input.results || typeof input.results !== 'object' || Object.keys(input.results).length === 0) {
      throw new Error('results 不能为空');
    }
    const params: string[] = [`productID=${input.productID}`];
    if (input.from) params.push(`from=${input.from}`);
    if (input.taskID !== undefined) params.push(`taskID=${input.taskID}`);
    if (input.confirm) params.push(`confirm=${input.confirm}`);
    const qs = params.join('&');

    const formData: Record<string, unknown> = {
      caseIDList: input.caseIDList,
      results: input.results,
    };
    return this.http.legacyRequest('POST', `/testtask-batchRun-0.json?${qs}`, {
      data: toFormUrlEncoded(formData).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchAssignTestTasks(input: { taskID: number; caseIDList: number[]; assignedTo: string; comment?: string }): Promise<unknown> {
    if (!Array.isArray(input.caseIDList) || input.caseIDList.length === 0) {
      throw new Error('caseIDList 至少需要 1 项');
    }
    const formData: Record<string, unknown> = {
      caseIDList: input.caseIDList,
      assignedTo: input.assignedTo,
    };
    if (typeof input.comment === 'string') formData.comment = input.comment;
    return this.http.legacyRequest('POST', `/testtask-batchAssign-${input.taskID}.json`, {
      data: toFormUrlEncoded(formData).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async importTestTaskUnitResult(input: { productID: number; execution?: number; build?: number; owner?: string; members?: string[]; frame?: string; projectID?: number }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.execution !== undefined) formData.execution = input.execution;
    if (input.build !== undefined) formData.build = input.build;
    if (typeof input.owner === 'string') formData.owner = input.owner;
    if (Array.isArray(input.members) && input.members.length > 0) formData.members = input.members;
    if (typeof input.frame === 'string') formData.frame = input.frame;
    if (input.projectID !== undefined) formData.projectID = input.projectID;
    return this.http.legacyRequest('POST', `/testtask-importUnitResult-${input.productID}.json`, {
      data: toFormUrlEncoded(formData).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkCase(input: { taskID: number; type?: string; param?: number; caseIDList: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIDList) || input.caseIDList.length === 0) {
      throw new Error('caseIDList 至少需要 1 项');
    }
    const type = input.type ?? 'all';
    const param = input.param ?? 0;
    return this.http.legacyRequest('POST', `/testtask-linkCase-${input.taskID}-${type}-${param}.json`, {
      data: toFormUrlEncoded({ caseIDList: input.caseIDList }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeTestTaskInput<T extends object>(input: T, requiredFields: Array<'name' | 'begin' | 'end'>): T {
    const normalized = { ...(input as Record<string, unknown>) };

    for (const field of ['name', 'begin', 'end', 'owner', 'status', 'desc'] as const) {
      const value = normalized[field];
      if (typeof value !== 'string') continue;

      if (requiredFields.includes(field as 'name' | 'begin' | 'end')) {
        normalized[field] = requireNonBlank(value, `${field} 不能为空`);
        continue;
      }

      const trimmed = this.normalizeOptionalString(value);
      if (trimmed === undefined) delete normalized[field];
      else normalized[field] = trimmed;
    }

    const build = normalized.build;
    if (typeof build === 'string') {
      normalized.build = requireNonBlank(build, 'build 不能为空');
    }

    if (Array.isArray(normalized.type)) {
      normalized.type = normalized.type
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item): item is string => typeof item === 'string' && item !== '');
    }

    return normalized as T;
  }

  private normalizeOptionalString(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private submitStatusAction(action: 'start' | 'activate' | 'block', testTaskId: number, status: string, input: TestTaskActionInput): Promise<unknown> {
    const normalized = this.normalizeActionInput(input) as Record<string, unknown>;
    normalized.status = status;
    return this.http.legacyRequest('POST', `/testtask-${action}-${testTaskId}.json`, {
      data: toFormUrlEncoded(normalized).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeActionInput<T extends TestTaskActionInput>(input: T): T {
    const normalized = { ...(input as Record<string, unknown>) };
    const comment = normalized.comment;
    if (typeof comment === 'string') {
      const trimmed = this.normalizeOptionalString(comment);
      if (trimmed === undefined) delete normalized.comment;
      else normalized.comment = trimmed;
    }
    return normalized as unknown as T;
  }

}
