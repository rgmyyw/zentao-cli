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
});
