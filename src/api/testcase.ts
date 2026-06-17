import type { ZentaoHttpClient } from '../core/http.js';
import { toClientPaginatedListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import { toFormUrlEncoded } from '../utils/form.js';
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

export interface ConfirmTestCaseStoryChangeInput {
  caseId: number;
}

export interface ConfirmTestCaseLibcaseChangeInput {
  caseId: number;
  libcaseId: number;
}

export interface BatchConfirmTestCaseStoryChangeInput {
  caseIds: number[];
}

export interface BatchEditTestCaseRowInput {
  caseId: number;
  title: string;
  type: string;
  pri: number | string;
  module: number | string;
  story: number | string;
  stage?: string | string[];
  branch?: number | string;
  scene?: number | string;
  status?: string;
  color?: string;
  precondition?: string;
  keywords?: string;
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

  async confirmStoryChange(caseId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-confirmStoryChange-${caseId}.json`);
  }

  async confirmLibcaseChange(input: ConfirmTestCaseLibcaseChangeInput): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-confirmLibcaseChange-${input.caseId}-${input.libcaseId}.json`);
  }

  async ignoreLibcaseChange(caseId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-ignoreLibcaseChange-${caseId}.json`);
  }

  async batchConfirmStoryChange(productId: number, input: BatchConfirmTestCaseStoryChangeInput): Promise<unknown> {
    const caseIds = this.normalizeIdArray(input.caseIds, 'caseIds');
    return this.http.legacyRequest('POST', `/testcase-batchConfirmStoryChange-${productId}.json`, {
      data: toFormUrlEncoded({ caseIDList: caseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkBugToTestCase(caseId: number, bugIds: number[]): Promise<unknown> {
    if (!Array.isArray(bugIds) || bugIds.length === 0) throw new Error('bugIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-linkBugs-${caseId}.json`, {
      data: toFormUrlEncoded({ bugIdList: bugIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async unlinkBugFromTestCase(caseId: number, bugId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-unlinkBug-${caseId}-${bugId}-yes.json`);
  }

  async linkCases(caseId: number, linkedCaseIds: number[]): Promise<unknown> {
    if (!Array.isArray(linkedCaseIds) || linkedCaseIds.length === 0) throw new Error('linkedCaseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-linkCases-${caseId}.json`, {
      data: toFormUrlEncoded({ caseIdList: linkedCaseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async createBugFromTestCase(input: { caseId: number; productId?: number; branch?: number; build?: number; title?: string; pri?: number; severity?: number; type?: string; steps?: string; comment?: string }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.productId !== undefined) formData.product = input.productId;
    if (input.branch !== undefined) formData.branch = input.branch;
    if (input.build !== undefined) formData.build = input.build;
    if (input.title !== undefined) formData.title = input.title;
    if (input.pri !== undefined) formData.pri = input.pri;
    if (input.severity !== undefined) formData.severity = input.severity;
    if (input.type !== undefined) formData.type = input.type;
    if (input.steps !== undefined) formData.steps = input.steps;
    if (input.comment !== undefined) formData.comment = input.comment;
    return this.http.legacyRequest('POST', `/testcase-createBug-${input.caseId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchCreateTestCases(input: { productId: number; branch?: number; moduleId?: number; storyId?: number; cases: Array<{ title: string; type: string; pri?: number; stage?: string | string[]; precondition?: string; keywords?: string; module?: number | string; story?: number | string; branch?: number | string; scene?: number | string; color?: string; needReview?: number | string; steps?: TestCaseStepInput[] }>; confirm?: boolean }): Promise<unknown> {
    if (!Array.isArray(input.cases) || input.cases.length === 0) throw new Error('cases 至少需要 1 项');
    const formData = new URLSearchParams();
    input.cases.forEach((testCase, index) => {
      const row = String(index);
      this.appendIndexedField(formData, 'title', row, requireNonBlank(testCase.title, 'title 不能为空'));
      this.appendIndexedField(formData, 'type', row, requireNonBlank(testCase.type, 'type 不能为空'));
      this.appendIndexedField(formData, 'pri', row, testCase.pri ?? 3);
      this.appendIndexedField(formData, 'module', row, testCase.module ?? input.moduleId ?? 0);
      this.appendIndexedField(formData, 'story', row, testCase.story ?? input.storyId ?? 0);
      this.appendIndexedField(formData, 'branch', row, testCase.branch ?? input.branch ?? 0);
      this.appendIndexedField(formData, 'scene', row, testCase.scene ?? 0);
      this.appendIndexedField(formData, 'color', row, testCase.color ?? '');
      this.appendIndexedField(formData, 'precondition', row, testCase.precondition ?? '');
      this.appendIndexedField(formData, 'keywords', row, testCase.keywords ?? '');
      this.appendIndexedField(formData, 'needReview', row, testCase.needReview ?? 0);
      this.appendIndexedListField(formData, 'stage', row, testCase.stage);
      if (Array.isArray(testCase.steps)) {
        testCase.steps.forEach((step, stepIndex) => {
          formData.append(`steps[${row}][${stepIndex}][desc]`, step.desc);
          formData.append(`steps[${row}][${stepIndex}][expect]`, step.expect);
          if (step.type !== undefined) formData.append(`steps[${row}][${stepIndex}][type]`, step.type);
        });
      }
    });
    return this.http.legacyRequest('POST', `/testcase-batchCreate-${input.productId}-${input.branch ?? ''}-${input.moduleId ?? ''}-${input.storyId ?? ''}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditTestCases(input: { productId: number; branch?: number; type?: string; moduleId?: number; cases: BatchEditTestCaseRowInput[] }): Promise<unknown> {
    if (!Array.isArray(input.cases) || input.cases.length === 0) throw new Error('cases 至少需要 1 项');
    const formData = new URLSearchParams();
    for (const testCase of input.cases) {
      const caseId = this.normalizePositiveInt(testCase.caseId, 'caseId');
      formData.append('caseIDList[]', String(caseId));
      this.appendIndexedField(formData, 'title', caseId, requireNonBlank(testCase.title, 'title 不能为空'));
      this.appendIndexedField(formData, 'types', caseId, requireNonBlank(testCase.type, 'type 不能为空'));
      this.appendIndexedField(formData, 'pris', caseId, testCase.pri);
      this.appendIndexedField(formData, 'modules', caseId, testCase.module);
      this.appendIndexedField(formData, 'story', caseId, testCase.story);
      this.appendIndexedField(formData, 'scene', caseId, testCase.scene ?? 0);
      this.appendIndexedField(formData, 'statuses', caseId, testCase.status ?? 'normal');
      this.appendIndexedField(formData, 'color', caseId, testCase.color ?? '');
      this.appendIndexedField(formData, 'precondition', caseId, testCase.precondition ?? '');
      this.appendIndexedField(formData, 'keywords', caseId, testCase.keywords ?? '');
      if (testCase.branch !== undefined) this.appendIndexedField(formData, 'branches', caseId, testCase.branch);
      this.appendIndexedListField(formData, 'stages', caseId, testCase.stage);
    }
    return this.http.legacyRequest('POST', `/testcase-batchEdit-${input.productId}-${input.branch ?? ''}-${input.type ?? ''}-${input.moduleId ?? ''}.json`, {
      data: formData.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchDeleteTestCases(input: { productId: number; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-batchDelete-${input.productId}.json`, {
      data: toFormUrlEncoded({ caseIDList: input.caseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTestCaseBranch(input: { productId: number; branchId: number; caseIds: number[]; confirm?: string }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-batchChangeBranch-${input.branchId}.json`, {
      data: toFormUrlEncoded({ caseIDList: input.caseIds, confirm: input.confirm ?? '' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTestCaseModule(input: { productId: number; moduleId: number; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-batchChangeModule-${input.moduleId}.json`, {
      data: toFormUrlEncoded({ caseIDList: input.caseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTestCaseType(input: { productId: number; type: string; result: string; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-batchCaseTypeChange-${input.result}.json`, {
      data: toFormUrlEncoded({ type: input.type, caseIDList: input.caseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteTestCase(caseId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-delete-${caseId}-yes.json`);
  }

  async exportTestCases(input: { productId: number; orderBy?: string; taskId?: number }): Promise<unknown> {
    const params = new URLSearchParams();
    if (input.orderBy) params.set('orderBy', input.orderBy);
    if (input.taskId !== undefined) params.set('taskID', String(input.taskId));
    const qs = params.toString();
    return this.http.legacyRequest('GET', `/testcase-export-${input.productId}.json${qs ? `?${qs}` : ''}`);
  }

  async exportTestCaseTemplate(productId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-exportTemplate-${productId}.json`);
  }

  async importTestCases(input: { productId: number; branch?: number; file?: string }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.branch !== undefined) formData.branch = input.branch;
    if (input.file !== undefined) formData.file = input.file;
    return this.http.legacyRequest('POST', `/testcase-import-${input.productId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async importTestCasesFromLib(input: { productId: number; libId: number; branch?: number; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    const formData: Record<string, unknown> = { libID: input.libId, fromCaseIDList: input.caseIds };
    if (input.branch !== undefined) formData.branch = input.branch;
    return this.http.legacyRequest('POST', `/testcase-importFromLib-${input.productId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async importTestCaseToLib(caseId: number, libId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/testcase-importToLib-${caseId}-${libId}.json`);
  }

  async reviewTestCase(caseId: number, result: string, reason?: string): Promise<unknown> {
    const formData: Record<string, unknown> = { result };
    if (reason) formData.reason = reason;
    return this.http.legacyRequest('POST', `/testcase-review-${caseId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchReviewTestCases(input: { productId: number; result: string; reason?: string; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    const formData: Record<string, unknown> = { result: input.result, caseIdList: input.caseIds };
    if (input.reason) formData.reason = input.reason;
    return this.http.legacyRequest('POST', `/testcase-batchReview-${input.productId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async confirmTestCaseChange(input: { caseId: number; taskId?: number; from?: string }): Promise<unknown> {
    const params = new URLSearchParams();
    if (input.taskId !== undefined) params.set('taskID', String(input.taskId));
    if (input.from) params.set('from', input.from);
    const qs = params.toString();
    return this.http.legacyRequest('GET', `/testcase-confirmChange-${input.caseId}.json${qs ? `?${qs}` : ''}`);
  }

  async editTestCaseViaForm(input: { caseId: number; title?: string; type?: string; pri?: number; stage?: string; precondition?: string; keywords?: string; moduleId?: number; storyId?: number; steps?: TestCaseStepInput[]; comment?: string }): Promise<unknown> {
    const formData: Record<string, unknown> = {};
    if (input.title !== undefined) formData.title = input.title;
    if (input.type !== undefined) formData.type = input.type;
    if (input.pri !== undefined) formData.pri = input.pri;
    if (input.stage !== undefined) formData.stage = input.stage;
    if (input.precondition !== undefined) formData.precondition = input.precondition;
    if (input.keywords !== undefined) formData.keywords = input.keywords;
    if (input.moduleId !== undefined) formData.module = input.moduleId;
    if (input.storyId !== undefined) formData.story = input.storyId;
    if (input.steps !== undefined) formData.steps = input.steps;
    if (input.comment !== undefined) formData.comment = input.comment;
    return this.http.legacyRequest('POST', `/testcase-edit-${input.caseId}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async linkCasesToBug(input: { bugId: number; caseIds: number[] }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    return this.http.legacyRequest('POST', `/testcase-linkCases-${input.bugId}.json`, {
      data: toFormUrlEncoded({ caseIdList: input.caseIds }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchAssignTestCases(input: { productId: number; caseIds: number[]; assignedTo: string; lastEditedDate?: string }): Promise<unknown> {
    if (!Array.isArray(input.caseIds) || input.caseIds.length === 0) throw new Error('caseIds 至少需要 1 项');
    void input.productId;
    void input.assignedTo;
    void input.lastEditedDate;
    throw new Error('禅道 18.5 不支持 testcase/batchAssignTo');
  }

  async updateTestCaseOrder(input: { scenes: number[]; orderBy?: string }): Promise<unknown> {
    if (!Array.isArray(input.scenes) || input.scenes.length === 0) throw new Error('scenes 至少需要 1 项');
    const formData: Record<string, unknown> = {
      scenes: input.scenes.join(','),
      orderBy: input.orderBy ?? 'sort_desc',
    };
    return this.http.legacyRequest('POST', '/testcase-updateOrder.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

  private normalizeIdArray(values: number[], fieldName: string): number[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`${fieldName} 至少需要 1 项`);
    }

    return values;
  }

  private appendIndexedField(formData: URLSearchParams, field: string, id: number | string, value: unknown): void {
    if (value === undefined || value === null) return;
    formData.append(`${field}[${id}]`, String(value));
  }

  private appendIndexedListField(formData: URLSearchParams, field: string, id: number | string, value: string | string[] | undefined): void {
    if (value === undefined) return;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) formData.append(`${field}[${id}][]`, item);
  }

  private normalizePositiveInt(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw new Error(`${field} 必须是正整数`);
    return value;
  }
}
