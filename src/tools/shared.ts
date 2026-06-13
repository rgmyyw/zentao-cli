import { z } from 'zod';
import type { JsonContentResult } from '../types/common.js';

export const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

export function jsonResult(value: unknown): JsonContentResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export async function runWithPreview(
  action: string,
  confirm: boolean | undefined,
  payload: Record<string, unknown>,
  previewOrAssertWriteAllowed: (input: { action: string; confirm: boolean | undefined; payload: Record<string, unknown> }) => unknown,
  runner: () => Promise<unknown>,
): Promise<JsonContentResult> {
  const preview = previewOrAssertWriteAllowed({ action, confirm, payload });
  if (preview) return jsonResult(preview);
  return jsonResult(await runner());
}
