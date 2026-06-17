import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';

export function registerBugTools(server: CliRegistry): void {
  server.tool(
    'getMyBugs',
    {
      productId: z.number().int().positive().optional().describe('可选。禅道产品 ID。不传时默认查询跨所有产品“指派给我的 Bug”；传入时只查该产品内我的 Bug。若用户问线上 / 生产 / 客户反馈 / 售后反馈问题，先判断来源：市场 / 售后 / 客户反馈查“市场和售后问题跟踪”，测试 / 开发自发现查“测试”，不要直接把业务产品名当成这里的 productId。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      branch: optionalTrimmedText,
      order: optionalTrimmedText,
    },
    async (input) => jsonResult(await getApi().bug.getMyBugs(input)),
  );

  server.tool(
    'getProductBugs',
    {
      productId: z.number().int().positive().describe('禅道产品 ID。仅用于查询某个禅道产品下的 Bug。若用户问的是外部线上 / 生产 / 客户反馈问题，先查固定禅道产品"市场和售后问题跟踪"，再按模块匹配真实业务产品；若明确是测试或开发在线上发现并记录在“测试”下的问题，应先定位禅道产品"测试"，再按模块过滤。'),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
      status: optionalTrimmedText.default('all'),
      branch: optionalTrimmedText,
      order: optionalTrimmedText,
      search: optionalTrimmedText.describe('可选。客户端按 Bug 标题 / 关键字 / 复现步骤 / 模块路径过滤。'),
      module: optionalTrimmedText.describe('可选。按产品 Bug 的模块名 / 模块别名 / 模块路径过滤，支持 YJ、yj、Yj 这类写法。外部线上问题通常用于“市场和售后问题跟踪”产品；测试或开发自发现问题通常用于“测试”产品下的模块。'),
      moduleId: z.number().int().positive().optional().describe('可选。按模块 ID 过滤 Bug。用于查询特定模块下的问题。'),
    },
    async (input) => jsonResult(await getApi().bug.getProductBugs(input)),
  );

  server.tool(
    'getBugDetail',
    {
      bugId: z.number().int().positive(),
    },
    async ({ bugId }) => jsonResult(await getApi().bug.getBugDetail(bugId)),
  );

  server.tool(
    'resolveBug',
    {
      bugId: z.number().int().positive(),
      resolution: z.enum(['fixed', 'bydesign', 'duplicate', 'external', 'notrepro', 'postponed', 'willnotfix', 'tostory']),
      resolvedBuild: optionalTrimmedText,
      resolvedDate: optionalTrimmedText.describe('解决日期/时间，禅道 18.5 bugresolve 支持该字段'),
      assignedTo: optionalTrimmedText,
      comment: optionalTrimmedText,
      duplicateBug: z.number().int().positive().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...resolution }) => {
      return runWithPreview('resolveBug', confirm, { bugId, resolution }, previewOrAssertWriteAllowed, () => getApi().bug.resolveBug(bugId, resolution));
    },
  );

  server.tool(
    'createBug',
    {
      product: z.number().int().positive(),
      title: z.string().trim().min(1),
      project: z.number().int().positive().optional(),
      execution: z.number().int().positive().optional(),
      openedBuild: optionalTrimmedText,
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: optionalTrimmedText,
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: optionalTrimmedText,
      keywords: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...data }) => runWithPreview('createBug', confirm, data, previewOrAssertWriteAllowed, () => getApi().bug.createBug(data)),
  );

  server.tool(
    'updateBug',
    {
      bugId: z.number().int().positive(),
      title: z.string().trim().min(1).optional(),
      project: z.number().int().positive().optional().describe('可选。所属项目 ID。跨项目调整 Bug 到指定执行时通常需要和 execution 一起传；如果用户只知道 executionId，可先运行 `zentao getExecutionDetail --executionId <id>` 取返回里的 project / projectId，再回填到这里。'),
      execution: z.number().int().positive().optional().describe('可选。目标执行 ID。用于把 Bug 关联/移动到指定执行。若服务端同时要求 project，请先用 `zentao getExecutionDetail --executionId <id>` 查出 projectId，再与 project 一起传。'),
      plan: z.number().int().nonnegative().optional().describe('可选。所属计划 ID。需要补回 Bug 计划时可传；传 `0` 可清空计划。'),
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      severity: z.number().optional(),
      type: optionalTrimmedText,
      status: optionalTrimmedText,
      resolution: optionalTrimmedText,
      openedBuild: optionalTrimmedText,
      resolvedBuild: optionalTrimmedText,
      module: z.number().int().positive().optional(),
      story: z.number().int().positive().optional(),
      task: z.number().int().positive().optional(),
      steps: optionalTrimmedText,
      keywords: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...update }) => runWithPreview('updateBug', confirm, { bugId, update }, previewOrAssertWriteAllowed, () => getApi().bug.updateBug(bugId, update)),
  );

  server.tool(
    'assignBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: z.string().trim().min(1),
      comment: optionalTrimmedText,
      mailto: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runWithPreview('assignBug', confirm, { bugId, data }, previewOrAssertWriteAllowed, () => getApi().bug.assignBug(bugId, data)),
  );

  server.tool(
    'okBug',
    {
      bugId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runWithPreview('okBug', confirm, { bugId, data }, previewOrAssertWriteAllowed, () => getApi().bug.okBug(bugId, data)),
  );

  server.tool(
    'confirmBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      pri: z.number().optional(),
      type: optionalTrimmedText,
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runWithPreview('confirmBug', confirm, { bugId, data }, previewOrAssertWriteAllowed, () => getApi().bug.confirmBug(bugId, data)),
  );

  server.tool(
    'confirmBugStoryChange',
    {
      bugId: z.number().int().positive().describe('Bug ID。对齐禅道 18.5 bug/confirmStoryChange 页面按钮'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm }) => runWithPreview('confirmBugStoryChange', confirm, { bugId }, previewOrAssertWriteAllowed, () => getApi().bug.confirmStoryChange(bugId)),
  );

  server.tool(
    'closeBug',
    {
      bugId: z.number().int().positive(),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runWithPreview('closeBug', confirm, { bugId, data }, previewOrAssertWriteAllowed, () => getApi().bug.closeBug(bugId, data)),
  );

  server.tool(
    'activateBug',
    {
      bugId: z.number().int().positive(),
      assignedTo: optionalTrimmedText,
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm, ...data }) => runWithPreview('activateBug', confirm, { bugId, data }, previewOrAssertWriteAllowed, () => getApi().bug.activateBug(bugId, data)),
  );

  server.tool(
    'deleteBug',
    {
      bugId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm }) => runWithPreview('deleteBug', confirm, { bugId }, previewOrAssertWriteAllowed, () => getApi().bug.deleteBug(bugId)),
  );

  server.tool(
    'deleteBugViaForm',
    {
      bugId: z.number().int().positive().describe('Bug ID。对齐禅道 18.5 bug/delete 页面确认链路'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugId, confirm }) => runWithPreview('deleteBugViaForm', confirm, { bugId }, previewOrAssertWriteAllowed, () => getApi().bug.deleteBugViaForm(bugId)),
  );

  server.tool(
    'batchCreateBugs',
    {
      productId: z.number().int().positive(),
      branch: z.number().int().nonnegative().optional().default(0),
      executionId: z.number().int().nonnegative().optional().default(0),
      moduleId: z.number().int().nonnegative().optional().default(0),
      titles: z.array(z.string().trim().min(1)).min(1).describe('批量 Bug 标题数组，对应页面表单 titles[]'),
      assignedTo: optionalTrimmedText,
      openedBuild: optionalTrimmedText,
      type: optionalTrimmedText,
      severity: z.number().optional(),
      pri: z.number().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('batchCreateBugs', confirm, input, previewOrAssertWriteAllowed, () => getApi().bug.batchCreateBugs(input)),
  );

  server.tool(
    'batchEditBugs',
    {
      productId: z.number().int().positive(),
      executionId: z.number().int().nonnegative().optional().default(0),
      branch: z.number().int().nonnegative().optional().default(0),
      bugIds: z.array(z.number().int().positive()).min(1).describe('要批量编辑的 Bug ID 列表，对应 bugIDList[]'),
      assignedTo: optionalTrimmedText,
      openedBuild: optionalTrimmedText,
      type: optionalTrimmedText,
      severity: z.number().optional(),
      pri: z.number().optional(),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('batchEditBugs', confirm, input, previewOrAssertWriteAllowed, () => getApi().bug.batchEditBugs(input)),
  );

  server.tool(
    'linkBugs',
    {
      bugId: z.number().int().positive(),
      linkedBugIds: z.array(z.number().int().positive()).min(1).describe('要关联到当前 Bug 的 Bug ID 列表，对应 18.5 bug/linkBugs 页面 bugs[] 字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('linkBugs', confirm, input, previewOrAssertWriteAllowed, () => getApi().bug.linkBugs(input)),
  );

  server.tool(
    'exportBugs',
    {
      productId: z.number().int().positive(),
      orderBy: optionalTrimmedText.default('id_desc'),
      browseType: optionalTrimmedText.default('all'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => runWithPreview('exportBugs', confirm, input, previewOrAssertWriteAllowed, () => getApi().bug.exportBugs(input)),
  );

  server.tool(
    'batchChangeBugBranch',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要切换分支的 Bug ID 列表，对应 18.5 bug/batchChangeBranch 页面 bugIDList[] 字段'),
      branchId: z.number().int().nonnegative().describe('目标分支 ID；传 0 表示切换到主干'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, branchId, confirm }) => runWithPreview('batchChangeBugBranch', confirm, { bugIds, branchId }, previewOrAssertWriteAllowed, () => getApi().bug.batchChangeBugBranch({ bugIds, branchId })),
  );

  server.tool(
    'batchChangeBugModule',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要切换模块的 Bug ID 列表，对应 18.5 bug/batchChangeModule 页面 bugIDList[] 字段'),
      moduleId: z.number().int().nonnegative().describe('目标模块 ID；传 0 表示移到根模块'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, moduleId, confirm }) => runWithPreview('batchChangeBugModule', confirm, { bugIds, moduleId }, previewOrAssertWriteAllowed, () => getApi().bug.batchChangeBugModule({ bugIds, moduleId })),
  );

  server.tool(
    'batchChangeBugPlan',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要切换计划的 Bug ID 列表，对应 18.5 bug/batchChangePlan 页面 bugIDList[] 字段'),
      planId: z.number().int().nonnegative().describe('目标计划 ID；传 0 表示移除计划'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, planId, confirm }) => runWithPreview('batchChangeBugPlan', confirm, { bugIds, planId }, previewOrAssertWriteAllowed, () => getApi().bug.batchChangeBugPlan({ bugIds, planId })),
  );

  server.tool(
    'batchAssignBugs',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要指派的 Bug ID 列表，对应 18.5 bug/batchAssignTo 页面 bugIDList[] 字段'),
      objectId: z.number().int().positive().describe('所属对象 ID（项目/执行/产品/模块）'),
      type: optionalTrimmedText.default('execution').describe('所属对象类型 execution|project|product，默认 execution'),
      assignedTo: z.string().trim().min(1),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, objectId, type, assignedTo, comment, confirm }) => runWithPreview('batchAssignBugs', confirm, { bugIds, objectId, type, assignedTo, comment }, previewOrAssertWriteAllowed, () => getApi().bug.batchAssignBugs({ bugIds, objectId, type, assignedTo, comment })),
  );

  server.tool(
    'batchConfirmBugs',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要确认的 Bug ID 列表，对应 18.5 bug/batchConfirm 页面 bugIDList[] 字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, confirm }) => runWithPreview('batchConfirmBugs', confirm, { bugIds }, previewOrAssertWriteAllowed, () => getApi().bug.batchConfirmBugs({ bugIds })),
  );

  server.tool(
    'batchResolveBugs',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要解决的 Bug ID 列表，对应 18.5 bug/batchResolve 页面 bugIDList[] 字段'),
      resolution: z.string().trim().min(1).describe('解决方案，固定枚举 fixed/bydesign/duplicate/external/notrepro/postponed/willnotfix/tostory'),
      resolvedBuild: optionalTrimmedText.describe('解决版本；resolution=fixed 时通常必填'),
      comment: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, resolution, resolvedBuild, comment, confirm }) => runWithPreview('batchResolveBugs', confirm, { bugIds, resolution, resolvedBuild, comment }, previewOrAssertWriteAllowed, () => getApi().bug.batchResolveBugs({ bugIds, resolution, resolvedBuild, comment })),
  );

  server.tool(
    'batchCloseBugs',
    {
      bugIds: z.array(z.number().int().positive()).min(1).describe('要关闭的 Bug ID 列表，对应 18.5 bug/batchClose 页面 bugIDList[] / unlinkBugs[] 字段'),
      releaseId: optionalTrimmedText.describe('可选。所属发布 ID；非空时使用 unlinkBugs[] 解绑并关闭'),
      viewType: optionalTrimmedText,
      confirm: z.boolean().optional().default(false),
    },
    async ({ bugIds, releaseId, viewType, confirm }) => runWithPreview('batchCloseBugs', confirm, { bugIds, releaseId, viewType }, previewOrAssertWriteAllowed, () => getApi().bug.batchCloseBugs({ bugIds, releaseId, viewType })),
  );

  server.tool(
    'batchActivateBugs',
    {
      productId: z.number().int().positive().describe('所属产品 ID。18.5 bug/batchActivate 页面要求先传 productID 渲染 statusList 表单'),
      branch: z.number().int().nonnegative().optional().default(0).describe('可选。产品分支 ID，默认 0'),
      bugIds: z.array(z.number().int().positive()).min(1).describe('要激活的 Bug ID 列表'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ productId, branch, bugIds, confirm }) => runWithPreview('batchActivateBugs', confirm, { productId, branch, bugIds }, previewOrAssertWriteAllowed, () => getApi().bug.batchActivateBugs({ productId, branch, bugIds })),
  );

  server.tool(
    'getBugTrack',
    {
      bugId: z.number().int().positive().describe('Bug ID'),
    },
    async ({ bugId }) => jsonResult(await getApi().bug.getBugTrack(bugId)),
  );
}
