import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import { setApi } from '../src/core/api-provider.js';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps "who am i" to the current user profile command', async () => {
    const getMyProfile = vi.fn(async () => ({ account: 'me' }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ user: { getMyProfile } } as never);

    await runCli(['who', 'am', 'i']);

    expect(getMyProfile).toHaveBeenCalledWith();
    expect(write).toHaveBeenCalledWith(`${JSON.stringify({ account: 'me' }, null, 2)}\n`);
  });

  it('prints command help without validating command args', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['getExecutionDetail', '--help']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number>'));
  });

  it('prints command help through the help command', async () => {
    const getExecutionDetail = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ execution: { getExecutionDetail } } as never);

    await runCli(['help', 'getExecutionDetail']);

    expect(getExecutionDetail).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('zentao help getExecutionDetail'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--executionId <number> （必填）'));
  });

  it('prints enum values in command help', async () => {
    const getDevelopmentContext = vi.fn();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    setApi({ developmentContext: { getDevelopmentContext } } as never);

    await runCli(['getDevelopmentContext', '--help']);

    expect(getDevelopmentContext).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--entityType <story|bug>'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--entityId <number>'));
  });
});
