import type { ZentaoHttpClient } from '../core/http.js';
import { requireNonBlank } from '../core/validation.js';
import { extractItems } from '../core/list-result.js';
import { toFormUrlEncoded } from '../utils/form.js';

export class TodoApi {
  constructor(private readonly http: ZentaoHttpClient) {}

  async getTodos(): Promise<unknown> {
    const response = await this.http.request('GET', '/todos');
    return { items: extractItems(response, ['todos']) };
  }

  async getTodoDetail(todoId: number): Promise<unknown> {
    return this.http.request('GET', `/todos/${todoId}`);
  }

  async createTodo(data: Record<string, unknown>): Promise<unknown> {
    return this.http.request('POST', '/todos', { data: this.normalizeTodoInput(data, true) });
  }

  async updateTodo(todoId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/todos/${todoId}`, { data: this.normalizeTodoInput(update, false) });
  }

  async startTodo(todoId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/todo-start-${todoId}.json`);
  }

  async closeTodo(todoId: number): Promise<unknown> {
    return this.http.legacyRequest('GET', `/todo-close-${todoId}.json`);
  }

  async assignTodo(todoId: number, input: { assignedTo: string; comment?: string }): Promise<unknown> {
    const assignedTo = requireNonBlank(input.assignedTo, 'assignedTo 不能为空');
    const payload: Record<string, string> = { assignedTo };
    if (typeof input.comment === 'string' && input.comment.trim() !== '') {
      payload.comment = input.comment.trim();
    }
    return this.http.legacyRequest('POST', `/todo-assignTo-${todoId}.json`, {
      data: toFormUrlEncoded(payload as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async deleteTodo(todoId: number): Promise<unknown> {
    return this.http.request('DELETE', `/todos/${todoId}`);
  }

  async finishTodo(todoId: number): Promise<unknown> {
    return this.http.request('GET', `/todos/${todoId}/finish`);
  }

  async activateTodo(todoId: number): Promise<unknown> {
    return this.http.request('GET', `/todos/${todoId}/activate`);
  }

  async batchFinishTodos(input: { todoIds: number[] }): Promise<unknown> {
    const todoIds = normalizeTodoIdList(input.todoIds, 'todoIds');
    return this.http.legacyRequest('POST', '/todo-batchFinish.json', {
      data: toFormUrlEncoded({ todoIDList: todoIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchCloseTodos(input: { todoIds: number[] }): Promise<unknown> {
    const todoIds = normalizeTodoIdList(input.todoIds, 'todoIds');
    return this.http.legacyRequest('POST', '/todo-batchClose.json', {
      data: toFormUrlEncoded({ todoIDList: todoIds } as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async importTodosToToday(input: { todoIds: number[]; date?: string }): Promise<unknown> {
    const todoIds = normalizeTodoIdList(input.todoIds, 'todoIds');
    const payload: Record<string, unknown> = { todoIDList: todoIds };
    if (typeof input.date === 'string' && input.date.trim() !== '') {
      payload.date = input.date.trim();
    }
    return this.http.legacyRequest('POST', '/todo-import2Today.json', {
      data: toFormUrlEncoded(payload as unknown as Record<string, unknown>),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private normalizeTodoInput(input: Record<string, unknown>, requireName: boolean): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...input };

    if (Object.prototype.hasOwnProperty.call(normalized, 'name')) {
      normalized.name = requireNonBlank(normalized.name as string | undefined, 'name 不能为空');
    } else if (requireName) {
      throw new Error('name 不能为空');
    }

    for (const key of ['desc', 'begin', 'end', 'type', 'status'] as const) {
      if (typeof normalized[key] === 'string') {
        normalized[key] = normalized[key].trim();
      }
    }

    return normalized;
  }
}

function normalizeTodoIdList(values: unknown, fieldName: string): number[] {
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
