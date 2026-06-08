import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

const runActioned = async (action: string, confirm: boolean, params: Record<string, unknown>, fn: () => Promise<unknown>) => {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload: params });
  if (preview) return jsonResult(preview);
  return jsonResult(await fn());
};

export function registerTodoTools(server: CliRegistry): void {
  server.tool('getMyTodos', {}, async () => jsonResult(await getApi().todo.getTodos()));

  server.tool('getTodoDetail', {
    todoId: z.number().int().positive(),
  }, async ({ todoId }) => jsonResult(await getApi().todo.getTodoDetail(todoId)));

  server.tool('createTodo', {
    name: z.string().min(1),
    desc: z.string().optional(),
    begin: z.string().optional(),
    end: z.string().optional(),
    type: z.string().optional(),
    pri: z.number().optional(),
    status: z.string().optional(),
    private: z.boolean().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => {
    return runActioned('createTodo', confirm, input, () => getApi().todo.createTodo(input));
  });

  server.tool('updateTodo', {
    todoId: z.number().int().positive(),
    name: z.string().optional(),
    desc: z.string().optional(),
    begin: z.string().optional(),
    end: z.string().optional(),
    type: z.string().optional(),
    pri: z.number().optional(),
    status: z.string().optional(),
    private: z.boolean().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId, ...update }) => {
    return runActioned('updateTodo', confirm, { todoId, ...update }, () => getApi().todo.updateTodo(todoId, update));
  });

  server.tool('deleteTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runActioned('deleteTodo', confirm, { todoId }, () => getApi().todo.deleteTodo(todoId));
  });

  server.tool('finishTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runActioned('finishTodo', confirm, { todoId }, () => getApi().todo.finishTodo(todoId));
  });

  server.tool('activateTodo', {
    todoId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, todoId }) => {
    return runActioned('activateTodo', confirm, { todoId }, () => getApi().todo.activateTodo(todoId));
  });
}
