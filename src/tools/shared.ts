import { z } from 'zod';
import type { JsonContentResult } from '../types/common.js';

export type OutputMode = 'compact' | 'normal' | 'verbose';

let currentOutputMode: OutputMode = 'compact';

export const optionalTrimmedText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);

export function jsonResult(value: unknown, mode?: OutputMode): JsonContentResult {
  const effectiveMode = mode ?? currentOutputMode;
  const payload = effectiveMode === 'verbose'
    ? value
    : effectiveMode === 'normal'
      ? normalizeNormalPayload(value)
      : normalizeCompactPayload(value);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload),
      },
    ],
  };
}

export function setGlobalOutputMode(mode: OutputMode): void {
  currentOutputMode = mode;
}

export function getGlobalOutputMode(): OutputMode {
  return currentOutputMode;
}

export function withToolMeta(value: unknown, meta: Record<string, unknown>): unknown {
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    meta: {
      ...(isPlainObject((value as Record<string, unknown>).meta) ? (value as Record<string, unknown>).meta as Record<string, unknown> : {}),
      ...meta,
    },
  };
}

function normalizeCompactPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length <= 20 ? value : { total: value.length, items: value.slice(0, 20) };
  }

  if (!isPlainObject(value)) return value;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const compact: Record<string, unknown> = {};
  for (const key of keys) {
    if (key === 'items' && Array.isArray(record.items)) {
      compact.items = record.items.length <= 20 ? record.items : record.items.slice(0, 20);
      continue;
    }
    if (['content', 'data', 'raw', 'html', 'text', 'message'].includes(key) && typeof record[key] === 'string' && String(record[key]).length > 600) {
      compact[key] = `${String(record[key]).slice(0, 600)}…`;
      continue;
    }
    compact[key] = record[key];
  }
  return compact;
}

function normalizeNormalPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (!isPlainObject(value)) return value;

  const record = value as Record<string, unknown>;
  return {
    ...record,
    meta: extractMeta(record),
  };
}

function extractMeta(record: Record<string, unknown>): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  for (const key of ['source', 'partial', 'page', 'limit', 'total', 'scanned', 'durationMs', 'cacheHit', 'fallbackUsed']) {
    if (key in record) meta[key] = record[key];
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
