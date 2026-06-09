import type { ZentaoHttpClient } from '../core/http.js';
import { extractItems, toClientPaginatedListResult, toServerListResult } from '../core/list-result.js';
import { normalizePagination, type PaginationInput } from '../core/pagination.js';
import type { ZentaoTask } from '../types/zentao.js';

export interface MyTaskListInput extends PaginationInput {
  status?: string;
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
    return this.http.request('PUT', `/tasks/${taskId}`, {
      data: update,
    });
  }

  async startTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/start`, { data });
  }

  async pauseTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/pause`, { data });
  }

  async restartTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/restart`, { data });
  }

  async closeTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/close`, { data });
  }

  async activateTask(taskId: number, data: Record<string, unknown> = {}): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/activate`, { data });
  }

  async assignTask(taskId: number, data: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', `/tasks/${taskId}/assignto`, { data });
  }

  async deleteTask(taskId: number): Promise<unknown> {
    return this.http.request('DELETE', `/tasks/${taskId}`);
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
