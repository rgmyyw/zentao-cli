import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerReleaseTools(server: CliRegistry): void {
  server.tool('getProjectReleases', { projectId: z.number().int().positive() }, async ({ projectId }) => jsonResult(await getApi().release.getProjectReleases(projectId)));
}
