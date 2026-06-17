import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerProfileTools(server: CliRegistry): void {
  const getMyProfile = async () => jsonResult(await getApi().user.getMyProfile());
  const metadata = { costHint: 'low' as const, nextBestTools: ['getMyTasks', 'getMyBugs', 'getMyWeeklyActivity'] };
  server.tool('getMyProfile', {}, getMyProfile, metadata);
  server.tool('whoami', {}, getMyProfile, metadata);
  server.tool('who-am-i', {}, getMyProfile, metadata);
}
