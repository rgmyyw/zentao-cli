import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerBuildTools(server: CliRegistry): void {
  server.tool('getProjectBuilds', { projectId: z.number().int().positive() }, async ({ projectId }) => jsonResult(await getApi().build.getProjectBuilds(projectId)));
  server.tool('getBuildDetail', { buildId: z.number().int().positive() }, async ({ buildId }) => jsonResult(await getApi().build.getBuildDetail(buildId)));
}
