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
    return this.http.request('POST', '/todos', { data });
  }

  async updateTodo(todoId: number, update: Record<string, unknown>): Promise<unknown> {
    return this.http.request('PUT', `/todos/${todoId}`, { data: update });
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
}
