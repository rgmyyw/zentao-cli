import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';

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
    'recordTaskEstimate',
    {
      taskId: z.number().int().positive(),
      date: z.string().trim().min(1).describe('登记日期，推荐 YYYY-MM-DD。'),
      consumed: z.number().positive().describe('本次登记消耗工时，必须大于 0。'),
      left: z.number().nonnegative().describe('登记后剩余工时，可为 0。'),
      work: optionalTrimmedText.describe('本次工作内容。对应 task-recordEstimate 页面里的 work 字段。'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('recordTaskEstimate', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.recordEstimate(input.taskId, input)),
  );

  server.tool(
    'updateTask',
    {
      taskId: z.number().int().positive(),
      name: z.string().trim().min(1).optional(),
      type: optionalTrimmedText,
      desc: optionalTrimmedText.describe('任务描述。禅道 18.5 REST PUT 支持 desc 但不支持 comment，备注请通过 finishTask/assignTask 等状态变更操作附带'),
      assignedTo: optionalTrimmedText,
      pri: z.number().optional().describe('优先级 1-4'),
      estimate: z.number().optional(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      estStarted: optionalTrimmedText,
      deadline: optionalTrimmedText,
      module: z.number().int().optional(),
      story: optionalTrimmedText,
      status: optionalTrimmedText,
      closedReason: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm, ...update }) => {
      const payload = { taskId, update };
      return runWithPreview('updateTask', confirm, payload, previewOrAssertWriteAllowed, () => getApi().task.updateTask(taskId, update));
    },
  );

  server.tool(
    'finishTask',
    {
      taskId: z.number().int().positive(),
      currentConsumed: z.number().nonnegative().describe('本次消耗工时。禅道 18.5 /tasks/{id}/finish 必填'),
      realStarted: z.string().trim().min(1).describe('实际开始时间或日期。禅道 18.5 /tasks/{id}/finish 必填'),
      finishedDate: z.string().trim().min(1).describe('完成时间或日期。禅道 18.5 /tasks/{id}/finish 必填'),
      assignedTo: optionalTrimmedText,
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm, ...update }) => {
      const payload = { taskId, update };
      return runWithPreview('finishTask', confirm, payload, previewOrAssertWriteAllowed, () => getApi().task.finishTask(taskId, update));
    },
  );

  server.tool(
    'startTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      consumed: z.number().optional(),
      left: z.number().optional(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('startTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.startTask(input.taskId, input)),
  );

  server.tool(
    'pauseTask',
    {
      taskId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('pauseTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.pauseTask(input.taskId, input)),
  );

  server.tool(
    'restartTask',
    {
      taskId: z.number().int().positive(),
      consumed: z.number().optional(),
      left: z.number().optional(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('restartTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.restartTask(input.taskId, input)),
  );

  server.tool(
    'closeTask',
    {
      taskId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('closeTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.closeTask(input.taskId, input)),
  );

  server.tool(
    'activateTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      left: z.number().optional(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('activateTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.activateTask(input.taskId, input)),
  );

  server.tool(
    'assignTask',
    {
      taskId: z.number().int().positive(),
      assignedTo: z.string().trim().min(1),
      comment: optionalTrimmedText,
      left: z.number().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('assignTask', confirm, input, previewOrAssertWriteAllowed, () => getApi().task.assignTask(input.taskId, input)),
  );

  server.tool(
    'deleteTask',
    {
      taskId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm }) => runWithPreview('deleteTask', confirm, { taskId }, previewOrAssertWriteAllowed, () => getApi().task.deleteTask(taskId)),
  );
}
