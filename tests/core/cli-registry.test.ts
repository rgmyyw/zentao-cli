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

  it('忽略 schema 外参数', () => {
    const schema = { name: z.string() };

    expect(parseCommandInput(schema, ['--name', 'demo', '--ignored', 'value'])).toEqual({ name: 'demo' });
  });

  it('对位置参数和空参数名抛错', () => {
    expect(() => parseCommandInput({ name: z.string() }, ['demo'])).toThrow('无法识别的位置参数: demo');
    expect(() => parseCommandInput({ name: z.string() }, ['--'])).toThrow('检测到空参数名。');
  });

  it('对非法布尔值和数字抛错', () => {
    expect(() => parseCommandInput({ force: z.boolean() }, ['--force', 'maybe'])).toThrow('无法解析布尔值: maybe');
    expect(() => parseCommandInput({ page: z.number() }, ['--page', 'NaNish'])).toThrow('无法解析数字: NaNish');
  });
});
