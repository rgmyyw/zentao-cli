import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, runWithPreview } from './shared.js';

export function registerReleaseTools(server: CliRegistry): void {
  server.tool('getProjectReleases', { projectId: z.number().int().positive() }, async ({ projectId }) => jsonResult(await getApi().release.getProjectReleases(projectId)), {
    costHint: 'low',
    nextBestTools: ['getReleaseDetail', 'getProjectBuilds', 'getProjectDetail'],
  });
  server.tool('getReleaseDetail', { releaseId: z.number().int().positive() }, async ({ releaseId }) => jsonResult(await getApi().release.getReleaseDetail(releaseId)), {
    costHint: 'low',
    nextBestTools: ['getProjectReleases', 'getBuildDetail', 'getComments'],
  });
}

export function registerReleaseWriteTools(server: CliRegistry): void {
  server.tool('changeReleaseStatus', {
    releaseId: z.number().int().positive(),
    status: z.enum(['normal', 'terminate']),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, status, confirm }) => runWithPreview(
    'changeReleaseStatus',
    confirm,
    { releaseId, status },
    previewOrAssertWriteAllowed,
    () => getApi().release.changeReleaseStatus(releaseId, status),
  ));

  server.tool('notifyRelease', {
    releaseId: z.number().int().positive(),
    notify: z.array(z.string().trim().min(1)).min(1).describe('通知渠道数组，如 FB/BETA'),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, notify, confirm }) => {
    const payload = { releaseId, payload: { notify } };
    return runWithPreview('notifyRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.notifyRelease(releaseId, { notify }));
  });

  server.tool('deleteRelease', {
    releaseId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, confirm }) => runWithPreview(
    'deleteRelease',
    confirm,
    { releaseId },
    previewOrAssertWriteAllowed,
    () => getApi().release.deleteRelease(releaseId),
  ));

  server.tool('linkStoriesToRelease', {
    releaseId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(50),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, storyIds, confirm }) => {
    const payload = { releaseId, payload: { storyIds } };
    return runWithPreview('linkStoriesToRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.linkStoriesToRelease(releaseId, { storyIds }));
  });

  server.tool('unlinkStoryFromRelease', {
    releaseId: z.number().int().positive(),
    storyId: z.number().int().positive(),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, storyId, confirm }) => runWithPreview(
    'unlinkStoryFromRelease',
    confirm,
    { releaseId, storyId },
    previewOrAssertWriteAllowed,
    () => getApi().release.unlinkStoryFromRelease(releaseId, storyId),
  ));

  server.tool('batchUnlinkStoriesFromRelease', {
    releaseId: z.number().int().positive(),
    storyIds: z.array(z.number().int().positive()).min(1).max(50),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, storyIds, confirm }) => {
    const payload = { releaseId, payload: { storyIds } };
    return runWithPreview('batchUnlinkStoriesFromRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.batchUnlinkStoriesFromRelease(releaseId, { storyIds }));
  });

  server.tool('linkBugsToRelease', {
    releaseId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(50),
    type: z.enum(['bug', 'leftBug']).optional().default('bug'),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, bugIds, type, confirm }) => {
    const payload = { releaseId, payload: { bugIds, type } };
    return runWithPreview('linkBugsToRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.linkBugsToRelease(releaseId, { bugIds, type }));
  });

  server.tool('unlinkBugFromRelease', {
    releaseId: z.number().int().positive(),
    bugId: z.number().int().positive(),
    type: z.enum(['bug', 'leftBug']).optional().default('bug'),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, bugId, type, confirm }) => runWithPreview(
    'unlinkBugFromRelease',
    confirm,
    { releaseId, bugId, type },
    previewOrAssertWriteAllowed,
    () => getApi().release.unlinkBugFromRelease(releaseId, bugId, type),
  ));

  server.tool('batchUnlinkBugsFromRelease', {
    releaseId: z.number().int().positive(),
    bugIds: z.array(z.number().int().positive()).min(1).max(50),
    type: z.enum(['bug', 'leftBug']).optional().default('bug'),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, bugIds, type, confirm }) => {
    const payload = { releaseId, payload: { bugIds, type } };
    return runWithPreview('batchUnlinkBugsFromRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.batchUnlinkBugsFromRelease(releaseId, { bugIds, type }));
  });

  server.tool('createRelease', {
    product: z.number().int().positive().describe('产品 ID'),
    name: z.string().trim().min(1).describe('发布名'),
    branch: z.number().int().nonnegative().optional().default(0).describe('分支 ID'),
    build: z.number().int().positive().optional().describe('构建 ID'),
    date: z.string().trim().optional().describe('发布日期'),
    desc: z.string().trim().optional().describe('发布说明'),
    status: z.enum(['normal', 'terminate']).optional().describe('状态'),
    confirm: z.boolean().optional().default(false),
  }, async ({ product, name, branch, build, date, desc, status, confirm }) => {
    const payload: Record<string, unknown> = { product, name };
    if (branch !== undefined) payload.branch = branch;
    if (build !== undefined) payload.build = build;
    if (date) payload.date = date;
    if (desc) payload.desc = desc;
    if (status) payload.status = status;
    return runWithPreview('createRelease', confirm, payload, previewOrAssertWriteAllowed, () => getApi().release.createRelease({ product, branch, name, build, date, desc, status }));
  });

  server.tool('updateRelease', {
    releaseId: z.number().int().positive().describe('发布 ID'),
    name: z.string().trim().optional().describe('发布名'),
    build: z.number().int().positive().optional().describe('构建 ID'),
    date: z.string().trim().optional().describe('发布日期'),
    desc: z.string().trim().optional().describe('发布说明'),
    status: z.enum(['normal', 'terminate']).optional().describe('状态'),
    confirm: z.boolean().optional().default(false),
  }, async ({ releaseId, name, build, date, desc, status, confirm }) => runWithPreview('updateRelease', confirm, { releaseId, name, build, date, desc, status }, previewOrAssertWriteAllowed, () => getApi().release.updateRelease(releaseId, { name, build, date, desc, status })));

  server.tool('exportRelease', {
    releaseId: z.number().int().positive().describe('发布 ID'),
  }, async ({ releaseId }) => jsonResult(await getApi().release.exportRelease(releaseId)));
}
