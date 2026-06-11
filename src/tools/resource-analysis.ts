import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

const resourceInput = {
  outDir: z.string().optional().describe('资源下载目录。不传时使用系统临时目录。'),
  maxInlineBytes: z.number().int().positive().optional().describe('小文本/日志内联分析的最大字节数，默认 204800。'),
  download: z.boolean().optional().default(true).describe('是否下载资源。false 时仅解析资源线索。'),
};

export function registerResourceAnalysisTools(server: CliRegistry): void {
  server.tool(
    'analyzeBugResources',
    {
      bugId: z.number().int().positive(),
      ...resourceInput,
    },
    async ({ bugId, ...input }) => jsonResult(await getApi().resourceAnalysis.analyzeObjectResources({ objectType: 'bug', objectID: bugId, ...input })),
  );

  server.tool(
    'analyzeTaskResources',
    {
      taskId: z.number().int().positive(),
      ...resourceInput,
    },
    async ({ taskId, ...input }) => jsonResult(await getApi().resourceAnalysis.analyzeObjectResources({ objectType: 'task', objectID: taskId, ...input })),
  );
}
