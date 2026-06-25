import { EventEmitter } from 'node:events';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const commandCalls: Array<{ command: string; args: string[] }> = [];
const rmCalls: string[] = [];

function mockSpawn(
  stdoutByCommand = new Map<string, string>(),
  failOnceByCommand = new Map<string, string>(),
) {
  const failedOnce = new Set<string>();
  vi.doMock('node:child_process', () => ({
    spawn: vi.fn((command: string, args: string[]) => {
      commandCalls.push({ command, args });
      const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();

      queueMicrotask(() => {
        const key = `${command} ${args.join(' ')}`;
        const failMessage = failOnceByCommand.get(key);
        if (failMessage && !failedOnce.has(key)) {
          failedOnce.add(key);
          child.stderr.emit('data', Buffer.from(failMessage));
          child.emit('close', 1);
          return;
        }
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

function mockInstallDependencies(options: { npxCacheEntries?: string[]; cloudglabEntries?: string[] } = {}) {
  const npxCacheEntries = options.npxCacheEntries ?? [];
  vi.doMock('node:fs/promises', () => ({
    access: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    mkdtemp: vi.fn(async () => '/tmp/zentao-cli-skill-abc'),
    readFile: vi.fn(async () => { throw new Error('missing'); }),
    readdir: vi.fn(async (target: string) => {
      if (target === path.join('/home/me', '.npm', '_npx')) {
        return npxCacheEntries;
      }
      const hash = npxCacheEntries[0];
      if (hash && target === path.join('/home/me', '.npm', '_npx', hash, 'node_modules', '@cloudglab')) {
        return options.cloudglabEntries ?? [];
      }
      return [];
    }),
    rm: vi.fn(async (target: string) => {
      rmCalls.push(target);
    }),
    writeFile: vi.fn(async () => undefined),
  }));
  vi.doMock('node:os', () => ({ default: { homedir: () => '/home/me', tmpdir: () => '/tmp' }, homedir: () => '/home/me', tmpdir: () => '/tmp' }));
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
    rmCalls.length = 0;
    delete process.env.ZENTAO_API_VERSION;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('installs the globally installed package skill by default', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');
    const expectedSkillPath = path.join('/usr/local/lib/node_modules', '@cloudglab/zentao-cli', 'skills', 'zentao-cli');

    await runInstallCommand([]);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npx', args: ['-y', 'skills', 'add', expectedSkillPath, '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('updates the CLI and skill from the globally installed package', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const { runUpdateCommand } = await import('../src/install.js');

    await runUpdateCommand(['--skip-config-check']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npx', args: ['-y', 'skills', 'add', path.join('/usr/local/lib/node_modules', '@cloudglab/zentao-cli', 'skills', 'zentao-cli'), '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('updates only the CLI when requested', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runUpdateCommand } = await import('../src/install.js');

    await runUpdateCommand(['--cli-only', '--skip-config-check']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
    ]);
  });

  it('updates only the skill when requested', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const { runUpdateCommand } = await import('../src/install.js');

    await runUpdateCommand(['--skill-only', '--skip-config-check']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npx', args: ['-y', 'skills', 'add', path.join('/usr/local/lib/node_modules', '@cloudglab/zentao-cli', 'skills', 'zentao-cli'), '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('supports equals syntax for install and update options', async () => {
    mockSpawn(new Map([
      ['npm pack @cloudglab/zentao-cli@latest --pack-destination /tmp/zentao-cli-skill-abc --silent', 'cloudglab-zentao-cli-0.1.5.tgz\n'],
    ]));
    mockInstallDependencies();
    const { runInstallCommand, runUpdateCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source=npm', '--skip-config-check=true']);
    await runUpdateCommand(['--skill-local-path=./local-skill', '--skill-only=true', '--skip-config-check=false']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['pack', '@cloudglab/zentao-cli@latest', '--pack-destination', '/tmp/zentao-cli-skill-abc', '--silent'] },
      { command: 'tar', args: ['-xzf', '/tmp/zentao-cli-skill-abc/cloudglab-zentao-cli-0.1.5.tgz', '-C', '/tmp/zentao-cli-skill-abc'] },
      { command: 'npx', args: ['-y', 'skills', 'add', '/tmp/zentao-cli-skill-abc/package', '--global', '--agent', 'universal', '--yes'] },
      { command: 'npx', args: ['-y', 'skills', 'add', path.resolve('./local-skill'), '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('supports space syntax for boolean install and update options', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand, runUpdateCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source', 'git', '--cli-only', 'false', '--skip-config-check', 'true']);
    await runUpdateCommand(['--skill-source', 'git', '--skill-only', 'false', '--skip-config-check', 'true']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npx', args: ['-y', 'skills', 'add', 'cloudglab/zentao-cli', '--global', '--agent', 'universal', '--yes'] },
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npx', args: ['-y', 'skills', 'add', 'cloudglab/zentao-cli', '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('rejects invalid boolean values in equals syntax', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await expect(runInstallCommand(['--skip-config-check=maybe'])).rejects.toThrow('--skip-config-check 只支持 true 或 false');
  });

  it('rejects invalid boolean values in space syntax', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await expect(runInstallCommand(['--cli-only', 'maybe'])).rejects.toThrow('--cli-only 只支持 true 或 false');
  });

  it('rejects missing values for string install options without swallowing following flags', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await expect(runInstallCommand(['--skill-local-path', '--skip-config-check'])).rejects.toThrow('--skill-local-path 需要传入本地目录路径');
    await expect(runInstallCommand(['--skill-source', '--skip-config-check'])).rejects.toThrow('--skill-source 需要传入参数值');
    await expect(runInstallCommand(['--skill-local-path='])).rejects.toThrow('--skill-local-path 需要传入本地目录路径');
  });

  it('installs the skill from the GitHub source explicitly', async () => {
    mockSpawn();
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source', 'git']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npx', args: ['-y', 'skills', 'add', 'cloudglab/zentao-cli', '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('downloads the npm tarball and installs the skill from a local package path', async () => {
    mockSpawn(new Map([['npm pack @cloudglab/zentao-cli@latest --pack-destination /tmp/zentao-cli-skill-abc --silent', 'cloudglab-zentao-cli-0.1.5.tgz\n']]));
    mockInstallDependencies();
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand(['--skill-source', 'npm']);

    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['pack', '@cloudglab/zentao-cli@latest', '--pack-destination', '/tmp/zentao-cli-skill-abc', '--silent'] },
      { command: 'tar', args: ['-xzf', '/tmp/zentao-cli-skill-abc/cloudglab-zentao-cli-0.1.5.tgz', '-C', '/tmp/zentao-cli-skill-abc'] },
      { command: 'npx', args: ['-y', 'skills', 'add', '/tmp/zentao-cli-skill-abc/package', '--global', '--agent', 'universal', '--yes'] },
    ]);
  });

  it('warns that environment variables still take precedence when only api version is set', async () => {
    process.env.ZENTAO_API_VERSION = 'v2';
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand([]);

    expect(write).toHaveBeenCalledWith(expect.stringContaining('当前 shell 存在 ZENTAO_* 环境变量'));
  });

  it('previews uninstall unless confirm is true', async () => {
    mockSpawn();
    mockInstallDependencies();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { runUninstallCommand } = await import('../src/install.js');

    await runUninstallCommand([]);

    expect(commandCalls).toEqual([]);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('npx -y @cloudglab/zentao-cli@latest uninstall --confirm true'));
  });

  it('uninstalls skill, package, residues, and config when confirmed', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const { runUninstallCommand } = await import('../src/install.js');

    await runUninstallCommand(['--confirm', 'true']);

    expect(commandCalls).toEqual([
      { command: 'npx', args: ['-y', 'skills', 'remove', 'zentao-cli', '--yes'] },
      { command: 'npx', args: ['-y', 'skills', 'remove', 'zentao-cli', '--yes', '--global'] },
      { command: 'npm', args: ['uninstall', '-g', '@cloudglab/zentao-cli'] },
      { command: 'npm', args: ['root', '-g'] },
    ]);
    expect(rmCalls).toContain('/home/me/.zentao/config.json');
  });

  it('keeps config for partial uninstall modes', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const { runUninstallCommand } = await import('../src/install.js');

    await runUninstallCommand(['--confirm=true', '--skill-only=true']);

    expect(commandCalls).toEqual([
      { command: 'npx', args: ['-y', 'skills', 'remove', 'zentao-cli', '--yes'] },
      { command: 'npx', args: ['-y', 'skills', 'remove', 'zentao-cli', '--yes', '--global'] },
    ]);
    expect(rmCalls).not.toContain('/home/me/.zentao/config.json');
  });

  it('does not warn for whitespace-only environment variables', async () => {
    process.env.ZENTAO_API_VERSION = '   ';
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies();
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand([]);

    expect(write).not.toHaveBeenCalledWith(expect.stringContaining('当前 shell 存在 ZENTAO_* 环境变量'));
  });

  it('retries npx skill add when npx cache ENOTEMPTY error occurs', async () => {
    const expectedSkillPath = path.join('/usr/local/lib/node_modules', '@cloudglab/zentao-cli', 'skills', 'zentao-cli');
    mockSpawn(
      new Map([['npm root -g', '/usr/local/lib/node_modules\n']]),
      new Map([[`npx -y skills add ${expectedSkillPath} --global --agent universal --yes`, 'npm error code ENOTEMPTY\n']]),
    );
    mockInstallDependencies({ npxCacheEntries: ['83f3ca18e531c9ec'], cloudglabEntries: ['zentao-cli', '.zentao-cli-TQ1BDOEL'] });
    const { runUpdateCommand } = await import('../src/install.js');

    await runUpdateCommand(['--skip-config-check']);

    expect(commandCalls.filter((c) => c.command === 'npx')).toHaveLength(2);
    expect(commandCalls).toEqual([
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npm', args: ['install', '-g', '@cloudglab/zentao-cli@latest'] },
      { command: 'npm', args: ['root', '-g'] },
      { command: 'npx', args: ['-y', 'skills', 'add', expectedSkillPath, '--global', '--agent', 'universal', '--yes'] },
      { command: 'npx', args: ['-y', 'skills', 'add', expectedSkillPath, '--global', '--agent', 'universal', '--yes'] },
    ]);
    expect(rmCalls).toContain(path.join('/home/me', '.npm', '_npx', '83f3ca18e531c9ec'));
  });

  it('cleans npx cache residues before installing skill', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    mockInstallDependencies({ npxCacheEntries: ['83f3ca18e531c9ec'], cloudglabEntries: ['zentao-cli'] });
    const { runInstallCommand } = await import('../src/install.js');

    await runInstallCommand(['--skip-config-check']);

    expect(rmCalls).toContain(path.join('/home/me', '.npm', '_npx', '83f3ca18e531c9ec'));
  });

  it('surfaces malformed config errors in non-interactive environments', async () => {
    mockSpawn(new Map([['npm root -g', '/usr/local/lib/node_modules\n']]));
    vi.doMock('node:fs/promises', () => ({
      access: vi.fn(async () => undefined),
      mkdir: vi.fn(async () => undefined),
      mkdtemp: vi.fn(async () => '/tmp/zentao-cli-skill-abc'),
      readFile: vi.fn(async () => { throw new Error('missing'); }),
      readdir: vi.fn(async () => []),
      rm: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
    }));
    vi.doMock('node:os', () => ({ default: { homedir: () => '/home/me', tmpdir: () => '/tmp' }, homedir: () => '/home/me', tmpdir: () => '/tmp' }));
    vi.doMock('../src/api/index.js', () => ({
      ZentaoApi: class {
        getToken = vi.fn(async () => 'token');
      },
    }));
    vi.doMock('../src/core/config.js', () => ({
      loadConfig: vi.fn(() => {
        throw new Error('禅道配置文件损坏，请检查 /tmp/home/.zentao/config.json：配置内容必须是 JSON 对象');
      }),
      maskConfig: vi.fn((config: { password?: string }) => ({ ...config, password: config.password ? '******' : config.password })),
      normalizeConfig: vi.fn((config: unknown) => config),
      saveConfig: vi.fn(),
    }));
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { runInstallCommand } = await import('../src/install.js');

    await expect(runInstallCommand([])).rejects.toThrow(/禅道配置文件损坏.*当前不是交互式终端/s);
    expect(write).not.toHaveBeenCalledWith(expect.stringContaining('检测到禅道配置文件异常'));
  });
});
