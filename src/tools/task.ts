import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

export function registerTaskTools(server: CliRegistry): void {
  const runActioned = async (
    action: string,
    confirm: boolean,
    params: Record<string, unknown>,
    fn: () => Promise<unknown>,
  ) => {
    const preview = previewOrAssertWriteAllowed({ action, confirm, payload: params });
    if (preview) return jsonResult(preview);
    return jsonResult(await fn());
  };

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
      type: z.string().optional(),
      desc: z.string().optional().describe('任务描述。禅道 18.5 REST PUT 支持 desc 但不支持 comment，备注请通过 finishTask/assignTask 等状态变更操作附带'),
      assignedTo: z.string().optional(),
      pri: z.number().optional().describe('优先级 1-4'),
      estimate: z.number().optional(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      estStarted: z.string().optional(),
      deadline: z.string().optional(),
      module: z.number().int().optional(),
      story: z.string().optional(),
      status: z.string().optional(),
      closedReason: z.string().optional(),
      mailto: z.string().optional(),
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

  server.tool(
    'startTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: z.string().optional(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('startTask', confirm, input, () => getApi().task.startTask(input.taskId, input)),
  );

  server.tool(
    'pauseTask',
    {
      taskId: z.number().int().positive(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('pauseTask', confirm, input, () => getApi().task.pauseTask(input.taskId, input)),
  );

  server.tool(
    'restartTask',
    {
      taskId: z.number().int().positive(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('restartTask', confirm, input, () => getApi().task.restartTask(input.taskId, input)),
  );

  server.tool(
    'closeTask',
    {
      taskId: z.number().int().positive(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('closeTask', confirm, input, () => getApi().task.closeTask(input.taskId, input)),
  );

  server.tool(
    'activateTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: z.string().optional(),
      left: z.number().optional(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('activateTask', confirm, input, () => getApi().task.activateTask(input.taskId, input)),
  );

  server.tool(
    'assignTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: z.string(),
      comment: z.string().optional(),
      left: z.number().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runActioned('assignTask', confirm, input, () => getApi().task.assignTask(input.taskId, input)),
  );

  server.tool(
    'deleteTask',
    {
      taskId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm }) => runActioned('deleteTask', confirm, { taskId }, () => getApi().task.deleteTask(taskId)),
  );
}
