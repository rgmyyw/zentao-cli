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
}
