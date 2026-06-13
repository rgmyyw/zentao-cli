import { z } from 'zod';
import type { CliRegistry } from '../core/cli-registry.js';
import { ZentaoApi } from '../api/index.js';
import { loadConfig, maskConfig, normalizeConfig, saveConfig } from '../core/config.js';
import { setApi } from '../core/api-provider.js';
import { jsonResult, optionalTrimmedText } from './shared.js';

export function registerInitTools(server: CliRegistry): void {
  server.tool(
    'initZentao',
    {
      url: optionalTrimmedText.describe('禅道根域名，例如 https://zentao.cloudglab.cn，不要带 /zentao'),
      username: optionalTrimmedText.describe('禅道账号'),
      password: z.string().optional().describe('禅道密码'),
      apiVersion: optionalTrimmedText.describe('API 版本，默认 v1'),
      apiBaseUrl: optionalTrimmedText.describe('可选。完整 API 基础地址，例如 https://host/custom/api.php/v1；不传则默认拼接 /zentao/api.php/{apiVersion}'),
      legacyBaseUrl: optionalTrimmedText.describe('可选。旧版页面 JSON 基础地址，例如 https://host/custom；不传则默认拼接 /zentao'),
      save: z.boolean().optional().default(false).describe('是否写入 ~/.zentao/config.json。默认 false，仅当前会话生效'),
    },
    async (input) => {
      const hasExplicitInput = Boolean(
        input.url
        || input.username
        || input.password
        || input.apiVersion
        || input.apiBaseUrl
        || input.legacyBaseUrl,
      );

      const hasCompleteDirectInput = Boolean(input.url && input.username && input.password);
      const baseConfig = hasExplicitInput && !hasCompleteDirectInput
        ? loadConfig() ?? {}
        : {};

      const config = hasExplicitInput
        ? normalizeConfig({ ...baseConfig, ...input })
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
