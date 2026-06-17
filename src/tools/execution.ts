import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, runWithPreview } from './shared.js';

const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

export function registerExecutionTools(server: CliRegistry): void {
  server.tool(
    'getExecutionDetail',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionDetail(executionId)),
    { costHint: 'low', nextBestTools: ['getExecutionSnapshot', 'getExecutionBugs', 'getExecutionDynamic'] },
  );

  server.tool(
    'getExecutionSnapshot',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionSnapshot(executionId)),
    { costHint: 'medium', nextBestTools: ['getExecutionDetail', 'getExecutionBugs', 'getExecutionDynamic'] },
  );

  server.tool(
    'getExecutionDynamic',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionDynamic(executionId)),
    { costHint: 'low', nextBestTools: ['getExecutionSnapshot', 'getExecutionDetail', 'getExecutionBugs'] },
  );

  server.tool(
    'getProjectExecutions',
    {
      projectId: z.number().int().positive(),
    },
    async ({ projectId }) => jsonResult(await getApi().execution.getProjectExecutions(projectId)),
    { costHint: 'low', nextBestTools: ['getExecutionDetail', 'getExecutionSnapshot', 'getProjectDetail'] },
  );

  server.tool(
    'getExecutionBuilds',
    {
      executionId: z.number().int().positive(),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.getExecutionBuilds(executionId)),
    { costHint: 'low', nextBestTools: ['getExecutionSnapshot', 'getBuildDetail', 'getExecutionDetail'] },
  );

  server.tool(
    'getExecutionBugs',
    {
      executionId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: optionalTrimmedText.describe('可选，按禅道接口支持的状态过滤'),
      search: optionalTrimmedText.describe('可选。客户端按 Bug 标题 / 关键字 / 复现步骤 / 模块路径过滤。'),
      module: optionalTrimmedText.describe('可选。按执行 Bug 的模块名 / 模块别名 / 模块路径过滤。仅用于已明确要查某个执行 / 迭代下 Bug 的场景。'),
      moduleId: z.number().int().positive().optional().describe('可选。按执行 Bug 的模块 ID 过滤。'),
    },
    async ({ executionId, page, limit, status, search, module, moduleId }) => jsonResult(await getApi().execution.getExecutionBugs(executionId, { page, limit, status, search, module, moduleId })),
    { costHint: 'medium', nextBestTools: ['getBugSnapshot', 'getExecutionSnapshot', 'getExecutionDetail'] },
  );

  server.tool(
    'getExecutionDailyBugStats',
    {
      executionId: z.number().int().positive(),
      iterationName: optionalTrimmedText.describe('输出报告里的迭代名称，例如 1.2.3迭代。'),
      date: optionalTrimmedText.describe('统计日期，默认今天。支持 today/今天/yesterday/昨天/YYYY-MM-DD。'),
    },
    async ({ executionId, iterationName, date }) => jsonResult(await getApi().execution.getExecutionDailyBugStats(executionId, { iterationName, date })),
    { costHint: 'medium', nextBestTools: ['getExecutionSnapshot', 'getExecutionBugs', 'getExecutionDynamic'] },
  );

  server.tool(
    'confirmExecutionStoryChange',
    {
      executionId: z.number().int().positive().describe('执行 ID。禅道 18.5 无 execution/confirmStoryChange 控制器，确认执行时会提示使用 task/testcase 对应能力'),
      storyId: z.number().int().positive().describe('需求 ID'),
      status: z.enum(['active', 'closed', 'reject']).describe('需求变更结果：active=接受，closed=关闭，reject=拒绝'),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ executionId, storyId, status, comment, confirm }) =>
      runWithPreview('confirmExecutionStoryChange', confirm, { executionId, storyId, status, comment }, previewOrAssertWriteAllowed, () =>
        getApi().execution.confirmExecutionStoryChange({ executionId, storyId, status, comment }),
      ),
  );

  server.tool(
    'computeExecutionBurn',
    {
      executionId: z.number().int().positive().describe('执行 ID。禅道 18.5 execution::computeBurn($reload) 不接收 executionId，确认执行时会显式报错'),
      date: optionalTrimmedText.describe('可选，YYYY-MM-DD。无 effect（控制器忽略）'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ executionId, date, confirm }) =>
      runWithPreview('computeExecutionBurn', confirm, { executionId, date }, previewOrAssertWriteAllowed, () =>
        getApi().execution.computeExecutionBurn(executionId, date),
      ),
  );

  server.tool(
    'getExecutionManageMembers',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/manageMembers 页面按钮'),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.manageMembers(executionId)),
    { costHint: 'low', nextBestTools: ['getExecutionDetail', 'getProjectExecutions', 'getExecutionSnapshot'] },
  );

  server.tool(
    'getExecutionAll',
    {
      status: optionalTrimmedText.describe('可选，状态过滤，默认 undone（wait/doing/suspended/closed/finished），对应 18.5 execution::all $status 段'),
      orderBy: optionalTrimmedText.describe('可选，排序方式，默认 order_asc，对应 18.5 execution::all $orderBy 段'),
      limit: z.number().int().positive().optional().describe('可选，每页条数，对应 recPerPage 参数'),
      productId: z.number().int().positive().optional().describe('可选，限定产品 ID，对应 18.5 execution::all $productID 参数'),
    },
    async ({ status, orderBy, limit, productId }) =>
      jsonResult(await getApi().execution.executionAll({ status, orderBy, limit, productId })),
    { costHint: 'medium', nextBestTools: ['getProjectExecutions', 'getExecutionSnapshot', 'getExecutionDetail'] },
  );

  server.tool(
    'getExecutionTrack',
    {
      executionId: z.number().int().positive().describe('执行 ID。禅道 18.5 execution 模块无 track 控制器，确认执行时会显式报错'),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.executionTrack(executionId)),
    { costHint: 'medium', nextBestTools: ['getExecutionDetail', 'getExecutionSnapshot', 'getExecutionDynamic'] },
  );

  server.tool(
    'getExecutionStoryKanban',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/storyKanban 页面视图'),
    },
    async ({ executionId }) => jsonResult(await getApi().execution.executionStoryKanban(executionId)),
    { costHint: 'medium', nextBestTools: ['getExecutionKanban', 'getExecutionDetail', 'getExecutionSnapshot'] },
  );

  server.tool(
    'getExecutionStoryTasks',
    {
      executionId: z.number().int().positive().describe('执行 ID。禅道 18.5 execution 模块无 storyTasks 控制器，确认执行时会显式报错'),
      storyId: z.number().int().positive().describe('需求 ID（不会被提交到不存在控制器）'),
    },
    async ({ executionId, storyId }) => jsonResult(await getApi().execution.executionStoryTasks(executionId, storyId)),
    { costHint: 'medium', nextBestTools: ['getStoryDetail', 'getExecutionStoryKanban', 'getExecutionSnapshot'] },
  );

  server.tool(
    'getExecutionKanban',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/kanban 页面视图'),
      browseType: optionalTrimmedText.describe('看板浏览类型：all | story | task | bug。默认 all'),
      orderBy: optionalTrimmedText.describe('排序方式，默认 id_asc'),
      groupBy: optionalTrimmedText.describe('分组方式，默认 default'),
    },
    async ({ executionId, browseType, orderBy, groupBy }) => jsonResult(await getApi().execution.getExecutionKanban(executionId, { browseType, orderBy, groupBy })),
    { costHint: 'medium', nextBestTools: ['getExecutionTaskKanban', 'getExecutionSnapshot', 'getExecutionDetail'] },
  );

  server.tool(
    'getExecutionTaskKanban',
    {
      executionId: z.number().int().positive().describe('执行 ID。对齐禅道 18.5 execution/taskKanban 页面视图'),
      browseType: optionalTrimmedText.describe('任务看板浏览类型：all | story | task | bug。默认 all'),
      orderBy: optionalTrimmedText.describe('排序方式，默认 order_asc'),
      groupBy: optionalTrimmedText.describe('分组方式，默认 default'),
    },
    async ({ executionId, browseType, orderBy, groupBy }) => jsonResult(await getApi().execution.getExecutionTaskKanban(executionId, { browseType, orderBy, groupBy })),
    { costHint: 'medium', nextBestTools: ['getExecutionKanban', 'getExecutionSnapshot', 'getExecutionBugs'] },
  );

  server.tool(
    'getExecutionExecutionKanban',
    {
      executionId: z.number().int().positive().optional().describe('可选参数。禅道 18.5 execution/executionKanban 是全公司执行看板，无路径参数；本参数仅用于占位/未来的 from 过滤，不写入 URL'),
    },
    async () => jsonResult(await getApi().execution.getAllExecutionKanban()),
    { costHint: 'medium', nextBestTools: ['getExecutionAll', 'getProjectExecutions', 'getExecutionSnapshot'] },
  );
}
