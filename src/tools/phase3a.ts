import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

async function runPreviewed(action: string, confirm: boolean | undefined, payload: unknown, runner: () => Promise<unknown>) {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload });
  if (preview) return jsonResult(preview);
  return jsonResult(await runner());
}

export function registerStoryWriteTools(server: CliRegistry): void {
  server.tool('updateStory', {
    storyId: z.number().int().positive(),
    title: z.string().optional(),
    product: z.number().int().positive().optional(),
    parent: z.number().int().nonnegative().optional(),
    reviewer: z.string().optional(),
    type: z.string().optional(),
    plan: z.number().int().nonnegative().optional(),
    module: z.number().int().nonnegative().optional(),
    source: z.string().optional(),
    sourceNote: z.string().optional(),
    pri: z.number().optional(),
    estimate: z.number().optional(),
    category: z.string().optional(),
    mailto: z.array(z.string()).optional(),
    keywords: z.string().optional(),
    stage: z.string().optional(),
    notifyEmail: z.array(z.string()).optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...update }) => runPreviewed('updateStory', confirm, { storyId, update }, () => getApi().story.updateStory(storyId, update)));

  server.tool('changeStory', {
    storyId: z.number().int().positive(),
    title: z.string().min(1).describe('禅道 18.5 change story 必填'),
    spec: z.string().optional(),
    verify: z.string().optional(),
    reviewer: z.string().optional(),
    comment: z.string().optional(),
    executions: z.array(z.number().int().positive()).optional(),
    bugs: z.array(z.number().int().positive()).optional(),
    cases: z.array(z.number().int().positive()).optional(),
    tasks: z.array(z.number().int().positive()).optional(),
    reviewedBy: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, confirm, ...update }) => runPreviewed('changeStory', confirm, { storyId, update }, () => getApi().story.changeStory(storyId, update)));
}

export function registerTaskDerivedTools(server: CliRegistry): void {
  server.tool('createTaskFromStory', {
    storyId: z.number().int().positive(),
    execution: z.number().int().positive(),
    taskName: z.string().min(1),
    type: z.string().optional().default('devel'),
    assignedTo: z.string().min(1).describe('指派人账号。禅道 18.5 创建任务必填'),
    estimate: z.number().optional(),
    estStarted: z.string().min(1).describe('预计开始日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    deadline: z.string().min(1).describe('截止日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    desc: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ storyId, execution, taskName, type, assignedTo, estimate, estStarted, deadline, desc, confirm }) => {
    const story = await getApi().story.getStoryDetail(storyId);
    const payload = {
      execution,
      name: taskName,
      type,
      assignedTo,
      estimate,
      estStarted,
      deadline,
      story: storyId,
      desc: desc ?? `基于需求 #${storyId}: ${story.title}`,
    };
    return runPreviewed('createTaskFromStory', confirm, payload, () => getApi().task.createTask(payload));
  });

  server.tool('createTaskFromBug', {
    bugId: z.number().int().positive(),
    execution: z.number().int().positive(),
    taskName: z.string().optional(),
    type: z.string().optional().default('devel'),
    assignedTo: z.string().min(1).describe('指派人账号。禅道 18.5 创建任务必填'),
    estimate: z.number().optional(),
    estStarted: z.string().min(1).describe('预计开始日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    deadline: z.string().min(1).describe('截止日期。禅道 18.5 创建任务必填，格式 YYYY-MM-DD'),
    desc: z.string().optional(),
    confirm: z.boolean().optional().default(false),
  }, async ({ bugId, execution, taskName, type, assignedTo, estimate, estStarted, deadline, desc, confirm }) => {
    const bug = await getApi().bug.getBugDetail(bugId);
    const payload = {
      execution,
      name: taskName ?? `修复Bug #${bugId}: ${bug.title}`,
      type,
      assignedTo,
      estimate,
      estStarted,
      deadline,
      fromBug: bugId,
      desc: desc ?? `修复Bug #${bugId}: ${bug.title}\n\n复现步骤:\n${String(bug.steps ?? '无')}`,
    };
    return runPreviewed('createTaskFromBug', confirm, payload, () => getApi().task.createTask(payload));
  });
}

export function registerPlanRelationTools(server: CliRegistry): void {
  server.tool('linkStoriesToPlan', {
    planId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, storyIds, confirm }) => runPreviewed('linkStoriesToPlan', confirm, { planId, storyIds }, () => getApi().plan.linkStoriesToPlan(planId, storyIds)));

  server.tool('unlinkStoriesFromPlan', {
    planId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, storyIds, confirm }) => runPreviewed('unlinkStoriesFromPlan', confirm, { planId, storyIds }, () => getApi().plan.unlinkStoriesFromPlan(planId, storyIds)));

  server.tool('linkBugsToPlan', {
    planId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, bugIds, confirm }) => runPreviewed('linkBugsToPlan', confirm, { planId, bugIds }, () => getApi().plan.linkBugsToPlan(planId, bugIds)));

  server.tool('unlinkBugsFromPlan', {
    planId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(20),
    confirm: z.boolean().optional().default(false),
  }, async ({ planId, bugIds, confirm }) => runPreviewed('unlinkBugsFromPlan', confirm, { planId, bugIds }, () => getApi().plan.unlinkBugsFromPlan(planId, bugIds)));
}
