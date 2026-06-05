import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { getApi } from '../core/api-provider.js';
import { previewOrAssertWriteAllowed } from '../core/write-guard.js';
import { jsonResult } from './shared.js';

const objectTypeSchema = z.enum(['task', 'bug', 'story', 'product', 'project', 'execution']);

export function registerCommentTools(server: CliRegistry): void {
  server.tool(
    'getComments',
    {
      objectType: objectTypeSchema,
      objectID: z.number().int().positive(),
    },
    async ({ objectType, objectID }) => jsonResult(await getApi().comment.getComments(objectType, objectID)),
  );

  server.tool(
    'addComment',
    {
      objectType: objectTypeSchema,
      objectID: z.number().int().positive(),
      comment: z.string().min(1),
      confirm: z.boolean().optional().default(false),
    },
    async ({ confirm, ...input }) => {
      const preview = previewOrAssertWriteAllowed({ action: 'addComment', confirm, payload: input });
      if (preview) return jsonResult(preview);
      return jsonResult(await getApi().comment.addComment(input));
    },
  );
}
