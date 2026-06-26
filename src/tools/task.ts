import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';

function parseJsonArray(value: string, fieldName: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw new Error(`${fieldName} 必须是对象数组`);
    }
    return parsed as Array<Record<string, unknown>>;
  } catch (error) {
    if (error instanceof Error && error.message.includes('必须是对象数组')) throw error;
    throw new Error(`${fieldName} 必须是合法 JSON 字符串`);
  }
}

export function registerTaskTools(server: CliRegistry): void {
  server.tool(
    'getMyTasks',
    {
      status: z.enum(['wait', 'doing', 'done', 'cancel', 'closed', 'all']).optional().default('all'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().task.getMyTasks(input)),
    { costHint: 'low', nextBestTools: ['getTaskDetail', 'getMyTaskStatistics', 'getMyWeeklyActivity'] },
  );

  server.tool(
    'getTaskDetail',
    {
      taskId: z.number().int().positive(),
    },
    async ({ taskId }) => jsonResult(await getApi().task.getTaskDetail(taskId)),
    { costHint: 'low', nextBestTools: ['getComments', 'getMyTasks', 'getExecutionSnapshot'] },
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
    'editTaskEstimate',
    {
      estimateId: z.number().int().positive().describe('工时记录 ID，对应 18.5 task/editEstimate 页面里的 estimateID/effortID'),
      date: z.string().trim().min(1).describe('工时日期，推荐 YYYY-MM-DD。'),
      consumed: z.number().positive().describe('消耗工时，必须大于 0。'),
      left: z.number().nonnegative().describe('编辑后剩余工时，可为 0。'),
      work: optionalTrimmedText.describe('工作内容。对应 task-editEstimate 页面里的 work 字段。'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ estimateId, confirm, ...input }) => runWithPreview('editTaskEstimate', confirm, { estimateId, ...input }, previewOrAssertWriteAllowed, () => getApi().task.editEstimate(estimateId, input)),
  );

  server.tool(
    'deleteTaskEstimate',
    {
      estimateId: z.number().int().positive().describe('工时记录 ID，对应 18.5 task/deleteEstimate 页面里的 estimateID/effortID'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ estimateId, confirm }) => runWithPreview('deleteTaskEstimate', confirm, { estimateId }, previewOrAssertWriteAllowed, () => getApi().task.deleteEstimate(estimateId)),
  );

  server.tool(
    'confirmTaskStoryChange',
    {
      taskId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm }) => runWithPreview('confirmTaskStoryChange', confirm, { taskId }, previewOrAssertWriteAllowed, () => getApi().task.confirmStoryChange(taskId)),
  );

  server.tool(
    'updateTask',
    {
      taskId: z.number().int().positive(),
      name: z.string().trim().min(1).optional(),
      type: optionalTrimmedText,
      desc: optionalTrimmedText.describe('任务描述。CLI 走旧版 task-edit-{id}.json 控制器，HTML 标签按原样存储不会被 htmlspecialchars 转义'),
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
      comment: optionalTrimmedText.describe('编辑备注。CLI 走旧版 task-edit-{id}.json 时可附带 HTML 备注'),
      parent: z.number().int().min(-1).optional().describe('父任务 ID；正数 = 设为该任务的子任务；0 = 提升为顶级任务。禅道 18.5 PUT /tasks/{id} 支持 parent'),
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
      consumed: z.number().nonnegative().describe('本次消耗工时。禅道 18.5 /tasks/{id}/restart 必填'),
      left: z.number().nonnegative().describe('编辑后剩余工时，可为 0。禅道 18.5 /tasks/{id}/restart 必填'),
      assignedTo: optionalTrimmedText.describe('重新指派给某人；留空则保留原负责人'),
      realStarted: optionalTrimmedText.describe('实际开始时间或日期；禅道 18.5 /tasks/{id}/restart entry 接受，留空则保留原值'),
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
    'cancelTask',
    {
      taskId: z.number().int().positive(),
      comment: optionalTrimmedText.describe('取消备注。对应 18.5 task/cancel 页面里的 comment 字段。'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, confirm, comment }) => runWithPreview('cancelTask', confirm, { taskId, comment }, previewOrAssertWriteAllowed, () => getApi().task.cancelTask(taskId, { comment })),
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

  server.tool(
    'batchFinishTasks',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量完成的任务 ID 列表。禅道 18.5 无 task/batchFinish 控制器，确认执行时会提示改用 finishTask'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, confirm }) => runWithPreview('batchFinishTasks', confirm, { taskIds }, previewOrAssertWriteAllowed, () => getApi().task.batchFinishTasks({ taskIds })),
  );

  server.tool(
    'batchCancelTasks',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量取消的任务 ID 列表，对应 18.5 task/batchCancel 页面 taskIDList[] 字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, confirm }) => runWithPreview('batchCancelTasks', confirm, { taskIds }, previewOrAssertWriteAllowed, () => getApi().task.batchCancelTasks({ taskIds })),
  );

  server.tool(
    'batchCloseTasks',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量关闭的任务 ID 列表，对应 18.5 task/batchClose 页面 taskIDList[] 字段；若服务端返回 skipTaskIdList 确认链接会自动跟进关闭'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, confirm }) => runWithPreview('batchCloseTasks', confirm, { taskIds }, previewOrAssertWriteAllowed, () => getApi().task.batchCloseTasks({ taskIds })),
  );

  server.tool(
    'batchChangeTaskBranch',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量切换分支的任务 ID 列表。禅道 18.5 无 task/batchChangeBranch 控制器'),
      branchId: z.number().int().positive().describe('目标分支 ID'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, branchId, confirm }) => runWithPreview('batchChangeTaskBranch', confirm, { taskIds, branchId }, previewOrAssertWriteAllowed, () => getApi().task.batchChangeTaskBranch({ taskIds, branchId })),
  );

  server.tool(
    'batchChangeTaskModule',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量切换模块的任务 ID 列表，对应 18.5 task/batchChangeModule 页面 taskIDList[] 字段'),
      moduleId: z.number().int().nonnegative().describe('目标模块 ID。传 0 表示根模块'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, moduleId, confirm }) => runWithPreview('batchChangeTaskModule', confirm, { taskIds, moduleId }, previewOrAssertWriteAllowed, () => getApi().task.batchChangeTaskModule({ taskIds, moduleId })),
  );

  server.tool(
    'batchChangeTaskPlan',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量切换计划的任务 ID 列表。禅道 18.5 无 task/batchChangePlan 控制器'),
      planId: z.number().int().positive().describe('目标计划 ID'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, planId, confirm }) => runWithPreview('batchChangeTaskPlan', confirm, { taskIds, planId }, previewOrAssertWriteAllowed, () => getApi().task.batchChangeTaskPlan({ taskIds, planId })),
  );

  server.tool(
    'batchAssignTasksTo',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量指派的任务 ID 列表，对应 18.5 task/batchAssignTo 页面 taskIDList[] 字段'),
      assignedTo: z.string().trim().min(1).describe('指派人禅道账号'),
      comment: optionalTrimmedText.describe('指派备注'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, assignedTo, comment, confirm }) => runWithPreview('batchAssignTasksTo', confirm, { taskIds, assignedTo, comment }, previewOrAssertWriteAllowed, () => getApi().task.batchAssignTasksTo({ taskIds, assignedTo, comment })),
  );

  server.tool(
    'batchActivateTasks',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量激活的任务 ID 列表。禅道 18.5 无 task/batchActivate 控制器'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, confirm }) => runWithPreview('batchActivateTasks', confirm, { taskIds }, previewOrAssertWriteAllowed, () => getApi().task.batchActivateTasks({ taskIds })),
  );

  server.tool(
    'batchChangeTaskStory',
    {
      taskIds: z.array(z.number().int().positive()).min(1).describe('要批量调整所属需求的任务 ID 列表。禅道 18.5 无 task/batchChangeStory 控制器'),
      storyId: z.number().int().nonnegative().describe('目标需求 ID。传 0 表示解除关联'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskIds, storyId, confirm }) => runWithPreview('batchChangeTaskStory', confirm, { taskIds, storyId }, previewOrAssertWriteAllowed, () => getApi().task.batchChangeTaskStory({ taskIds, storyId })),
  );

  server.tool(
    'batchCreateTasks',
    {
      execution: z.number().int().positive().describe('执行 ID，对应 18.5 task/batchCreate 路径段 {execution}'),
      project: z.number().int().positive().optional(),
      tasks: z.array(z.record(z.string(), z.unknown())).min(1).describe('任务数组，元素至少需含 name/assignedTo/estStarted/deadline'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ execution, project, tasks, confirm }) => runWithPreview('batchCreateTasks', confirm, { execution, project, tasks }, previewOrAssertWriteAllowed, () => getApi().task.batchCreateTasks({ execution, project, tasks })),
  );

  server.tool(
    'batchEditTasks',
    {
      tasks: z.string().trim().min(1).describe('任务行 JSON 数组。每项至少含 taskId/name/type/pri/estStarted/deadline，对应 18.5 task/batchEdit 页面 taskIDList[] 与 names[id]/types[id]/pris[id] 等字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ tasks, confirm }) => {
      const parsedTasks = parseJsonArray(tasks, 'tasks');
      return runWithPreview('batchEditTasks', confirm, { tasks: parsedTasks }, previewOrAssertWriteAllowed, () =>
        getApi().task.batchEditTasks({ tasks: parsedTasks as never }),
      );
    },
  );

  server.tool(
    'importTaskToLib',
    {
      taskId: z.number().int().positive().describe('任务 ID，对应 18.5 task/importToLib 路径段 {id}'),
      libId: z.number().int().positive().describe('目标产品库 ID，对应路径段 {libID}'),
    },
    async ({ taskId, libId }) => jsonResult(await getApi().task.importTaskToLib({ taskId, libId })),
  );

  server.tool(
    'exportTasks',
    {
      executionId: z.number().int().positive().describe('执行 ID，对应 18.5 task/export 路径段 {executionID}'),
      orderBy: optionalTrimmedText,
      taskIdList: z.array(z.number().int().positive()).optional().describe('要导出的任务 ID 列表'),
    },
    async ({ executionId, orderBy, taskIdList }) => jsonResult(await getApi().task.exportTasks({ executionId, orderBy, taskIdList })),
  );

  server.tool(
    'editTaskTeam',
    {
      taskId: z.number().int().positive().describe('任务 ID，对应 18.5 task/editTeam 路径段 {id}'),
      accounts: z.array(z.string().trim().min(1)).min(1).describe('团队成员账号数组，对应 accounts 字段'),
      hours: z.array(z.string()).optional().describe('工时数组，与 accounts 一一对应'),
      roles: z.array(z.string()).optional().describe('角色数组，与 accounts 一一对应'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ taskId, accounts, hours, roles, confirm }) => runWithPreview('editTaskTeam', confirm, { taskId, accounts, hours, roles }, previewOrAssertWriteAllowed, () => getApi().task.editTaskTeam({ taskId, accounts, hours, roles })),
  );
}
