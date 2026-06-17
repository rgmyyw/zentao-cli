import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';

export function registerTodoTools(server: CliRegistry): void {
  server.tool('getMyTodos', {}, async () => jsonResult(await getApi().todo.getTodos()));

  server.tool('getTodoDetail', {
    todoId: z.number().int().positive(),
  }, async ({ todoId }) => jsonResult(await getApi().todo.getTodoDetail(todoId)));

  server.tool('createTodo', {
    name: z.string().trim().min(1),
    desc: optionalTrimmedText,
    begin: optionalTrimmedText,
    end: optionalTrimmedText,
    type: optionalTrimmedText,
    pri: z.number().optional(),
    status: optionalTrimmedText,
    private: z.boolean().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => {
    return runWithPreview('createTodo', confirm, input, previewOrAssertWriteAllowed, () => getApi().todo.createTodo(input));
  });

  server.tool('updateTodo', {
    todoId: z.number().int().positive(),
    name: z.string().trim().min(1).optional(),
    desc: optionalTrimmedText,
    begin: optionalTrimmedText,
    end: optionalTrimmedText,
    type: optionalTrimmedText,
    pri: z.number().optional(),
    status: optionalTrimmedText,
    private: z.boolean().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId, ...update }) => {
    return runWithPreview('updateTodo', confirm, { todoId, ...update }, previewOrAssertWriteAllowed, () => getApi().todo.updateTodo(todoId, update));
  });

  server.tool('startTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runWithPreview('startTodo', confirm, { todoId }, previewOrAssertWriteAllowed, () => getApi().todo.startTodo(todoId));
  });

  server.tool('closeTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runWithPreview('closeTodo', confirm, { todoId }, previewOrAssertWriteAllowed, () => getApi().todo.closeTodo(todoId));
  });

  server.tool('assignTodo', {
    todoId: z.number().int().positive(),
    assignedTo: z.string().trim().min(1).describe('分配给禅道账号。对应 18.5 todo/assignTo 页面 assignedTo 字段'),
    comment: optionalTrimmedText.describe('分配备注。对应 18.5 todo/assignTo 页面 comment 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId, ...payload }) => {
    return runWithPreview('assignTodo', confirm, { todoId, ...payload }, previewOrAssertWriteAllowed, () => getApi().todo.assignTodo(todoId, payload as { assignedTo: string; comment?: string }));
  });

  server.tool('deleteTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runWithPreview('deleteTodo', confirm, { todoId }, previewOrAssertWriteAllowed, () => getApi().todo.deleteTodo(todoId));
  });

  server.tool('finishTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runWithPreview('finishTodo', confirm, { todoId }, previewOrAssertWriteAllowed, () => getApi().todo.finishTodo(todoId));
  });

  server.tool('activateTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runWithPreview('activateTodo', confirm, { todoId }, previewOrAssertWriteAllowed, () => getApi().todo.activateTodo(todoId));
  });

  server.tool('batchFinishTodos', {
    todoIds: z.array(z.number().int().positive()).min(1).describe('要批量结束的待办 ID 列表，对应 18.5 todo/batchFinish 页面 todoIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ todoIds, confirm }) => runWithPreview('batchFinishTodos', confirm, { todoIds }, previewOrAssertWriteAllowed, () => getApi().todo.batchFinishTodos({ todoIds })));

  server.tool('batchCloseTodos', {
    todoIds: z.array(z.number().int().positive()).min(1).describe('要批量关闭的待办 ID 列表，对应 18.5 todo/batchClose 页面 todoIDList[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ todoIds, confirm }) => runWithPreview('batchCloseTodos', confirm, { todoIds }, previewOrAssertWriteAllowed, () => getApi().todo.batchCloseTodos({ todoIds })));

  server.tool('importTodosToToday', {
    todoIds: z.array(z.number().int().positive()).min(1).describe('要导入到今天的待办 ID 列表，对应 18.5 todo/import2Today 页面 todoIDList[] 字段'),
    date: optionalTrimmedText.describe('目标日期，默认今天。格式 YYYY-MM-DD'),
    confirm: z.boolean().optional().default(false),
  }, async ({ todoIds, date, confirm }) => runWithPreview('importTodosToToday', confirm, { todoIds, date: date ?? null }, previewOrAssertWriteAllowed, () => getApi().todo.importTodosToToday({ todoIds, date })));

  server.tool('batchCreateTodos', {
    date: optionalTrimmedText.describe('目标日期，默认 today'),
    todos: z.string().describe('JSON 字符串，待办数组。每项对应 18.5 batchCreate 行：{name,type?,pri?,desc?,begin?,end?,assignedTo?}'),
    confirm: z.boolean().optional().default(false),
  }, async ({ date, todos, confirm }) => {
    let parsed: Array<Record<string, unknown>>;
    try { parsed = JSON.parse(todos) as Array<Record<string, unknown>>; } catch { throw new Error('todos 必须是合法 JSON 字符串'); }
    return runWithPreview('batchCreateTodos', confirm, { date: date ?? 'today', todos: parsed }, previewOrAssertWriteAllowed, () => getApi().todo.batchCreateTodos({ date, todos: parsed }));
  });

  server.tool('batchEditTodos', {
    todos: z.string().describe('JSON 字符串。数组项对应 18.5 batchEdit 行：{todoId,date?,type?,pri?,status?,name?,begin?,end?,assignedTo?}'),
    confirm: z.boolean().optional().default(false),
  }, async ({ todos, confirm }) => {
    let parsed: Array<Record<string, unknown> & { todoId: number }>;
    try { parsed = JSON.parse(todos) as Array<Record<string, unknown> & { todoId: number }>; } catch { throw new Error('todos 必须是合法 JSON 字符串'); }
    return runWithPreview('batchEditTodos', confirm, { todos: parsed }, previewOrAssertWriteAllowed, () => getApi().todo.batchEditTodos({ todos: parsed }));
  });

  server.tool('exportTodos', {
    userId: z.string().trim().optional().describe('用户账号，默认当前用户'),
    orderBy: z.string().trim().optional().describe('排序方式'),
  }, async ({ userId, orderBy }) => jsonResult(await getApi().todo.exportTodos({ userId, orderBy })));

  server.tool('createTodoCycle', {
    name: z.string().trim().min(1).describe('周期名'),
    type: z.string().trim().min(1).describe('周期类型'),
    begin: z.string().trim().min(1).describe('开始日期 YYYY-MM-DD'),
    end: z.string().trim().min(1).describe('结束日期 YYYY-MM-DD'),
    desc: z.string().trim().optional().describe('描述'),
    confirm: z.boolean().optional().default(false),
  }, async ({ name, type, begin, end, desc, confirm }) => runWithPreview('createTodoCycle', confirm, { name, type, begin, end, desc }, previewOrAssertWriteAllowed, () => getApi().todo.createTodoCycle({ name, type, begin, end, desc })));
}
