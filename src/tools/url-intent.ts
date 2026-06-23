import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { loadConfig } from '../core/config.js';
import { parseUrlIntent } from '../core/url-intent.js';
import { jsonResult } from './shared.js';

export function registerUrlIntentTools(server: CliRegistry): void {
  server.tool(
    'parseUrlIntent',
    {
      url: z.string().trim().min(1).describe('要解析的禅道浏览器 URL、页面文件路径或页面文件名。'),
    },
    async ({ url }) => jsonResult(parseUrlIntent(url, { serverUrl: loadConfig()?.url })),
    { costHint: 'low', nextBestTools: ['getExecutionDetail', 'getBugDetail', 'getProjectDetail'] },
  );
}
