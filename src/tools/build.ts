import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult, runWithPreview } from './shared.js';

export function registerBuildTools(server: CliRegistry): void {
  server.tool('getProjectBuilds', { projectId: z.number().int().positive() }, async ({ projectId }) => jsonResult(await getApi().build.getProjectBuilds(projectId)));
  server.tool('getBuildDetail', { buildId: z.number().int().positive() }, async ({ buildId }) => jsonResult(await getApi().build.getBuildDetail(buildId)));

  server.tool(
    'notifyBuildBug',
    {
      buildId: z.number().int().positive().describe('构建 ID'),
      bugIds: z.array(z.number().int().positive()).min(1).describe('要通知的 Bug ID 列表，对应 18.5 build/notifyBug 页面 bugs[] 字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ buildId, bugIds, confirm }) => runWithPreview('notifyBuildBug', confirm, { buildId, bugIds }, previewOrAssertWriteAllowed, () => getApi().build.notifyBug(buildId, { bugIds })),
  );

  server.tool(
    'assignBuildTo',
    {
      buildId: z.number().int().positive().describe('构建 ID'),
      assignedTo: z.string().trim().min(1).describe('指派人禅道账号'),
      comment: z.string().trim().optional().describe('指派备注'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ buildId, assignedTo, comment, confirm }) => runWithPreview('assignBuildTo', confirm, { buildId, assignedTo, comment }, previewOrAssertWriteAllowed, () => getApi().build.assignTo(buildId, { assignedTo, comment })),
  );
}
