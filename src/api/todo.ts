import type { ZentaoHttpClient } from '../core/http.js';
import { requireNonBlank } from '../core/validation.js';
import { extractItems } from '../core/list-result.js';
import { containsHtmlMarkup } from '../utils/html.js';
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
    const normalized = this.normalizeTodoInput(data, true);
    if (containsHtmlMarkup(normalized.desc)) {
      return this.http.legacyRequest('POST', '/todo-create.json', {
        data: toFormUrlEncoded(this.normalizeTodoLegacyPayload(normalized, true)),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    return this.http.request('POST', '/todos', { data: normalized });
  }

  async updateTodo(todoId: number, update: Record<string, unknown>): Promise<unknown> {
    const normalized = this.normalizeTodoInput(update, false);
    if (containsHtmlMarkup(normalized.desc)) {
      const current = await this.getTodoDetail(todoId) as Record<string, unknown>;
      const preserved = this.pickTodoEditDefaults(current);
      return this.http.legacyRequest('POST', `/todo-edit-${todoId}.json`, {
        data: toFormUrlEncoded(this.normalizeTodoLegacyPayload({ ...preserved, ...normalized }, false)),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    }
    return this.http.request('PUT', `/todos/${todoId}`, { data: normalized });
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

  async batchCreateTodos(input: { date?: string; todos: Array<Record<string, unknown>> }): Promise<unknown> {
    if (!Array.isArray(input.todos) || input.todos.length === 0) throw new Error('todos 至少需要 1 项');
    const date = (input.date ?? 'today').trim() || 'today';
    const formData: Record<string, unknown> = { date };
    for (const [i, t] of input.todos.entries()) {
      const normalized = this.normalizeTodoBatchCreateInput(t, i);
      formData[`names[${i}]`] = normalized.name;
      formData[`types[${i}]`] = normalized.type;
      formData[`pris[${i}]`] = normalized.pri;
      formData[`descs[${i}]`] = normalized.desc;
      formData[`begins[${i}]`] = normalized.begin;
      formData[`ends[${i}]`] = normalized.end;
      formData[`assignedTos[${i}]`] = normalized.assignedTo;
    }
    return this.http.legacyRequest('POST', `/todo-batchCreate-${date}.json`, {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async batchEditTodos(input: { todos: Array<Record<string, unknown> & { todoId: number }> }): Promise<unknown> {
    if (!Array.isArray(input.todos) || input.todos.length === 0) throw new Error('todos 至少需要 1 项');
    const formData: Record<string, unknown> = {};
    for (const todo of input.todos) {
      const todoId = Number(todo.todoId);
      if (!Number.isInteger(todoId) || todoId <= 0) throw new Error('todoId 必须是正整数');
      formData[`todoIDList[${todoId}]`] = todoId;
      if (todo.date !== undefined) formData[`dates[${todoId}]`] = String(todo.date);
      if (todo.type !== undefined) formData[`types[${todoId}]`] = String(todo.type);
      if (todo.pri !== undefined) formData[`pris[${todoId}]`] = String(todo.pri);
      if (todo.status !== undefined) formData[`status[${todoId}]`] = String(todo.status);
      if (todo.name !== undefined) formData[`names[${todoId}]`] = String(todo.name);
      if (todo.begin !== undefined) formData[`begins[${todoId}]`] = String(todo.begin);
      if (todo.end !== undefined) formData[`ends[${todoId}]`] = String(todo.end);
      if (todo.assignedTo !== undefined) formData[`assignedTos[${todoId}]`] = String(todo.assignedTo);
    }
    return this.http.legacyRequest('POST', '/todo-batchEdit-todoBatchEdit.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async exportTodos(input: { userId?: string; orderBy?: string } = {}): Promise<unknown> {
    const userID = input.userId ?? '';
    const orderBy = input.orderBy ?? '';
    return this.http.legacyRequest('GET', `/todo-export-${userID}-${orderBy}.json`);
  }

  async createTodoCycle(input: { name: string; type: string; begin: string; end: string; desc?: string }): Promise<unknown> {
    const name = requireNonBlank(input.name, 'name 不能为空');
    const formData: Record<string, unknown> = { name, type: input.type, begin: input.begin, end: input.end };
    if (input.desc) formData.desc = input.desc;
    return this.http.legacyRequest('POST', '/todo-createCycle.json', {
      data: toFormUrlEncoded(formData),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  private pickTodoEditDefaults(todo: Record<string, unknown>): Record<string, unknown> {
    return {
      date: todo.date,
      type: todo.type,
      name: todo.name,
      pri: todo.pri,
      desc: todo.desc,
      status: todo.status,
      begin: todo.begin,
      end: todo.end,
      private: todo.private,
    };
  }

  private normalizeTodoLegacyPayload(input: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...input };
    if (isCreate && payload.date === undefined) payload.date = today();
    if (isCreate && payload.type === undefined) payload.type = 'custom';
    if (isCreate && payload.status === undefined) payload.status = 'wait';
    if (isCreate && payload.pri === undefined) payload.pri = 3;

    for (const key of ['begin', 'end'] as const) {
      const value = payload[key];
      if (typeof value === 'string') payload[key] = value.replace(/:/g, '');
    }

    if (typeof payload.private === 'boolean') payload.private = payload.private ? 1 : 0;
    return payload;
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

  private normalizeTodoBatchCreateInput(input: Record<string, unknown>, index: number): { name: string; type: string; pri: number; desc: string; begin: string; end: string; assignedTo: string } {
    const name = requireNonBlank(input.name as string | undefined, `todos[${index}].name 不能为空`);
    const type = typeof input.type === 'string' && input.type.trim() !== '' ? input.type.trim() : 'custom';
    const pri = typeof input.pri === 'number' ? input.pri : Number(input.pri ?? 3);
    const desc = typeof input.desc === 'string' ? input.desc : '';
    const begin = typeof input.begin === 'string' && input.begin.trim() !== '' ? input.begin.trim() : '2400';
    const end = typeof input.end === 'string' && input.end.trim() !== '' ? input.end.trim() : '2400';
    const assignedTo = typeof input.assignedTo === 'string' && input.assignedTo.trim() !== '' ? input.assignedTo.trim() : 'ditto';
    return { name, type, pri, desc, begin, end, assignedTo };
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

function today(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
