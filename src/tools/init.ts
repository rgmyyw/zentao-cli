import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { ZentaoApi } from '../api/index.js';
import { loadConfig, maskConfig, normalizeConfig, saveConfig } from '../core/config.js';
import { setApi } from '../core/api-provider.js';
import { jsonResult } from './shared.js';

export function registerInitTools(server: CliRegistry): void {
  server.tool(
    'initZentao',
    {
      url: z.string().optional().describe('禅道根域名，例如 https://zentao.cloudglab.cn，不要带 /zentao'),
      username: z.string().optional().describe('禅道账号'),
      password: z.string().optional().describe('禅道密码'),
      apiVersion: z.string().optional().default('v1').describe('API 版本，默认 v1'),
      apiBaseUrl: z.string().optional().describe('可选。完整 API 基础地址，例如 https://host/custom/api.php/v1；不传则默认拼接 /zentao/api.php/{apiVersion}'),
      save: z.boolean().optional().default(false).describe('是否写入 ~/.zentao/config.json。默认 false，仅当前会话生效'),
    },
    async (input) => {
      const config = input.url || input.username || input.password || input.apiBaseUrl
        ? normalizeConfig(input)
        : loadConfig();

      if (!config) throw new Error('未找到禅道配置。');

      if (input.save) saveConfig(config);

      const api = new ZentaoApi(config);
      await api.getToken();
      setApi(api);

      return jsonResult({ ok: true, saved: Boolean(input.save), config: maskConfig(config) });
    },
  );
}
