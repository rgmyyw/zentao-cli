import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProfileTools(server: CliRegistry): void {
  const getMyProfile = async () => jsonResult(await getApi().user.getMyProfile());
  server.tool('getMyProfile', {}, getMyProfile);
  server.tool('whoami', {}, getMyProfile);
  server.tool('who-am-i', {}, getMyProfile);
}
