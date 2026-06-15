import type { ZentaoHttpClient } from '../core/http.js';
import { isHttpStatusError } from '../core/http-error.js';
import { extractItems, toClientPaginatedListResult, toServerListResult } from '../core/list-result.js';
import { fetchAllPages, normalizePagination, type PaginationInput } from '../core/pagination.js';
import { requireNonBlank } from '../core/validation.js';
import type { ZentaoTask } from '../types/zentao.js';
import { toFormUrlEncoded } from '../utils/form.js';

export interface MyTaskListInput extends PaginationInput {
  status?: string;
}

export interface RecordTaskEstimateInput {
  date: string;
  consumed: number;
  left: number;
  work?: string;
}

export type EditTaskEstimateInput = RecordTaskEstimateInput;

export interface ConvertBugToTaskInput {
  bugId: number;
  execution: number;
  project: number;
  name: string;
  assignedTo: string;
  estStarted: string;
  deadline: string;
  type?: string;
  estimate?: number;
  desc?: string;
  pri?: number;
}

export interface CancelTaskInput {
  comment?: string;
}

export class TaskApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getMyTasks(input: MyTaskListInput = {}): Promise<unknown> {
    const pagination = normalizePagination(input);

    // ZenTao's /tasks endpoint ignores status/limit in some deployments, and its
    // page query behaves like "return the first N tasks". Fetch the user's full
    // task list, then apply status filtering and pagination on the client.
    const firstResponse = await this.http.request<{ tasks?: ZentaoTask[] } | ZentaoTask[]>('GET', '/tasks', {
      params: {
        assignedTo: this.http.username,
        page: 1,
      },
    });

    const firstPage = toServerListResult<ZentaoTask>(firstResponse, ['tasks'], { page: 1, limit: 1 });
    const total = Math.max(firstPage.total, firstPage.items.length);
    const fullResponse = total > firstPage.items.length
      ? await this.http.request<{ tasks?: ZentaoTask[] } | ZentaoTask[]>('GET', '/tasks', {
        params: {
          assignedTo: this.http.username,
          page: total,
        },
      })
      : firstResponse;

    const fullTasks = extractItems<ZentaoTask>(fullResponse, ['tasks']);
    const allTasks = total > fullTasks.length ? await this.getAllMyTasksByPages(total) : fullTasks;
    const filteredTasks = input.status && input.status !== 'all'
      ? allTasks.filter(task => task.status === input.status)
      : allTasks;

    return {
      ...toClientPaginatedListResult({ tasks: filteredTasks }, ['tasks'], pagination),
      scanned: allTasks.length,
    };
  }

  async getTaskDetail(taskId: number): Promise<ZentaoTask> {
    return this.http.request<ZentaoTask>('GET', `/tasks/${taskId}`);
  }

  async recordEstimate(taskId: number, input: RecordTaskEstimateInput): Promise<unknown> {
    const normalized = this.normalizeRecordEstimateInput(input);
    const payload = {
      date: normalized.date,
      objectType: 'task',
      objectID: taskId,
      id: [0],
      dates: [normalized.date],
      consumed: [normalized.consumed],
      left: [normalized.left],
      work: [normalized.work ?? ''],
    };

    try {
      return await this.http.request('POST', `/taskrecordestimate/${taskId}`, {
        data: payload,
      });
    } catch (error) {
      if (!isHttpStatusError(error, 404) && !(error instanceof Error && error.message.includes('404'))) {
        throw error;
      }

      const formData = toFormUrlEncoded(payload);
      return this.http.legacyRequest('POST', `/task-recordEstimate-${taskId}.json?onlybody=yes`, {
        data: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
  }

  async editEstimate(estimateId: number, input: EditTaskEstimateInput): Promise<unknown> {
    const normalized = this.normalizeRecordEstimateInput(input);
    return this.http.legacyRequest('POST', `/task-editEstimate-${estimateId}.json`, {
      data: toFormUrlEncoded(normalized as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteEstimate(estimateId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/task-deleteEstimate-${estimateId}-yes.json`);
  }

  async confirmStoryChange(taskId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/task-confirmStoryChange-${taskId}.json`);
  }

  private async getAllMyTasksByPages(total: number): Promise<ZentaoTask[]> {
    const pageSize = 100;
    type TasksResponse = { tasks?: ZentaoTask[] } | ZentaoTask[];

    const fetchTasksPage = async (page: number): Promise<{ items: ZentaoTask[]; total?: unknown }> => {
      const response = await this.http.request<TasksResponse>('GET', '/tasks', {
        params: {
          assignedTo: this.http.username,
          page,
          limit: pageSize,
        },
      });
      return { items: extractItems<ZentaoTask>(response, ['tasks']), total };
    };

    return fetchAllPages<ZentaoTask>({
      pageSize,
      fetchPage: fetchTasksPage,
    });
  }

  async updateTask(taskId: number, update: Record<string, unknown>): Promise<unknown> {
    const normalizedUpdate = this.normalizeTaskInput(update);
    return this.http.request('PUT', `/tasks/${taskId}`, {
      data: normalizedUpdate,
    });
  }

  async startTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    // Workaround for Zentao 18.5 bug: POST /tasks/{id}/start incorrectly sets
    // status to 'done' and changes assignedTo. Capture original assignee, call
    // start, then force status back to 'doing' and restore assignee.
    const normalizedData = this.normalizeTaskInput(data);
    const before = await this.getTaskDetail(taskId);
    const result = await this.http.request('POST', `/tasks/${taskId}/start`, { data: normalizedData });
    const assignedTo = (normalizedData.assignedTo as string | undefined) ?? before.assignedTo ?? before.openedBy;
    await this.updateTask(taskId, { status: 'doing', assignedTo });
    return result;
  }

  async pauseTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/pause`, { data: this.normalizeTaskInput(data) });
  }

  async restartTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/restart`, { data: this.normalizeTaskInput(data) });
  }

  async closeTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/close`, { data: this.normalizeTaskInput(data) });
  }

  async cancelTask(taskId: number, input: CancelTaskInput = {}): Promise<unknown> {
    const comment = this.normalizeOptionalString(input.comment);
    return this.http.legacyRequest('POST', `/task-cancel-${taskId}.json`, {
      data: toFormUrlEncoded({ status: 'cancel', comment: comment ?? '' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async activateTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/activate`, { data: this.normalizeTaskInput(data) });
  }

  async assignTask(taskId: number, data: Record<string, unknown>): Promise<unknown> {
    const normalizedData = this.normalizeTaskInput(data);
    normalizedData.assignedTo = requireNonBlank(normalizedData.assignedTo as string | undefined, 'assignedTo 不能为空');
    return this.http.request('POST', `/tasks/${taskId}/assignto`, { data: normalizedData });
  }

  async deleteTask(taskId: number): Promise<unknown> {
    return this.http.request('DELETE', `/tasks/${taskId}`);
  }

  async finishTask(taskId: number, update: Record<string, unknown> = {}): Promise<unknown> {
    const normalizedUpdate = this.normalizeTaskInput(update);
    normalizedUpdate.realStarted = requireNonBlank(normalizedUpdate.realStarted as string | undefined, 'realStarted 不能为空');
    normalizedUpdate.finishedDate = requireNonBlank(normalizedUpdate.finishedDate as string | undefined, 'finishedDate 不能为空');
    return this.http.request('POST', `/tasks/${taskId}/finish`, {
      data: normalizedUpdate,
    });
  }

  async batchFinishTasks(input: { taskIds: number[] }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchFinish.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchCancelTasks(input: { taskIds: number[] }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchCancel.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchCloseTasks(input: { taskIds: number[] }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchClose.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTaskBranch(input: { taskIds: number[]; branchId: number }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchChangeBranch.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds, branch: input.branchId } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTaskModule(input: { taskIds: number[]; moduleId: number }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchChangeModule.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds, module: input.moduleId } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchChangeTaskPlan(input: { taskIds: number[]; planId: number }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchChangePlan.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds, plan: input.planId } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchAssignTasksTo(input: { taskIds: number[]; assignedTo: string; comment?: string }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    const assignedTo = requireNonBlank(input.assignedTo, 'assignedTo 不能为空');
    const payload: Record<string, unknown> = { taskIDList: taskIds, assignedTo };
    if (typeof input.comment === 'string' && input.comment.trim() !== '') {
      payload.comment = input.comment.trim();
    }
    return this.http.legacyRequest('POST', '/task-batchAssignTo.json', {
      data: toFormUrlEncoded(payload),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchActivateTasks(input: { taskIds: number[] }): Promise<unknown> {
    const taskIds = normalizeTaskIdList(input.taskIds, 'taskIds');
    return this.http.legacyRequest('POST', '/task-batchActivate.json', {
      data: toFormUrlEncoded({ taskIDList: taskIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async createTask(task: Record<string, unknown> & { execution: number }): Promise<unknown> {
    const normalizedTask = this.normalizeTaskInput(task, ['name', 'assignedTo', 'estStarted', 'deadline']);
    return this.http.request('POST', `/executions/${task.execution}/tasks`, {
      data: normalizedTask,
    });
  }

  async convertBugToTask(input: ConvertBugToTaskInput): Promise<unknown> {
    const normalizedTask = this.normalizeTaskInput(input as unknown as Record<string, unknown>, ['name', 'assignedTo', 'estStarted', 'deadline']);
    const estimate = typeof normalizedTask.estimate === 'number' ? normalizedTask.estimate : undefined;
    const formPayload: Record<string, unknown> = {
      execution: input.execution,
      project: input.project,
      module: 0,
      story: 0,
      name: normalizedTask.name,
      type: normalizedTask.type ?? 'devel',
      assignedTo: [normalizedTask.assignedTo],
      estStarted: normalizedTask.estStarted,
      deadline: normalizedTask.deadline,
      desc: normalizedTask.desc ?? '',
      pri: normalizedTask.pri,
      status: 'wait',
      after: 'toTaskList',
    };

    if (estimate !== undefined) {
      formPayload.estimate = estimate;
      formPayload.left = estimate;
    }

    const path = `/task-create-${input.execution}-0-0-0-0-projectID=${input.project}-${input.bugId}.json`;

    return this.http.legacyRequest('POST', path, {
      data: toFormUrlEncoded(formPayload),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeRecordEstimateInput(input: RecordTaskEstimateInput): RecordTaskEstimateInput {
    const date = requireNonBlank(input.date, 'date 不能为空');
    const work = this.normalizeOptionalString(input.work);

    if (typeof input.consumed !== 'number' || Number.isNaN(input.consumed) || input.consumed <= 0) {
      throw new Error('consumed 必须大于 0');
    }

    if (typeof input.left !== 'number' || Number.isNaN(input.left) || input.left < 0) {
      throw new Error('left 不能小于 0');
    }

    return {
      date,
      consumed: input.consumed,
      left: input.left,
      work,
    };
  }

  private normalizeTaskInput(
    data: Record<string, unknown>,
    requiredFields: Array<'name' | 'assignedTo' | 'estStarted' | 'deadline'> = [],
  ): Record<string, unknown> {
    const stringFields = [
      'name',
      'type',
      'desc',
      'assignedTo',
      'estStarted',
      'deadline',
      'story',
      'status',
      'closedReason',
      'mailto',
      'comment',
      'realStarted',
      'finishedDate',
    ] as const;

    const normalized: Record<string, unknown> = { ...data };

    for (const field of stringFields) {
      if (!(field in normalized)) continue;
      const value = normalized[field];
      if (requiredFields.includes(field as 'name' | 'assignedTo' | 'estStarted' | 'deadline')) {
        normalized[field] = requireNonBlank(value as string | undefined, `${field} 不能为空`);
        continue;
      }
      const normalizedValue = this.normalizeOptionalString(value);
      if (normalizedValue === undefined) {
        delete normalized[field];
      } else {
        normalized[field] = normalizedValue;
      }
    }

    return normalized;
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  }

}

function normalizeTaskIdList(values: unknown, fieldName: string): number[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${fieldName} 至少需要 1 项`);
  }
  return values.map((value) => {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(`${fieldName} 项必须为正整数`);
    }
    return numeric;
  });
}
