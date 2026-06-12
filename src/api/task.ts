import type { HttpError, ZentaoHttpClient } from '../core/http.js';
import { extractItems, toClientPaginatedListResult, toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
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

  private async getAllMyTasksByPages(total: number): Promise<ZentaoTask[]> {
    const limit = 100;
    const totalPages = Math.min(Math.ceil(total / limit), 1000);
    const tasks: ZentaoTask[] = [];

    for (let page = 1; page <= totalPages; page += 1) {
      const response = await this.http.request<{ tasks?: ZentaoTask[] } | ZentaoTask[]>('GET', '/tasks', {
        params: {
          assignedTo: this.http.username,
          page,
          limit,
        },
      });
      tasks.push(...extractItems<ZentaoTask>(response, ['tasks']));
    }

    return tasks;
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

  async activateTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/activate`, { data: this.normalizeTaskInput(data) });
  }

  async assignTask(taskId: number, data: Record<string, unknown>): Promise<unknown> {
    const normalizedData = this.normalizeTaskInput(data);
    normalizedData.assignedTo = this.requireNonBlank(normalizedData.assignedTo, 'assignedTo 不能为空');
    return this.http.request('POST', `/tasks/${taskId}/assignto`, { data: normalizedData });
  }

  async deleteTask(taskId: number): Promise<unknown> {
    return this.http.request('DELETE', `/tasks/${taskId}`);
  }

  async finishTask(taskId: number, update: Record<string, unknown> = {}): Promise<unknown> {
    const normalizedUpdate = this.normalizeTaskInput(update);
    normalizedUpdate.realStarted = this.requireNonBlank(normalizedUpdate.realStarted, 'realStarted 不能为空');
    normalizedUpdate.finishedDate = this.requireNonBlank(normalizedUpdate.finishedDate, 'finishedDate 不能为空');
    return this.http.request('POST', `/tasks/${taskId}/finish`, {
      data: normalizedUpdate,
    });
  }

  async createTask(task: Record<string, unknown> & { execution: number }): Promise<unknown> {
    const normalizedTask = this.normalizeTaskInput(task, ['name', 'assignedTo', 'estStarted', 'deadline']);
    return this.http.request('POST', `/executions/${task.execution}/tasks`, {
      data: normalizedTask,
    });
  }

  private normalizeRecordEstimateInput(input: RecordTaskEstimateInput): RecordTaskEstimateInput {
    const date = this.requireNonBlank(input.date, 'date 不能为空');
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
        normalized[field] = this.requireNonBlank(value, `${field} 不能为空`);
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

  private requireNonBlank(value: unknown, message: string): string {
    if (typeof value !== 'string') throw new Error(message);
    const normalized = value.trim();
    if (normalized === '') throw new Error(message);
    return normalized;
  }
}

function isHttpStatusError(error: unknown, statusCode: number): error is HttpError {
  return error instanceof Error && 'statusCode' in error && (error as HttpError).statusCode === statusCode;
}
