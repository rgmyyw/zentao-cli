import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ZentaoConfig } from '../../src/types/common.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadConfigModule(options: { exists?: boolean; file?: string } = {}) {
  const store = { written: undefined as undefined | { file: string; content: string; options: unknown }, mkdir: undefined as undefined | { dir: string; options: unknown } };

  vi.doMock('node:os', () => ({ homedir: () => '/tmp/home' }));
  vi.doMock('node:fs', () => ({
    existsSync: vi.fn((file: string) => file.endsWith('config.json') ? Boolean(options.exists) : false),
    mkdirSync: vi.fn((dir: string, mkdirOptions: unknown) => { store.mkdir = { dir, options: mkdirOptions }; }),
    readFileSync: vi.fn(() => options.file ?? '{}'),
    writeFileSync: vi.fn((file: string, content: string, writeOptions: unknown) => { store.written = { file, content, options: writeOptions }; }),
  }));

  const mod = await import('../../src/core/config.js');
  return { ...mod, store };
}

describe('config helpers', () => {
  it('normalizes and masks config values', async () => {
    const { normalizeConfig, maskConfig } = await loadConfigModule();

    const config = normalizeConfig({
      url: ' https://zentao.example.com/zentao/ ',
      username: ' me ',
      password: 'secret',
      apiBaseUrl: ' https://api.example.com/v1/ ',
      legacyBaseUrl: ' https://api.example.com/legacy/ ',
    });

    expect(config).toEqual({
      url: 'https://zentao.example.com',
      username: 'me',
      password: 'secret',
      apiVersion: 'v1',
      apiBaseUrl: 'https://api.example.com/v1',
      legacyBaseUrl: 'https://api.example.com/legacy',
    });
    expect(maskConfig(config)).toEqual({ ...config, password: '******' });
    expect(maskConfig({ ...config, password: '' })).toMatchObject({ password: '' });
  });

  it('extracts the zentao root URL from IP, host and full URL inputs', async () => {
    const { normalizeConfig } = await loadConfigModule();

    const base = { username: 'me', password: 'secret' };
    expect(normalizeConfig({ ...base, url: '192.168.1.10:8080/zentao/' }).url).toBe('https://192.168.1.10:8080');
    expect(normalizeConfig({ ...base, url: 'zentao.example.com:8443/foo/bar' }).url).toBe('https://zentao.example.com:8443');
    expect(normalizeConfig({ ...base, url: 'http://zentao.example.com:8080/zentao/api.php/v1?x=1#top' }).url).toBe('http://zentao.example.com:8080');
  });

  it('maps deprecated legacy API version to v1', async () => {
    const { normalizeConfig } = await loadConfigModule();

    expect(normalizeConfig({ url: 'https://zentao.example.com', username: 'me', password: 'secret', apiVersion: 'legacy' }).apiVersion).toBe('v1');
  });

  it('validates required config fields', async () => {
    const { normalizeConfig } = await loadConfigModule();

    expect(() => normalizeConfig({})).toThrow('url');
    expect(() => normalizeConfig({ url: 'https://z' })).toThrow('username');
    expect(() => normalizeConfig({ url: 'https://z', username: 'me' })).toThrow('password');
    expect(() => normalizeConfig({ url: '   ', username: 'me', password: 'secret' })).toThrow('url');
    expect(() => normalizeConfig({ url: 'https://z', username: '   ', password: 'secret' })).toThrow('username');
  });

  it('loads environment config before config file', async () => {
    process.env.ZENTAO_URL = 'https://env.example.com/zentao';
    process.env.ZENTAO_ACCOUNT = 'account';
    process.env.ZENTAO_PASSWORD = 'pw';
    process.env.ZENTAO_API_VERSION = 'v2';
    process.env.ZENTAO_API_BASE_URL = 'https://env.example.com/api/';
    process.env.ZENTAO_LEGACY_BASE_URL = 'https://env.example.com/legacy/';
    const { loadConfig } = await loadConfigModule({ exists: true, file: JSON.stringify({ url: 'https://file', username: 'file', password: 'file' }) });

    expect(loadConfig()).toEqual({
      url: 'https://env.example.com',
      username: 'account',
      password: 'pw',
      apiVersion: 'v2',
      apiBaseUrl: 'https://env.example.com/api',
      legacyBaseUrl: 'https://env.example.com/legacy',
    });
  });

  it('prefers complete environment config even if the config file is malformed', async () => {
    process.env.ZENTAO_URL = 'https://env.example.com/zentao';
    process.env.ZENTAO_USERNAME = 'account';
    process.env.ZENTAO_PASSWORD = 'pw';
    const { loadConfig } = await loadConfigModule({ exists: true, file: '{invalid json' });

    expect(loadConfig()).toEqual({
      url: 'https://env.example.com',
      username: 'account',
      password: 'pw',
      apiVersion: 'v1',
      apiBaseUrl: undefined,
      legacyBaseUrl: undefined,
    });
  });

  it('allows partial environment overrides on top of file config', async () => {
    process.env.ZENTAO_API_BASE_URL = 'https://env.example.com/api/';
    process.env.ZENTAO_LEGACY_BASE_URL = 'https://env.example.com/legacy/';
    const { loadConfig } = await loadConfigModule({
      exists: true,
      file: JSON.stringify({
        url: 'https://file.example.com/zentao',
        username: 'file-user',
        password: 'file-password',
        apiVersion: 'v1',
      }),
    });

    expect(loadConfig()).toEqual({
      url: 'https://file.example.com',
      username: 'file-user',
      password: 'file-password',
      apiVersion: 'v1',
      apiBaseUrl: 'https://env.example.com/api',
      legacyBaseUrl: 'https://env.example.com/legacy',
    });
  });

  it('ignores whitespace-only environment overrides', async () => {
    process.env.ZENTAO_URL = '   ';
    process.env.ZENTAO_USERNAME = '   ';
    process.env.ZENTAO_PASSWORD = '   ';
    process.env.ZENTAO_API_VERSION = '   ';
    process.env.ZENTAO_API_BASE_URL = '   ';
    process.env.ZENTAO_LEGACY_BASE_URL = '   ';
    const { loadConfig } = await loadConfigModule({
      exists: true,
      file: JSON.stringify({
        url: 'https://file.example.com/zentao',
        username: 'file-user',
        password: 'file-password',
        apiVersion: 'v2',
        apiBaseUrl: 'https://file.example.com/api',
        legacyBaseUrl: 'https://file.example.com/legacy',
      }),
    });

    expect(loadConfig()).toEqual({
      url: 'https://file.example.com',
      username: 'file-user',
      password: 'file-password',
      apiVersion: 'v2',
      apiBaseUrl: 'https://file.example.com/api',
      legacyBaseUrl: 'https://file.example.com/legacy',
    });
  });

  it('loads and saves file config', async () => {
    const fileConfig: ZentaoConfig = { url: 'https://file.example.com/zentao', username: 'u', password: 'p', apiVersion: 'v1' };
    const { loadConfig, saveConfig, store } = await loadConfigModule({ exists: true, file: JSON.stringify(fileConfig) });

    expect(loadConfig()).toMatchObject({ url: 'https://file.example.com', username: 'u' });
    saveConfig(fileConfig);

    expect(store.mkdir).toMatchObject({ dir: '/tmp/home/.zentao', options: { recursive: true, mode: 0o700 } });
    expect(store.written?.file).toBe('/tmp/home/.zentao/config.json');
    expect(store.written?.content).toContain('"username": "u"');
    expect(store.written?.options).toEqual({ mode: 0o600 });
  });

  it('keeps file apiVersion when no environment overrides are provided', async () => {
    const { loadConfig } = await loadConfigModule({
      exists: true,
      file: JSON.stringify({
        url: 'https://file.example.com/zentao',
        username: 'u',
        password: 'p',
        apiVersion: 'v2',
      }),
    });

    expect(loadConfig()).toEqual({
      url: 'https://file.example.com',
      username: 'u',
      password: 'p',
      apiVersion: 'v2',
      apiBaseUrl: undefined,
      legacyBaseUrl: undefined,
    });
  });

  it('reports malformed config files with a clear message', async () => {
    const { loadConfig } = await loadConfigModule({ exists: true, file: '{invalid json' });

    expect(() => loadConfig()).toThrow('禅道配置文件损坏，请检查 /tmp/home/.zentao/config.json');
  });

  it('rejects non-object config file content with a clear message', async () => {
    const { loadConfig } = await loadConfigModule({ exists: true, file: '[]' });

    expect(() => loadConfig()).toThrow('禅道配置文件损坏，请检查 /tmp/home/.zentao/config.json：配置内容必须是 JSON 对象');
  });

  it('returns null when no config source exists', async () => {
    const { loadConfig } = await loadConfigModule({ exists: false });

    expect(loadConfig()).toBeNull();
  });
});
