import { ZentaoApi } from '../api/index.js';
import { loadConfig } from './config.js';

let api: ZentaoApi | null = null;

export function setApi(nextApi: ZentaoApi): void {
  api = nextApi;
}

export function getApi(): ZentaoApi {
  if (api) return api;

  const config = loadConfig();
  if (!config) {
    throw new Error('未找到禅道配置，请先设置环境变量或调用 initZentao。');
  }

  api = new ZentaoApi(config);
  return api;
}
