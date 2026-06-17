import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { jsonResult, runWithPreview } from './shared.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';

export function registerStoryTools(server: CliRegistry): void {
  server.tool(
    'getProductStories',
    {
      productId: z.number().int().positive(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    },
    async (input) => jsonResult(await getApi().story.getProductStories(input)),
    { costHint: 'low', nextBestTools: ['getStoryDetail', 'getDevelopmentContextSnapshot', 'getProductPlans'] },
  );

  server.tool(
    'getStoryDetail',
    {
      storyId: z.number().int().positive(),
    },
    async ({ storyId }) => jsonResult(await getApi().story.getStoryDetail(storyId)),
    { costHint: 'low', nextBestTools: ['getStoryRelatedBugs', 'getDevelopmentContextSnapshot', 'getProductStories'] },
  );

  server.tool(
    'batchToTaskStories',
    {
      tasks: z.string().describe('JSON 字符串。数组项对应 18.5 batchToTask 表单行：{story,name,module?,assignedTo?,estStarted?,deadline?,type?,pri?,estimate?,color?}'),
      executionId: z.number().int().nonnegative().optional().default(0).describe('执行 ID，可选'),
      projectId: z.number().int().nonnegative().optional().default(0).describe('项目 ID，可选'),
      storyType: z.enum(['story', 'requirement']).optional().default('story'),
      syncFields: z.array(z.enum(['spec', 'mailto'])).optional().describe('从需求同步到任务的字段'),
      confirm: z.boolean().optional().default(false),
    },
    async ({ tasks, executionId, projectId, storyType, syncFields, confirm }) => {
      let parsed: Array<Record<string, unknown>>;
      try {
        parsed = JSON.parse(tasks) as Array<Record<string, unknown>>;
      } catch {
        throw new Error('tasks 必须是合法 JSON 字符串');
      }
      return runWithPreview('batchToTaskStories', confirm, { tasks: parsed, executionId, projectId, storyType, syncFields }, previewOrAssertWriteAllowed, () => getApi().story.batchToTaskStories({ tasks: parsed as Array<{ story: number | 'ditto'; name: string; module?: number | 'ditto'; assignedTo?: string; estStarted?: string; deadline?: string; type?: string; pri?: number; estimate?: number; color?: string }>, executionId, projectId, storyType, syncFields }));
    },
  );
}
