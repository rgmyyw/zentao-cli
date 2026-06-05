import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProfileTools(server: CliRegistry): void {
  server.tool('getMyProfile', {}, async () => jsonResult(await getApi().user.getMyProfile()));
}
