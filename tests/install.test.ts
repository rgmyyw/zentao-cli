import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const commandCalls: Array<{ command: string; args: string[] }> = [];

function mockSpawn(stdoutByCommand = new Map<string, string>()) {
  vi.doMock('node:child_process', () => ({
    spawn: vi.fn((command: string, args: string[]) => {
      commandCalls.push({ command, args });
      const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      queueMicrotask(() => {
        const key = `${command} ${args.join(' ')}`;
        const stdout = stdoutByCommand.get(key);
        if (stdout) {
          child.stdout.emit('data', Buffer.from(stdout));
        }
        child.emit('close', 0);
      });

      return child;
    }),
  }));
}

function mockInstallDependencies() {
  vi.doMock('node:fs/promises', () => ({
    access: vi.fn(async () => undefined),
    mkdtemp: vi.fn(async () => '/tmp/zentao-cli-skill-abc'),
    rm: vi.fn(async () => undefined),
  }));
  vi.doMock('node:os', () => ({ default: { tmpdir: () => '/tmp' } }));
  vi.doMock('../src/api/index.js', () => ({
    ZentaoApi: class {
      getToken = vi.fn(async () => 'token');
    },
  }));
  vi.doMock('../src/core/config.js', () => ({
    loadConfig: vi.fn(() => ({ url: 'https://zentao.example.com', username: 'me', password: 'secret', apiVersion: 'v1' })),
    maskConfig: vi.fn((config: { password?: string }) => ({ ...config, password: config.password ? '******' : config.password })),
    normalizeConfig: vi.fn((config: unknown) => config),
    saveConfig: vi.fn(),
  }));
}

describe('install command', () => {
  afterEach(() => {
    commandCalls.length = 0;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('installs the bundled skill by default', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');
    const expectedSkillPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'zentao-cli');

    await runInstallCommand([]);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npx', args: ['-y', 'skills', 'add', '-g', expectedSkillPath] },
    ]);
  });

  it('installs the skill from the GitHub source explicitly', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source', 'git']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npx', args: ['-y', 'skills', 'add', '-g', 'cloudglab/zentao-cli'] },
    ]);
  });

  it('downloads the npm tarball and installs the skill from a local package path', async () => {
    mockSpawn(new Map([['npm pack @cloudglab/zentao-cli@latest --pack-destination /tmp/zentao-cli-skill-abc --silent', 'cloudglab-zentao-cli-0.1.5.tgz\n']]));
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source', 'npm']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['pack', '@cloudglab/zentao-cli@latest', '--pack-destination', '/tmp/zentao-cli-skill-abc', '--silent'] },
      { command: 'tar', args: ['-xzf', '/tmp/zentao-cli-skill-abc/cloudglab-zentao-cli-0.1.5.tgz', '-C', '/tmp/zentao-cli-skill-abc'] },
      { command: 'npx', args: ['-y', 'skills', 'add', '-g', '/tmp/zentao-cli-skill-abc/package'] },
    ]);
  });
});
