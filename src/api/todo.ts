import type { ZentaoHttpClient } from '../core/http.js';
import { extractItems } from '../core/list-result.js';

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

  async deleteTodo(todoId: number): Promise<unknown> {
    return this.http.request('DELETE', `/todos/${todoId}`);
  }

  async finishTodo(todoId: number): Promise<unknown> {
    return this.http.request('GET', `/todos/${todoId}/finish`);
  }

  async activateTodo(todoId: number): Promise<unknown> {
    return this.http.request('GET', `/todos/${todoId}/activate`);
  }

  private normalizeTodoInput(input: Record<string, unknown>, requireName: boolean): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...input };

    if (Object.prototype.hasOwnProperty.call(normalized, 'name')) {
      normalized.name = this.requireNonBlank(normalized.name, 'name 不能为空');
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

  private requireNonBlank(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new Error(message);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new Error(message);
    }

    return normalized;
  }
}
