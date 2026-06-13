import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { optionalTrimmedText, runWithPreview } from './shared.js';

export function registerStoryWriteTools(server: CliRegistry): void {
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
    pri: z.number().optional(),
    estimate: z.number().optional(),
    category: optionalTrimmedText,
    mailto: z.array(z.string().trim().min(1)).optional(),
    keywords: optionalTrimmedText,
    stage: optionalTrimmedText,
    notifyEmail: z.array(z.string().trim().min(1)).optional(),
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
  }, async ({ bugId, execution, taskName, type, assignedTo, estimate, estStarted, deadline, desc, pri, confirm }) => {
    const bug = await getApi().bug.getBugDetail(bugId);
    const normalizedTaskName = normalizeOptionalText(taskName);
    const normalizedType = normalizeOptionalText(type) ?? 'devel';
    const normalizedDesc = normalizeOptionalText(desc);
    const payload = {
      execution,
      name: normalizedTaskName ?? `修复Bug #${bugId}: ${bug.title}`,
      type: normalizedType,
      assignedTo,
      estimate,
      estStarted,
      deadline,
      fromBug: bugId,
      desc: normalizedDesc ?? `修复Bug #${bugId}: ${bug.title}\n\n复现步骤:\n${String(bug.steps ?? '无')}`,
      pri,
    };
    return runWithPreview('createTaskFromBug', confirm, payload, previewOrAssertWriteAllowed, () => getApi().task.createTask(payload));
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
