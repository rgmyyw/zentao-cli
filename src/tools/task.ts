import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

export function registerTaskTools(server: CliRegistry): void {
  server.tool(
    'getMyTasks',
    {
      status: z.enum(['wait', 'doing', 'done', 'cancel', 'closed', 'all']).optional().default('all'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().task.getMyTasks(input)),
  );

  server.tool(
    'getTaskDetail',
    {
      taskId: z.number().int().positive(),
    },
    async ({ taskId }) => jsonResult(await getApi().task.getTaskDetail(taskId)),
  );

  server.tool(
    'updateTask',
    {
      taskId: z.number().int().positive(),
      name: z.string().optional(),
      status: z.string().optional(),
      assignedTo: z.string().optional(),
      estimate: z.number().optional(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      deadline: z.string().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm, ...update }) => {
      const payload = { taskId, update };
      const preview = previewOrAssertWriteAllowed({ action: 'updateTask', confirm, payload });
      if (preview) return jsonResult(preview);
      return jsonResult(await getApi().task.updateTask(taskId, update));
    },
  );

  server.tool(
    'finishTask',
    {
      taskId: z.number().int().positive(),
      currentConsumed: z.number().nonnegative().describe('本次消耗工时。禅道 18.5 /tasks/{id}/finish 必填'),
      realStarted: z.string().min(1).describe('实际开始时间或日期。禅道 18.5 /tasks/{id}/finish 必填'),
      finishedDate: z.string().min(1).describe('完成时间或日期。禅道 18.5 /tasks/{id}/finish 必填'),
      assignedTo: z.string().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm, ...update }) => {
      const payload = { taskId, update };
      const preview = previewOrAssertWriteAllowed({ action: 'finishTask', confirm, payload });
      if (preview) return jsonResult(preview);
      return jsonResult(await getApi().task.finishTask(taskId, update));
    },
  );
}
