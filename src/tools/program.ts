import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProgramTools(server: CliRegistry): void {
  server.tool('getPrograms', { order: z.string().optional() }, async ({ order }) => jsonResult(await getApi().program.getPrograms(order)));
  server.tool('getProgramDetail', { programId: z.number().int().positive() }, async ({ programId }) => jsonResult(await getApi().program.getProgramDetail(programId)));
}
