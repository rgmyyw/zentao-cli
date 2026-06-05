import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ZentaoConfig } from '../types/common.js';

const CONFIG_DIR = path.join(homedir(), '.zentao');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/zentao') ? trimmed.slice(0, -'/zentao'.length) : trimmed;
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string | undefined {
  if (!apiBaseUrl) return undefined;
  return apiBaseUrl.trim().replace(/\/+$/, '');
}

export function maskConfig(config: ZentaoConfig): Omit<ZentaoConfig, 'password'> & { password: string } {
  return {
    ...config,
    password: config.password ? '******' : '',
  };
}

export function normalizeConfig(config: Partial<ZentaoConfig>): ZentaoConfig {
  if (!config.url) throw new Error('缺少禅道地址 url');
  if (!config.username) throw new Error('缺少禅道用户名 username');
  if (!config.password) throw new Error('缺少禅道密码 password');

  return {
    url: normalizeServerUrl(config.url),
    username: config.username,
    password: config.password,
    apiVersion: config.apiVersion || 'v1',
    apiBaseUrl: normalizeApiBaseUrl(config.apiBaseUrl),
  };
}

export function loadConfig(): ZentaoConfig | null {
  const envConfig: Partial<ZentaoConfig> = {
    url: process.env.ZENTAO_URL,
    username: process.env.ZENTAO_USERNAME || process.env.ZENTAO_ACCOUNT,
    password: process.env.ZENTAO_PASSWORD,
    apiVersion: process.env.ZENTAO_API_VERSION || 'v1',
    apiBaseUrl: process.env.ZENTAO_API_BASE_URL,
  };

  if (envConfig.url && envConfig.username && envConfig.password) {
    return normalizeConfig(envConfig);
  }

  if (!existsSync(CONFIG_FILE)) return null;

  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as Partial<ZentaoConfig>;
  return normalizeConfig(raw);
}

export function saveConfig(config: ZentaoConfig): void {
  const normalized = normalizeConfig(config);
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
}
