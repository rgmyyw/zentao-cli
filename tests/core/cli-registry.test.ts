import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryCliRegistry, parseCommandInput } from '../../src/core/cli-registry.js';

describe('InMemoryCliRegistry', () => {
  it('支持注册、读取和排序列出命令', () => {
    const registry = new InMemoryCliRegistry();
    const handler = vi.fn(() => ({ content: [{ type: 'text' as const, text: 'ok' }] }));

    registry.tool('beta', { id: z.number() }, handler);
    registry.tool('alpha', { name: z.string() }, handler);

    expect(registry.getCommand('beta')?.name).toBe('beta');
    expect(registry.getCommand('missing')).toBeUndefined();
    expect(registry.listCommands().map((command) => command.name)).toEqual(['alpha', 'beta']);
  });
});

describe('parseCommandInput', () => {
  it('支持布尔、数字、optional、default 和 effects 类型', () => {
    const schema = {
      name: z.string(),
      force: z.boolean().optional(),
      page: z.number().default(1),
      count: z.preprocess((value) => value, z.number()),
    };

    expect(parseCommandInput(schema, ['--name', 'demo', '--force', '--count', '5'])).toEqual({
      name: 'demo',
      force: true,
      page: 1,
      count: 5,
    });
  });

  it('支持重复参数、逗号数组、JSON 数组、对象和 union', () => {
    const schema = {
      repeated: z.array(z.string()),
      csv: z.array(z.string()),
      json: z.array(z.number()),
      meta: z.object({ enabled: z.boolean() }),
      mode: z.union([z.number(), z.boolean()]),
    };

    expect(
      parseCommandInput(schema, [
        '--repeated',
        'alpha',
        '--repeated',
        'beta',
        '--csv',
        'a, b',
        '--json',
        '[1,2]',
        '--meta',
        '{"enabled":true}',
        '--mode',
        'false',
      ]),
    ).toEqual({
      repeated: ['alpha', 'beta'],
      csv: ['a', 'b'],
      json: [1, 2],
      meta: { enabled: true },
      mode: false,
    });
  });

  it('对非数组字段的重复参数使用最后一个值', () => {
    const schema = {
      page: z.number(),
      force: z.boolean().optional(),
      name: z.string(),
    };

    expect(
      parseCommandInput(schema, ['--page', '1', '--page', '2', '--force', '--force', 'false', '--name', 'old', '--name', 'new']),
    ).toEqual({
      page: 2,
      force: false,
      name: 'new',
    });
  });

  it('拒绝 schema 外参数', () => {
    const schema = { name: z.string() };

    expect(() => parseCommandInput(schema, ['--name', 'demo', '--ignored', 'value'])).toThrow('未知参数: --ignored');
  });

  it('对位置参数和空参数名抛错', () => {
    expect(() => parseCommandInput({ name: z.string() }, ['demo'])).toThrow('无法识别的位置参数: demo');
    expect(() => parseCommandInput({ name: z.string() }, ['--'])).toThrow('检测到空参数名。');
  });

  it('对非法布尔值和数字抛错', () => {
    expect(() => parseCommandInput({ force: z.boolean() }, ['--force', 'maybe'])).toThrow('无法解析布尔值: maybe');
    expect(() => parseCommandInput({ page: z.number() }, ['--page', 'NaNish'])).toThrow('无法解析数字: NaNish');
    expect(() => parseCommandInput({ estimate: z.number() }, ['--estimate', 'Infinity'])).toThrow('无法解析数字: Infinity');
    expect(() => parseCommandInput({ estimate: z.number() }, ['--estimate', '-Infinity'])).toThrow('无法解析数字: -Infinity');
  });

  it('对非法 JSON 对象和数组参数抛清晰错误', () => {
    expect(() => parseCommandInput({ meta: z.object({ enabled: z.boolean() }) }, ['--meta', '{bad json}'])).toThrow('无法解析对象参数: {bad json}');
    expect(() => parseCommandInput({ items: z.array(z.number()) }, ['--items', '[1, bad]'])).toThrow('无法解析数组参数: [1, bad]');
  });
});
