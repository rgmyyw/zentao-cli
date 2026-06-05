import { describe, expect, it } from 'vitest';
import { asRecord, sanitizeJsonLikeResponse } from '../../src/utils/json.js';

describe('sanitizeJsonLikeResponse', () => {
  it('直接返回对象输入', () => {
    const payload = { ok: true };
    expect(sanitizeJsonLikeResponse(payload)).toBe(payload);
  });

  it('能从前缀文本中提取对象和数组 JSON', () => {
    expect(sanitizeJsonLikeResponse('notice: {"ok":true,"count":2}')).toEqual({ ok: true, count: 2 });
    expect(sanitizeJsonLikeResponse('debug => [1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('对不支持的类型和无 JSON 文本抛错', () => {
    expect(() => sanitizeJsonLikeResponse(123)).toThrow('响应格式不支持: number');
    expect(() => sanitizeJsonLikeResponse('plain text only')).toThrow('响应中未找到 JSON');
  });
});

describe('asRecord', () => {
  it('接受普通对象', () => {
    expect(asRecord({ name: 'demo' })).toEqual({ name: 'demo' });
  });

  it('拒绝数组等非对象记录', () => {
    expect(() => asRecord(['demo'])).toThrow('期望对象响应，实际为: object');
  });
});
