import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

function mockSpawn(stdout = '') {
  vi.doMock('node:child_process', () => ({
    spawn: vi.fn(() => {
      const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      queueMicrotask(() => {
        if (stdout) child.stdout.emit('data', Buffer.from(stdout));
        child.emit('close', 0);
      });

      return child;
    }),
  }));
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('runDailyUpdateProbe', () => {
  it('prompts for manual update instead of auto-installing', async () => {
    process.env.NODE_ENV = 'development';

    mockSpawn('0.1.20\n');
    vi.doMock('node:os', () => ({ homedir: () => '/tmp/home' }));
    vi.doMock('node:fs/promises', () => ({
      mkdir: vi.fn(async () => undefined),
      readFile: vi.fn(async () => {
        throw new Error('missing');
      }),
      writeFile: vi.fn(async () => undefined),
    }));

    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { runDailyUpdateProbe } = await import('../src/update-probe.js');

    await runDailyUpdateProbe('getMyTasks');

    expect(write).toHaveBeenCalledWith(expect.stringContaining('检测到 zentao CLI 新版本 0.1.20（当前 0.1.19）。'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao update --skip-config-check'));
    expect(write).not.toHaveBeenCalledWith(expect.stringContaining('开始自动更新'));
  });

  it('ignores non-object update check state files', async () => {
    process.env.NODE_ENV = 'development';

    mockSpawn('0.1.20\n');
    vi.doMock('node:os', () => ({ homedir: () => '/tmp/home' }));
    vi.doMock('node:fs/promises', () => ({
      mkdir: vi.fn(async () => undefined),
      readFile: vi.fn(async () => '[]'),
      writeFile: vi.fn(async () => undefined),
    }));

    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { runDailyUpdateProbe } = await import('../src/update-probe.js');

    await runDailyUpdateProbe('getMyTasks');

    expect(write).toHaveBeenCalledWith(expect.stringContaining('检测到 zentao CLI 新版本 0.1.20（当前 0.1.19）。'));
    expect(write).not.toHaveBeenCalledWith(expect.stringContaining('自动更新检查失败'));
  });
});
