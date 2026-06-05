import type { ZentaoHttpClient } from '../core/http.js';
import { toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import type { ZentaoTask } from '../types/zentao.js';

export interface MyTaskListInput extends PaginationInput {
  status?: string;
}

export class TaskApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getMyTasks(input: MyTaskListInput = {}): Promise<unknown> {
    const pagination = normalizePagination(input);
    const response = await this.http.request<{ tasks?: ZentaoTask[] } | ZentaoTask[]>('GET', '/tasks', {
      params: {
        assignedTo: this.http.username,
        status: input.status ?? 'all',
        ...pagination,
      },
    });

    return toServerListResult(response, ['tasks'], pagination);
  }

  async getTaskDetail(taskId: number): Promise<ZentaoTask> {
    return this.http.request<ZentaoTask>('GET', `/tasks/${taskId}`);
  }

  async updateTask(taskId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/tasks/${taskId}`, {
      data: update,
    });
  }

  async finishTask(taskId: number, update: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/finish`, {
      data: update,
    });
  }

  async createTask(task: Record<string, unknown> & { execution: number }): Promise<unknown> {
    return this.http.request('POST', `/executions/${task.execution}/tasks`, {
      data: task,
    });
  }
}
