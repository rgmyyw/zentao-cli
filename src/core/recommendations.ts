import { z, type ZodTypeAny } from 'zod';
import type { ArgumentMapping, CliCommandDefinition, CliCommandMetadata, Recommendation } from './cli-registry.js';

export interface ResolvedRecommendation {
  tool: string;
  reason: string;
  priority: number;
  args: Record<string, unknown>;
  example?: string;
}

export interface ResolveRecommendationsOptions {
  command: Pick<CliCommandDefinition, 'metadata'>;
  input: Record<string, unknown>;
  payload: unknown;
  availableCommandNames: Iterable<string>;
  registry?: Pick<CliRegistryLike, 'getCommand'>;
}

export interface CliRegistryLike {
  getCommand(name: string): { name: string; schema: Record<string, ZodTypeAny> } | undefined;
}

export function resolveRecommendations(options: ResolveRecommendationsOptions): ResolvedRecommendation[] {
  const { command, input, payload, availableCommandNames, registry } = options;
  const metadata = command.metadata;
  if (!metadata) return [];

  const available = new Set(availableCommandNames);
  const candidates: Recommendation[] = [];

  if (metadata.recommendations && metadata.recommendations.length > 0) {
    candidates.push(...metadata.recommendations);
  }

  for (const tool of metadata.nextBestTools ?? []) {
    if (candidates.some((candidate) => candidate.tool === tool)) continue;
    candidates.push({ tool, reason: '下一步可调用' });
  }

  if (candidates.length === 0) return [];

  const resolved: ResolvedRecommendation[] = [];

  for (const candidate of candidates) {
    if (!available.has(candidate.tool)) continue;
    const target = registry?.getCommand(candidate.tool);
    const args: Record<string, unknown> = {};
    if (candidate.args) {
      for (const [paramName, value] of Object.entries(candidate.args)) {
        const resolved = resolveArgumentValue(value, input, payload);
        if (resolved !== undefined) args[paramName] = resolved;
      }
    }

    const example = target && canBuildRecommendationExample(target.schema, args)
      ? buildRecommendationExample(candidate.tool, target.schema, args)
      : undefined;

    resolved.push({
      tool: candidate.tool,
      reason: candidate.reason,
      priority: candidate.priority ?? 0,
      args,
      example,
    });
  }

  resolved.sort((left, right) => right.priority - left.priority);
  return resolved;
}

export function readMapping(mapping: ArgumentMapping, input: Record<string, unknown>, payload: unknown): unknown {
  const root = mapping.source === 'input' ? input : payload;
  return readPathByDots(root, mapping.path);
}

export function resolveArgumentValue(value: unknown, input: Record<string, unknown>, payload: unknown): unknown {
  if (isArgumentMapping(value)) {
    const resolved = readMapping(value, input, payload);
    return resolved === undefined ? undefined : resolved;
  }
  return value;
}

function isArgumentMapping(value: unknown): value is ArgumentMapping {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.source === 'input' || record.source === 'payload';
}

export function readPathByDots(value: unknown, path: string): unknown {
  if (value === undefined || value === null) return undefined;
  if (!path) return undefined;

  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (current === undefined || current === null) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function buildRecommendationExample(tool: string, schema: Record<string, ZodTypeAny>, args: Record<string, unknown>): string {
  const parts: string[] = [`zentao ${tool}`];
  const orderedKeys = Object.keys(schema);
  const seen = new Set<string>();

  for (const key of orderedKeys) {
    if (key in args) {
      parts.push(formatArgValue(key, args[key]));
      seen.add(key);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    if (seen.has(key)) continue;
    parts.push(formatArgValue(key, value));
  }

  if (isWriteTool(tool, schema) && !hasConfirmInArgs(args, schema)) {
    parts.push('--confirm true');
  }

  return parts.join(' ');
}

export function canBuildRecommendationExample(schema: Record<string, ZodTypeAny>, args: Record<string, unknown>): boolean {
  return Object.entries(schema).every(([key, fieldSchema]) => key in args || isOptionalSchema(fieldSchema));
}

function isOptionalSchema(schema: ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) return true;
  if (schema instanceof z.ZodNullable) return isOptionalSchema(schema.unwrap());
  if (schema instanceof z.ZodEffects) return isOptionalSchema(schema.innerType());
  return false;
}

function formatArgValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return `--${key}`;
  if (typeof value === 'boolean') return `--${key} ${value ? 'true' : 'false'}`;
  if (typeof value === 'number' || typeof value === 'bigint') return `--${key} ${String(value)}`;
  if (Array.isArray(value)) {
    return `--${key} ${value.map((item) => formatScalar(item)).join(',')}`;
  }
  return `--${key} ${quoteIfNeeded(formatScalar(value))}`;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function quoteIfNeeded(value: string): string {
  if (value === '') return '""';
  if (/[\s"'`$<>|&;]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function isWriteTool(_tool: string, schema: Record<string, ZodTypeAny>): boolean {
  return 'confirm' in schema;
}

function hasConfirmInArgs(args: Record<string, unknown>, schema: Record<string, ZodTypeAny>): boolean {
  if ('confirm' in args) return true;
  return Object.keys(args).some((key) => key in schema && key === 'confirm');
}

export function extractRecommendationsFromMetadata(metadata: CliCommandMetadata | undefined): Recommendation[] {
  if (!metadata) return [];
  const seen = new Set<string>();
  const result: Recommendation[] = [];
  for (const item of metadata.recommendations ?? []) {
    if (seen.has(item.tool)) continue;
    seen.add(item.tool);
    result.push(item);
  }
  for (const tool of metadata.nextBestTools ?? []) {
    if (seen.has(tool)) continue;
    seen.add(tool);
    result.push({ tool, reason: '下一步可调用' });
  }
  return result;
}
