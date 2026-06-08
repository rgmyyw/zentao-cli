import { afterEach, describe, expect, it } from 'vitest';
import {
  assertWriteAllowed,
  getUnsupportedWriteDiagnostic,
  getWritePreview,
  isWriteEnabled,
  previewOrAssertWriteAllowed,
} from '../../src/core/write-guard.js';

const ORIGINAL_WRITE_ENV = process.env.ZENTAO_ENABLE_WRITE;
const ORIGINAL_DISABLE_WRITE_ENV = process.env.ZENTAO_DISABLE_WRITE;

function restoreWriteEnv(): void {
  if (ORIGINAL_WRITE_ENV === undefined) delete process.env.ZENTAO_ENABLE_WRITE;
  else process.env.ZENTAO_ENABLE_WRITE = ORIGINAL_WRITE_ENV;

  if (ORIGINAL_DISABLE_WRITE_ENV === undefined) delete process.env.ZENTAO_DISABLE_WRITE;
  else process.env.ZENTAO_DISABLE_WRITE = ORIGINAL_DISABLE_WRITE_ENV;
}

afterEach(() => {
  restoreWriteEnv();
});

describe('write-guard', () => {
  it('isWriteEnabled 默认开启，仅在显式禁用时关闭', () => {
    delete process.env.ZENTAO_ENABLE_WRITE;
    delete process.env.ZENTAO_DISABLE_WRITE;
    expect(isWriteEnabled()).toBe(true);

    process.env.ZENTAO_DISABLE_WRITE = 'false';
    expect(isWriteEnabled()).toBe(true);

    process.env.ZENTAO_DISABLE_WRITE = 'true';
    expect(isWriteEnabled()).toBe(false);
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

  it('assertWriteAllowed 按顺序校验不支持、显式禁用和确认', () => {
    delete process.env.ZENTAO_DISABLE_WRITE;
    expect(() => assertWriteAllowed({ action: 'updateExecution', confirm: true, payload: {} })).toThrow(
      '写操作 updateExecution 当前不支持真实执行',
    );

    process.env.ZENTAO_DISABLE_WRITE = 'true';
    expect(() => assertWriteAllowed({ action: 'updateTask', confirm: true, payload: {} })).toThrow(
      '写操作已禁用。若要执行 updateTask，需要移除 ZENTAO_DISABLE_WRITE=true。',
    );

    delete process.env.ZENTAO_DISABLE_WRITE;
    expect(() => assertWriteAllowed({ action: 'updateTask', payload: {} })).toThrow(
      '写操作缺少确认。若要执行 updateTask，需要传入 confirm: true。',
    );
  });

  it('assertWriteAllowed 在允许时不抛错', () => {
    delete process.env.ZENTAO_DISABLE_WRITE;
    expect(() => assertWriteAllowed({ action: 'updateTask', confirm: true, payload: { id: 3 } })).not.toThrow();
  });

  it('previewOrAssertWriteAllowed 返回不支持、预览或 null', () => {
    delete process.env.ZENTAO_DISABLE_WRITE;
    expect(previewOrAssertWriteAllowed({ action: 'updateExecution', confirm: true, payload: { id: 1 } })).toEqual({
      ok: false,
      supported: false,
      error: '写操作 updateExecution 当前不能真实执行',
      action: 'updateExecution',
      diagnostic: expect.stringContaining('字段拼接缺逗号问题'),
      payload: { id: 1 },
    });

    process.env.ZENTAO_DISABLE_WRITE = 'true';
    expect(previewOrAssertWriteAllowed({ action: 'updateTask', confirm: true, payload: { id: 2 } })).toEqual({
      ok: false,
      preview: true,
      reason: '写操作已禁用。若要执行 updateTask，需要移除 ZENTAO_DISABLE_WRITE=true。',
      action: 'updateTask',
      payload: { id: 2 },
    });

    delete process.env.ZENTAO_DISABLE_WRITE;
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
