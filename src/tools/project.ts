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
    {
      costHint: 'low',
      nextBestTools: ['getProjectDetail', 'getProjectExecutions', 'getProjectBuilds'],
      recommendations: [
        { tool: 'getProjectExecutions', reason: '查看项目下的执行列表' },
        { tool: 'getProjectBuilds', reason: '查看项目下的构建' },
        { tool: 'getProjectReleases', reason: '查看项目下的发布' },
      ],
    },
  );

  server.tool(
    'getProjectDetail',
    {
      projectId: z.number().int().positive(),
    },
    async ({ projectId }) => jsonResult(await getApi().project.getProjectDetail(projectId)),
    {
      costHint: 'low',
      nextBestTools: ['getProjectExecutions', 'getProjectBuilds', 'getProjectReleases'],
      recommendations: [
        { tool: 'getProjectExecutions', reason: '查看项目下的执行列表', args: { projectId: { source: 'input', path: 'projectId' } } },
        { tool: 'getProjectBuilds', reason: '查看项目下的构建', args: { projectId: { source: 'input', path: 'projectId' } } },
        { tool: 'getProjectReleases', reason: '查看项目下的发布', args: { projectId: { source: 'input', path: 'projectId' } } },
      ],
    },
  );
}
