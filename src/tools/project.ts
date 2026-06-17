import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProjectTools(server: CliRegistry): void {
  server.tool(
    'getProjects',
    {
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().project.getProjects(input)),
    { costHint: 'low', nextBestTools: ['getProjectDetail', 'getProjectExecutions', 'getProjectBuilds'] },
  );

  server.tool(
    'getProjectDetail',
    {
      projectId: z.number().int().positive(),
    },
    async ({ projectId }) => jsonResult(await getApi().project.getProjectDetail(projectId)),
    { costHint: 'low', nextBestTools: ['getProjectExecutions', 'getProjectBuilds', 'getProjectReleases'] },
  );
}
