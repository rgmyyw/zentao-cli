import { afterEach, describe, expect, it } from 'vitest';
import {
  assertWriteAllowed,
  getUnsupportedWriteDiagnostic,
  getWritePreview,
  isWriteEnabled,
  previewOrAssertWriteAllowed,
} from '../../src/core/write-guard.js';

const ORIGINAL_WRITE_ENV = process.env.ZENTAO_ENABLE_WRITE;

function restoreWriteEnv(): void {
  if (ORIGINAL_WRITE_ENV === undefined) delete process.env.ZENTAO_ENABLE_WRITE;
  else process.env.ZENTAO_ENABLE_WRITE = ORIGINAL_WRITE_ENV;
}

afterEach(() => {
  restoreWriteEnv();
});

describe('write-guard', () => {
  it('isWriteEnabled 仅在环境变量为 true 时开启', () => {
    delete process.env.ZENTAO_ENABLE_WRITE;
    expect(isWriteEnabled()).toBe(false);

    process.env.ZENTAO_ENABLE_WRITE = 'false';
    expect(isWriteEnabled()).toBe(false);

    process.env.ZENTAO_ENABLE_WRITE = 'true';
    expect(isWriteEnabled()).toBe(true);
  });

  it('getWritePreview 返回预览信息', () => {
    expect(getWritePreview({ action: 'updateTask', payload: { id: 1 } }, 'disabled')).toEqual({
      ok: false,
      preview: true,
      reason: 'disabled',
      action: 'updateTask',
      payload: { id: 1 },
    });
  });

  it('getUnsupportedWriteDiagnostic 返回不支持诊断', () => {
    expect(getUnsupportedWriteDiagnostic({ action: 'updateExecution', payload: { id: 2 } }, 'not supported')).toEqual({
      ok: false,
      supported: false,
      error: '写操作 updateExecution 当前不能真实执行',
      action: 'updateExecution',
      diagnostic: 'not supported',
      payload: { id: 2 },
    });
  });

  it('assertWriteAllowed 按顺序校验不支持、开关和确认', () => {
    process.env.ZENTAO_ENABLE_WRITE = 'true';
    expect(() => assertWriteAllowed({ action: 'updateExecution', confirm: true, payload: {} })).toThrow(
      '写操作 updateExecution 当前不支持真实执行',
    );

    delete process.env.ZENTAO_ENABLE_WRITE;
    expect(() => assertWriteAllowed({ action: 'updateTask', confirm: true, payload: {} })).toThrow(
      '写操作已禁用。若要执行 updateTask，需要设置 ZENTAO_ENABLE_WRITE=true。',
    );

    process.env.ZENTAO_ENABLE_WRITE = 'true';
    expect(() => assertWriteAllowed({ action: 'updateTask', payload: {} })).toThrow(
      '写操作缺少确认。若要执行 updateTask，需要传入 confirm: true。',
    );
  });

  it('assertWriteAllowed 在允许时不抛错', () => {
    process.env.ZENTAO_ENABLE_WRITE = 'true';
    expect(() => assertWriteAllowed({ action: 'updateTask', confirm: true, payload: { id: 3 } })).not.toThrow();
  });

  it('previewOrAssertWriteAllowed 返回不支持、预览或 null', () => {
    delete process.env.ZENTAO_ENABLE_WRITE;
    expect(previewOrAssertWriteAllowed({ action: 'updateExecution', confirm: true, payload: { id: 1 } })).toEqual({
      ok: false,
      supported: false,
      error: '写操作 updateExecution 当前不能真实执行',
      action: 'updateExecution',
      diagnostic: expect.stringContaining('字段拼接缺逗号问题'),
      payload: { id: 1 },
    });

    expect(previewOrAssertWriteAllowed({ action: 'updateTask', confirm: true, payload: { id: 2 } })).toEqual({
      ok: false,
      preview: true,
      reason: '写操作已禁用。若要执行 updateTask，需要设置 ZENTAO_ENABLE_WRITE=true。',
      action: 'updateTask',
      payload: { id: 2 },
    });

    process.env.ZENTAO_ENABLE_WRITE = 'true';
    expect(previewOrAssertWriteAllowed({ action: 'updateTask', payload: { id: 3 } })).toEqual({
      ok: false,
      preview: true,
      reason: '写操作缺少确认。若要执行 updateTask，需要传入 confirm: true。',
      action: 'updateTask',
      payload: { id: 3 },
    });

    expect(previewOrAssertWriteAllowed({ action: 'updateTask', confirm: true, payload: { id: 4 } })).toBeNull();
  });
});
