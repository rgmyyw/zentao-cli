import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCliRegistry, parseCommandInput } from '../../src/core/cli-registry.js';

function parseJsonResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadInitTool(options: {
  loadConfigImpl?: () => unknown;
} = {}) {
  const loadConfig = vi.fn(options.loadConfigImpl ?? (() => null));
  const normalizeConfig = vi.fn((config: unknown) => config);
  const maskConfig = vi.fn((config: Record<string, unknown>) => ({ ...config, password: '******' }));
  const saveConfig = vi.fn();
  const setApi = vi.fn();
  const getToken = vi.fn(async () => 'token');
  const constructedConfigs: unknown[] = [];

  vi.doMock('../../src/core/config.js', () => ({
    loadConfig,
    normalizeConfig,
    maskConfig,
    saveConfig,
  }));
  vi.doMock('../../src/core/api-provider.js', () => ({ setApi }));
  vi.doMock('../../src/api/index.js', () => ({
    ZentaoApi: class {
      constructor(config: unknown) {
        constructedConfigs.push(config);
      }

      getToken = getToken;
    },
  }));

  const { registerInitTools } = await import('../../src/tools/init.js');
  return { registerInitTools, loadConfig, normalizeConfig, maskConfig, saveConfig, setApi, getToken, constructedConfigs };
}

describe('registerInitTools', () => {
  it('merges partial CLI overrides on top of existing config', async () => {
    const existingConfig = {
      url: 'https://zentao.example.com',
      username: 'me',
      password: 'secret',
      apiVersion: 'v1',
      apiBaseUrl: 'https://zentao.example.com/api/v1',
    };
    const { registerInitTools, loadConfig, normalizeConfig, setApi, constructedConfigs } = await loadInitTool({
      loadConfigImpl: () => existingConfig,
    });
    const registry = new InMemoryCliRegistry();

    registerInitTools(registry);
    const command = registry.getCommand('initZentao');
    const input = parseCommandInput(command!.schema, ['--apiVersion', ' v2 ']);
    const result = await command!.handler(input);

    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(normalizeConfig).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://zentao.example.com',
      username: 'me',
      password: 'secret',
      apiVersion: 'v2',
      apiBaseUrl: 'https://zentao.example.com/api/v1',
      save: false,
    }));
    expect(constructedConfigs[0]).toMatchObject({
      url: 'https://zentao.example.com',
      username: 'me',
      password: 'secret',
      apiVersion: 'v2',
      apiBaseUrl: 'https://zentao.example.com/api/v1',
    });
    expect(setApi).toHaveBeenCalledTimes(1);
    expect(parseJsonResult(result)).toMatchObject({ ok: true, saved: false });
  });

  it('ignores whitespace-only CLI overrides when merging with existing config', async () => {
    const existingConfig = {
      url: 'https://zentao.example.com',
      username: 'me',
      password: 'secret',
      apiVersion: 'v1',
      apiBaseUrl: 'https://zentao.example.com/api/v1',
    };
    const { registerInitTools, loadConfig, normalizeConfig, constructedConfigs } = await loadInitTool({
      loadConfigImpl: () => existingConfig,
    });
    const registry = new InMemoryCliRegistry();

    registerInitTools(registry);
    const command = registry.getCommand('initZentao');
    const input = parseCommandInput(command!.schema, ['--url', '   ', '--apiVersion', '   ']);
    const result = await command!.handler(input);

    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(normalizeConfig).not.toHaveBeenCalled();
    expect(constructedConfigs[0]).toMatchObject(existingConfig);
    expect(parseJsonResult(result)).toMatchObject({ ok: true, saved: false });
  });

  it('does not read saved config when full explicit credentials are provided', async () => {
    const loadError = new Error('禅道配置文件损坏');
    const { registerInitTools, loadConfig, normalizeConfig, constructedConfigs } = await loadInitTool({
      loadConfigImpl: () => {
        throw loadError;
      },
    });
    const registry = new InMemoryCliRegistry();

    registerInitTools(registry);
    const command = registry.getCommand('initZentao');
    const input = parseCommandInput(command!.schema, [
      '--url', ' https://host/zentao ',
      '--username', ' user ',
      '--password', ' secret ',
      '--apiVersion', ' v2 ',
    ]);
    await command!.handler(input);

    expect(loadConfig).not.toHaveBeenCalled();
    expect(normalizeConfig).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://host/zentao',
      username: 'user',
      password: ' secret ',
      apiVersion: 'v2',
      save: false,
    }));
    expect(constructedConfigs[0]).toMatchObject({
      url: 'https://host/zentao',
      username: 'user',
      password: ' secret ',
      apiVersion: 'v2',
    });
  });
});
