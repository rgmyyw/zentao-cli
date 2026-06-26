import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { InMemoryCliRegistry } from '../../src/core/cli-registry.js';
import { buildRecommendationExample, canBuildRecommendationExample, readPathByDots, resolveRecommendations, resolveArgumentValue } from '../../src/core/recommendations.js';

describe('readPathByDots', () => {
  it('逐级读取对象路径', () => {
    expect(readPathByDots({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('路径不存在时返回 undefined', () => {
    expect(readPathByDots({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(readPathByDots(null, 'a')).toBeUndefined();
    expect(readPathByDots(undefined, 'a')).toBeUndefined();
    expect(readPathByDots('foo', 'a')).toBeUndefined();
    expect(readPathByDots({ a: 1 }, '')).toBeUndefined();
  });
});

describe('resolveArgumentValue', () => {
  it('直接返回字面量值', () => {
    expect(resolveArgumentValue('hello', {}, {})).toBe('hello');
    expect(resolveArgumentValue(42, {}, {})).toBe(42);
    expect(resolveArgumentValue(true, {}, {})).toBe(true);
    expect(resolveArgumentValue(null, {}, {})).toBe(null);
  });

  it('解析 input 上的路径', () => {
    const value = resolveArgumentValue({ source: 'input', path: 'taskId' }, { taskId: 7 }, null);
    expect(value).toBe(7);
  });

  it('解析 payload 上的嵌套路径', () => {
    const value = resolveArgumentValue({ source: 'payload', path: 'relatedStory.id' }, {}, { relatedStory: { id: 99 } });
    expect(value).toBe(99);
  });

  it('路径解析不到时返回 undefined', () => {
    const value = resolveArgumentValue({ source: 'payload', path: 'missing' }, {}, { a: 1 });
    expect(value).toBeUndefined();
  });
});

describe('buildRecommendationExample', () => {
  it('按 schema 顺序渲染参数', () => {
    const schema = {
      bugId: z.number().int().positive(),
      resolution: z.string().optional(),
    };
    const text = buildRecommendationExample('resolveBug', schema, { bugId: 123, resolution: 'fixed' });
    expect(text).toBe('zentao resolveBug --bugId 123 --resolution fixed');
  });

  it('写命令自动追加 --confirm true', () => {
    const schema = {
      bugId: z.number().int().positive(),
      resolution: z.string(),
      confirm: z.boolean().optional().default(false),
    };
    const text = buildRecommendationExample('resolveBug', schema, { bugId: 1, resolution: 'fixed' });
    expect(text).toBe('zentao resolveBug --bugId 1 --resolution fixed --confirm true');
  });

  it('已经显式传 confirm 时不重复追加', () => {
    const schema = {
      bugId: z.number().int().positive(),
      confirm: z.boolean().optional().default(false),
    };
    const text = buildRecommendationExample('resolveBug', schema, { bugId: 1, confirm: true });
    expect(text).toBe('zentao resolveBug --bugId 1 --confirm true');
  });

  it('对含空白或特殊字符的字符串加引号', () => {
    const schema = { name: z.string(), comment: z.string().optional() };
    const text = buildRecommendationExample('updateTask', schema, { name: 'demo', comment: 'a b "c"' });
    expect(text).toBe('zentao updateTask --name demo --comment "a b \\"c\\""');
  });

  it('布尔值序列化为 true/false', () => {
    const schema = { force: z.boolean() };
    expect(buildRecommendationExample('doIt', schema, { force: true })).toBe('zentao doIt --force true');
    expect(buildRecommendationExample('doIt', schema, { force: false })).toBe('zentao doIt --force false');
  });
});

describe('canBuildRecommendationExample', () => {
  it('必填参数未填齐时返回 false', () => {
    const schema = {
      bugId: z.number().int().positive(),
      resolution: z.string(),
      confirm: z.boolean().optional().default(false),
    };

    expect(canBuildRecommendationExample(schema, { bugId: 1 })).toBe(false);
  });

  it('必填参数填齐且只缺可选参数时返回 true', () => {
    const schema = {
      bugId: z.number().int().positive(),
      resolution: z.string(),
      comment: z.string().optional(),
      confirm: z.boolean().optional().default(false),
    };

    expect(canBuildRecommendationExample(schema, { bugId: 1, resolution: 'fixed' })).toBe(true);
  });

  it('nullable 参数缺失时仍视为必填', () => {
    const schema = {
      name: z.string().nullable(),
    };

    expect(canBuildRecommendationExample(schema, {})).toBe(false);
    expect(canBuildRecommendationExample(schema, { name: null })).toBe(true);
  });
});

describe('resolveRecommendations', () => {
  function buildRegistry(): InMemoryCliRegistry {
    const registry = new InMemoryCliRegistry();
    registry.tool('getBugDetail', { bugId: z.number().int().positive() }, () => ({ content: [{ type: 'text' as const, text: '{}' }] }));
    registry.tool('resolveBug', { bugId: z.number().int().positive(), resolution: z.string(), confirm: z.boolean().optional().default(false) }, () => ({ content: [{ type: 'text' as const, text: '{}' }] }));
    registry.tool('addComment', { objectType: z.string(), objectID: z.number().int().positive(), comment: z.string(), confirm: z.boolean().optional().default(false) }, () => ({ content: [{ type: 'text' as const, text: '{}' }] }));
    registry.tool('searchStories', { keyword: z.string().trim().min(1) }, () => ({ content: [{ type: 'text' as const, text: '{}' }] }));
    return registry;
  }

  it('从 metadata.recommendations 解析并填充 input 参数', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {
        metadata: {
          recommendations: [
            { tool: 'resolveBug', reason: '解决 Bug', args: { bugId: { source: 'input', path: 'bugId' } } },
            { tool: 'getBugDetail', reason: '查看详情' },
          ],
        },
      },
      input: { bugId: 84362 },
      payload: null,
      availableCommandNames: ['getBugDetail', 'resolveBug'],
      registry,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.tool).toBe('resolveBug');
    expect(result[0]?.args).toEqual({ bugId: 84362 });
    expect(result[0]?.example).toBeUndefined();
    expect(result[1]?.tool).toBe('getBugDetail');
  });

  it('按可用命令列表过滤', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {
        metadata: {
          recommendations: [
            { tool: 'resolveBug', reason: 'a' },
            { tool: 'privateTool', reason: 'b' },
          ],
        },
      },
      input: {},
      payload: null,
      availableCommandNames: ['resolveBug'],
      registry,
    });

    expect(result.map((r) => r.tool)).toEqual(['resolveBug']);
  });

  it('没有 metadata 时返回空数组', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {},
      input: {},
      payload: null,
      availableCommandNames: ['getBugDetail'],
      registry,
    });

    expect(result).toEqual([]);
  });

  it('回退到 nextBestTools', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {
        metadata: { nextBestTools: ['getBugDetail', 'resolveBug'] },
      },
      input: { bugId: 1 },
      payload: null,
      availableCommandNames: ['getBugDetail', 'resolveBug'],
      registry,
    });

    expect(result.map((r) => r.tool)).toEqual(['getBugDetail', 'resolveBug']);
    expect(result[0]?.reason).toBe('下一步可调用');
  });

  it('路径解析失败时该参数不出现在 args 中', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {
        metadata: {
          recommendations: [
            { tool: 'resolveBug', reason: 'r', args: { bugId: { source: 'payload', path: 'id' } } },
          ],
        },
      },
      input: {},
      payload: { other: 1 },
      availableCommandNames: ['resolveBug'],
      registry,
    });

    expect(result[0]?.args).toEqual({});
    expect(result[0]?.example).toBeUndefined();
  });

  it('按 priority 倒序排序', () => {
    const registry = buildRegistry();
    const result = resolveRecommendations({
      command: {
        metadata: {
          recommendations: [
            { tool: 'getBugDetail', reason: 'low', priority: -1 },
            { tool: 'resolveBug', reason: 'high', priority: 5 },
            { tool: 'addComment', reason: 'mid', priority: 0 },
          ],
        },
      },
      input: { bugId: 1 },
      payload: null,
      availableCommandNames: ['getBugDetail', 'resolveBug', 'addComment'],
      registry,
    });

    expect(result.map((r) => r.tool)).toEqual(['resolveBug', 'addComment', 'getBugDetail']);
  });
});
