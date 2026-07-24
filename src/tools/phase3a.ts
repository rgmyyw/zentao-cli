import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, optionalTrimmedText, runWithPreview } from './shared.js';

export function registerStoryWriteTools(server: CliRegistry): void {
  server.tool('batchCreateStories', {
    productId: z.number().int().positive().describe('产品 ID。对应 18.5 story/batchCreate 页面 productID 参数'),
    branch: z.number().int().nonnegative().optional(),
    moduleId: z.number().int().nonnegative().optional(),
    storyId: z.number().int().positive().optional().describe('拆分/子需求来源需求 ID'),
    executionId: z.number().int().nonnegative().optional(),
    planId: z.number().int().nonnegative().optional(),
    storyType: z.enum(['story', 'requirement']).optional().default('story'),
    extra: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => runWithPreview('batchCreateStories', confirm, input, previewOrAssertWriteAllowed, () => getApi().story.batchCreateStories(input)));

  server.tool('batchEditStories', {
    productId: z.number().int().positive().describe('产品 ID。对应 18.5 story/batchEdit 页面 productID 参数'),
    executionId: z.number().int().nonnegative().optional(),
    branch: z.number().int().nonnegative().optional(),
    storyType: z.enum(['story', 'requirement']).optional().default('story'),
    from: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => runWithPreview('batchEditStories', confirm, input, previewOrAssertWriteAllowed, () => getApi().story.batchEditStories(input)));

  server.tool('deleteStory', {
    storyId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
    from: optionalTrimmedText,
    storyType: z.enum(['story', 'requirement']).optional().default('story'),
  }, async ({ storyId, confirm, from, storyType }) => runWithPreview('deleteStory', confirm, { storyId, from, storyType }, previewOrAssertWriteAllowed, () => getApi().story.deleteStory(storyId, 'yes', from, storyType)));

  server.tool('exportStories', {
    productId: z.number().int().positive().describe('产品 ID。对应 18.5 story/export 页面 productID 参数'),
    orderBy: z.string().trim().min(1).describe('排序字段，对应 orderBy 参数'),
    executionId: z.number().int().nonnegative().optional(),
    browseType: optionalTrimmedText,
    storyType: z.enum(['story', 'requirement']).optional().default('story'),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => runWithPreview('exportStories', confirm, input, previewOrAssertWriteAllowed, () => getApi().story.exportStories(input)));

  server.tool('updateStory', {
    storyId: z.number().int().positive(),
    title: z.string().trim().min(1).optional(),
    product: z.number().int().positive().optional(),
    parent: z.number().int().nonnegative().optional(),
    reviewer: optionalTrimmedText,
    type: optionalTrimmedText,
    plan: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    source: optionalTrimmedText,
    sourceNote: optionalTrimmedText,
    comment: optionalTrimmedText.describe('编辑备注。CLI 在需要时走旧版 story-edit-{id}.json，可附带备注'),
    pri: z.number().optional(),
    estimate: z.number().optional(),
    category: optionalTrimmedText,
    mailto: z.array(z.string().trim().min(1)).optional(),
    keywords: optionalTrimmedText,
    stage: optionalTrimmedText,
    notifyEmail: z.array(z.string().trim().min(1)).optional(),
    uid: optionalTrimmedText.describe('附件上传会话 UID。先用 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段即可在更新时绑定/解绑附件；空字符串表示清空已绑定的附件'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...update }) => runWithPreview('updateStory', confirm, { storyId, update }, previewOrAssertWriteAllowed, () => getApi().story.updateStory(storyId, update)));

  server.tool('changeStory', {
    storyId: z.number().int().positive(),
    title: z.string().trim().min(1).describe('禅道 18.5 change story 必填'),
    spec: optionalTrimmedText,
    verify: optionalTrimmedText,
    reviewer: optionalTrimmedText,
    comment: optionalTrimmedText,
    executions: z.array(z.number().int().positive()).optional(),
    bugs: z.array(z.number().int().positive()).optional(),
    cases: z.array(z.number().int().positive()).optional(),
    tasks: z.array(z.number().int().positive()).optional(),
    reviewedBy: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...update }) => runWithPreview('changeStory', confirm, { storyId, update }, previewOrAssertWriteAllowed, () => getApi().story.changeStory(storyId, update)));

  server.tool('createStory', {
    product: z.number().int().positive(),
    title: z.string().trim().min(1),
    spec: optionalTrimmedText,
    verify: optionalTrimmedText,
    type: optionalTrimmedText,
    parent: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    pri: z.number().optional(),
    estimate: z.number().optional(),
    mailto: optionalTrimmedText,
    keywords: optionalTrimmedText,
    source: optionalTrimmedText,
    sourceNote: optionalTrimmedText,
    reviewer: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...input }) => runWithPreview('createStory', confirm, input, previewOrAssertWriteAllowed, () => getApi().story.createStory(input as Record<string, unknown> & { product: number })));

  server.tool('closeStory', {
    storyId: z.number().int().positive(),
    closedReason: optionalTrimmedText,
    duplicateStory: z.number().int().positive().optional(),
    childStories: z.array(z.number().int().positive()).optional().describe('关闭时同时关闭的子需求 ID 列表，对应 18.5 story/close entry childStories 字段'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...input }) => runWithPreview('closeStory', confirm, { storyId, ...input }, previewOrAssertWriteAllowed, () => getApi().story.closeStory(storyId, input)));

  server.tool('assignStory', {
    storyId: z.number().int().positive(),
    assignedTo: z.string().trim().min(1),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...input }) => runWithPreview('assignStory', confirm, { storyId, ...input }, previewOrAssertWriteAllowed, () => getApi().story.assignStory(storyId, input)));

  server.tool('activateStory', {
    storyId: z.number().int().positive(),
    assignedTo: optionalTrimmedText.describe('重新激活时指派给某人；留空则保留原负责人'),
    status: optionalTrimmedText.describe('激活后状态，默认 active；禅道 18.5 story/active entry 接受'),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...input }) => runWithPreview('activateStory', confirm, { storyId, ...input }, previewOrAssertWriteAllowed, () => getApi().story.activateStory(storyId, input)));

  server.tool('reviewStory', {
    storyId: z.number().int().positive(),
    reviewedDate: optionalTrimmedText,
    result: z.enum(['pass', 'reject', 'clarify', 'revert']),
    closedReason: optionalTrimmedText,
    pri: z.number().optional(),
    estimate: z.number().optional(),
    comment: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...input }) => runWithPreview('reviewStory', confirm, { storyId, ...input }, previewOrAssertWriteAllowed, () => getApi().story.reviewStory(storyId, input)));

  server.tool('linkStoriesToStory', {
    storyId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要关联到当前需求的需求 ID 列表，对应 18.5 页面 stories[] 字段'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, storyIds, confirm }) => runWithPreview('linkStoriesToStory', confirm, { storyId, storyIds }, previewOrAssertWriteAllowed, () => getApi().story.linkStoriesToStory(storyId, { storyIds })));

  server.tool('linkRequirements', {
    storyId: z.number().int().positive(),
    browseType: optionalTrimmedText,
    excludeStories: optionalTrimmedText,
    param: z.number().int().nonnegative().optional(),
    recTotal: z.number().int().nonnegative().optional(),
    recPerPage: z.number().int().positive().optional(),
    pageID: z.number().int().positive().optional(),
  }, async ({ storyId, browseType, excludeStories, param, recTotal, recPerPage, pageID }) => jsonResult(await getApi().story.linkRequirements(storyId, { browseType, excludeStories, param, recTotal, recPerPage, pageID })));

  server.tool('unlinkStoryFromStory', {
    storyId: z.number().int().positive(),
    linkedStoryId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, linkedStoryId, confirm }) => runWithPreview('unlinkStoryFromStory', confirm, { storyId, linkedStoryId }, previewOrAssertWriteAllowed, () => getApi().story.unlinkStoryFromStory(storyId, linkedStoryId)));

  server.tool('recallStory', {
    storyId: z.number().int().positive().describe('需求 ID。对齐 18.5 story/recall 页面按钮，仅在状态为 reviewing/changing 时可撤回'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm }) => runWithPreview('recallStory', confirm, { storyId }, previewOrAssertWriteAllowed, () => getApi().story.recallStory(storyId)));

  server.tool('submitStoryReview', {
    storyId: z.number().int().positive().describe('需求 ID。对齐 18.5 story/submitReview 提交评审按钮'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm }) => runWithPreview('submitStoryReview', confirm, { storyId }, previewOrAssertWriteAllowed, () => getApi().story.submitStoryReview(storyId)));

  server.tool('processStoryChange', {
    storyId: z.number().int().positive().describe('需求 ID。对齐 18.5 story/processStoryChange 确认变更按钮'),
    result: z.enum(['yes', 'no']).optional().default('yes').describe('确认/忽略需求变更，默认 yes 表示确认变更'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, result, confirm }) => runWithPreview('processStoryChange', confirm, { storyId, result }, previewOrAssertWriteAllowed, () => getApi().story.processStoryChange(storyId, result)));

  server.tool('batchReviewStories', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量评审的需求 ID 列表，对应 18.5 story/batchReview 页面 storyIdList[] 字段'),
    result: z.enum(['pass', 'reject', 'clarify', 'revert']),
    reason: optionalTrimmedText,
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, result, reason, confirm }) => runWithPreview('batchReviewStories', confirm, { storyIds, result, reason }, previewOrAssertWriteAllowed, () => getApi().story.batchReviewStories({ storyIds, result, reason })));

  server.tool('batchCloseStories', {
    productId: z.number().int().positive().describe('产品 ID。对齐 18.5 story/batchClose 页面 productID 参数'),
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量关闭的需求 ID 列表，对应 18.5 页面 storyIdList[id] 字段'),
    executionId: z.number().int().positive().optional().describe('执行 ID，可选，对应 18.5 页面 executionID 参数'),
    closedReasons: z.array(z.string().trim().min(1)).optional().describe('每个需求对应的关闭原因，数组下标与 storyIds 对齐'),
    comments: z.array(z.string().trim().min(1)).optional().describe('每个需求对应的关闭备注，数组下标与 storyIds 对齐'),
    confirm: z.boolean().optional().default(false),
  }, async ({ productId, storyIds, executionId, closedReasons, comments, confirm }) => {
    const closedReasonMap: Record<number, string> = {};
    if (closedReasons) {
      for (let i = 0; i < closedReasons.length; i += 1) {
        if (closedReasons[i]) closedReasonMap[storyIds[i]] = closedReasons[i];
      }
    }
    const commentMap: Record<number, string> = {};
    if (comments) {
      for (let i = 0; i < comments.length; i += 1) {
        if (comments[i]) commentMap[storyIds[i]] = comments[i];
      }
    }
    return runWithPreview('batchCloseStories', confirm, { productId, storyIds, executionId, closedReasons: closedReasonMap, comments: commentMap }, previewOrAssertWriteAllowed, () => getApi().story.batchCloseStories({ productId, storyIds, executionId, closedReasons: closedReasonMap, comments: commentMap }));
  });

  server.tool('batchChangeStoryModule', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量修改所属模块的需求 ID 列表，对应 18.5 story/batchChangeModule 页面 storyIdList[] 字段'),
    moduleId: z.number().int().nonnegative().describe('目标模块 ID。对齐 18.5 story/batchChangeModule 页面 moduleID 参数；传 0 表示根模块'),
    storyType: z.enum(['story', 'requirement']).optional().default('story').describe('需求类型，禅道 18.5 区分 story 和 requirement'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, moduleId, storyType, confirm }) => runWithPreview('batchChangeStoryModule', confirm, { storyIds, moduleId, storyType }, previewOrAssertWriteAllowed, () => getApi().story.batchChangeStoryModule({ storyIds, moduleId, storyType })));

  server.tool('batchChangeStoryPlan', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量修改所属计划的需求 ID 列表，对应 18.5 story/batchChangePlan 页面 storyIdList[] 字段'),
    planId: z.number().int().nonnegative().describe('目标计划 ID。0 表示移出计划'),
    oldPlanId: z.number().int().nonnegative().optional().describe('原计划 ID，0 表示任意计划'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, planId, oldPlanId, confirm }) => runWithPreview('batchChangeStoryPlan', confirm, { storyIds, planId, oldPlanId }, previewOrAssertWriteAllowed, () => getApi().story.batchChangeStoryPlan({ storyIds, planId, oldPlanId })));

  server.tool('batchChangeStoryBranch', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量修改所属分支的需求 ID 列表，对应 18.5 story/batchChangeBranch 页面 storyIdList[] 字段'),
    branchId: z.number().int().nonnegative().describe('目标分支 ID；0 表示主分支'),
    confirmBranch: z.enum(['yes', 'no']).optional().default('yes').describe('是否确认覆盖计划分支不一致的需求；yes 跳过二次确认，no 在冲突时中止'),
    storyType: z.enum(['story', 'requirement']).optional().default('story').describe('需求类型，禅道 18.5 区分 story 和 requirement'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, branchId, confirmBranch, storyType, confirm }) => runWithPreview('batchChangeStoryBranch', confirm, { storyIds, branchId, confirmBranch, storyType }, previewOrAssertWriteAllowed, () => getApi().story.batchChangeStoryBranch({ storyIds, branchId, confirm: confirmBranch, storyType })));

  server.tool('batchChangeStoryStage', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量修改阶段的需求 ID 列表，对应 18.5 story/batchChangeStage 页面 storyIdList[] 字段'),
    stage: z.string().trim().min(1).describe('目标阶段，如 wait/planned/projected/developing/developped/verified/closed'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, stage, confirm }) => runWithPreview('batchChangeStoryStage', confirm, { storyIds, stage }, previewOrAssertWriteAllowed, () => getApi().story.batchChangeStoryStage({ storyIds, stage })));

  server.tool('batchAssignStoriesTo', {
    storyIds: z.array(z.number().int().positive()).min(1).describe('要批量指派的需求 ID 列表，对应 18.5 story/batchAssignTo 页面 storyIdList[] 字段'),
    assignedTo: z.string().trim().min(1).describe('指派人禅道账号。对齐 18.5 story/batchAssignTo 页面 assignedTo 字段'),
    comment: optionalTrimmedText,
    storyType: z.enum(['story', 'requirement']).optional().default('story').describe('需求类型，禅道 18.5 区分 story 和 requirement'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyIds, assignedTo, comment, storyType, confirm }) => runWithPreview('batchAssignStoriesTo', confirm, { storyIds, assignedTo, comment, storyType }, previewOrAssertWriteAllowed, () => getApi().story.batchAssignStoriesTo({ storyIds, assignedTo, comment, storyType })));
}

export function registerTaskDerivedTools(server: CliRegistry): void {
  server.tool('createTaskFromStory', {
    storyId: z.number().int().positive(),
    execution: z.number().int().positive(),
    taskName: z.string().trim().min(1),
    type: optionalTrimmedText.default('devel'),
    assignedTo: z.string().trim().min(1).describe('指派人账号。禅道 18.5 创建任务必填'),
    estimate: z.number().optional(),
    estStarted: z.string().trim().min(1).describe('预计开始日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    deadline: z.string().trim().min(1).describe('截止日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    desc: optionalTrimmedText,
    pri: z.number().optional().describe('优先级 1-4'),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, execution, taskName, type, assignedTo, estimate, estStarted, deadline, desc, pri, confirm }) => {
    const story = await getApi().story.getStoryDetail(storyId);
    const normalizedType = normalizeOptionalText(type) ?? 'devel';
    const normalizedDesc = normalizeOptionalText(desc);
    const payload = {
      execution,
      name: taskName,
      type: normalizedType,
      assignedTo,
      estimate,
      estStarted,
      deadline,
      story: storyId,
      desc: normalizedDesc ?? `基于需求 #${storyId}: ${story.title}`,
      pri,
    };
    return runWithPreview('createTaskFromStory', confirm, payload, previewOrAssertWriteAllowed, () => getApi().task.createTask(payload));
  });

  server.tool('createTaskFromBug', {
    bugId: z.number().int().positive(),
    project: z.number().int().positive().describe('所属项目 ID。按禅道页面转任务链路，需与 execution 一起显式提供'),
    execution: z.number().int().positive(),
    taskName: optionalTrimmedText,
    type: optionalTrimmedText.default('devel'),
    assignedTo: z.string().trim().min(1).describe('指派人账号。禅道 18.5 创建任务必填'),
    estimate: z.number().optional(),
    estStarted: z.string().trim().min(1).describe('预计开始日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    deadline: z.string().trim().min(1).describe('截止日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    desc: optionalTrimmedText,
    pri: z.number().optional().describe('优先级 1-4'),
    confirm: z.boolean().optional().default(false),
  }, async ({ bugId, project, execution, taskName, type, assignedTo, estimate, estStarted, deadline, desc, pri, confirm }) => {
    const bug = await getApi().bug.getBugDetail(bugId);
    const normalizedTaskName = normalizeOptionalText(taskName);
    const normalizedType = normalizeOptionalText(type) ?? 'devel';
    const normalizedDesc = normalizeOptionalText(desc);

    const payload = {
      bugId,
      execution,
      project,
      name: normalizedTaskName ?? `修复Bug #${bugId}: ${bug.title}`,
      type: normalizedType,
      assignedTo,
      estimate,
      estStarted,
      deadline,
      desc: normalizedDesc ?? `修复Bug #${bugId}: ${bug.title}\n\n复现步骤:\n${String(bug.steps ?? '无')}`,
      pri,
    };
    return runWithPreview('createTaskFromBug', confirm, payload, previewOrAssertWriteAllowed, () => getApi().task.convertBugToTask(payload));
  });

  server.tool('createTask', {
    execution: z.number().int().positive(),
    name: z.string().min(1),
    type: z.string().optional(),
    pri: z.number().int().min(0).max(4).optional(),
    assignedTo: z.string().optional(),
    estStarted: z.string().optional(),
    deadline: z.string().optional(),
    desc: z.string().optional(),
    story: z.number().int().positive().optional(),
    parent: z.number().int().positive().optional().describe('父任务 ID；指定后创建的是该任务的子任务，对应禅道 18.5 task::create 的 parent 字段'),
    module: z.number().int().min(0).optional(),
    estimate: z.number().optional(),
    mailto: z.array(z.string().trim().min(1)).optional().describe('抄送人禅道账号列表，对应 18.5 task::create mailto 字段，逗号或数组形式'),
    team: z.array(z.string().trim().min(1)).optional().describe('多人任务模式成员账号列表；与 teamEstimate 长度必须一致；需要同时把 multiple 设为 true'),
    teamEstimate: z.array(z.number().nonnegative()).optional().describe('多人任务模式每个成员工时；与 team 长度一致'),
    multiple: z.boolean().optional().describe('是否多人任务模式；true 时按 team/teamEstimate 拆分任务'),
    uid: optionalTrimmedText.describe('附件上传会话 UID。先用 uploadFile --uid 拿到 fileID，再把同一个 uid 传给本字段即可在创建时绑定附件'),
    confirm: z.boolean().optional().default(false),
  }, async ({ confirm, ...payload }) => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed !== '') cleaned[k] = trimmed;
      } else if (v !== undefined) {
        cleaned[k] = v;
      }
    }
    return runWithPreview('createTask', confirm, cleaned, previewOrAssertWriteAllowed, () => getApi().task.createTask(cleaned as Record<string, unknown> & { execution: number }));
  });
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === '' ? undefined : value;
}

export function registerPlanRelationTools(server: CliRegistry): void {
  server.tool('linkStoriesToPlan', {
    planId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, storyIds, confirm }) => runWithPreview('linkStoriesToPlan', confirm, { planId, storyIds }, previewOrAssertWriteAllowed, () => getApi().plan.linkStoriesToPlan(planId, storyIds)));

  server.tool('unlinkStoriesFromPlan', {
    planId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, storyIds, confirm }) => runWithPreview('unlinkStoriesFromPlan', confirm, { planId, storyIds }, previewOrAssertWriteAllowed, () => getApi().plan.unlinkStoriesFromPlan(planId, storyIds)));

  server.tool('linkBugsToPlan', {
    planId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, bugIds, confirm }) => runWithPreview('linkBugsToPlan', confirm, { planId, bugIds }, previewOrAssertWriteAllowed, () => getApi().plan.linkBugsToPlan(planId, bugIds)));

  server.tool('unlinkBugsFromPlan', {
    planId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, bugIds, confirm }) => runWithPreview('unlinkBugsFromPlan', confirm, { planId, bugIds }, previewOrAssertWriteAllowed, () => getApi().plan.unlinkBugsFromPlan(planId, bugIds)));
}
