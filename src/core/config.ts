import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { ZentaoConfig } from '../types/common.js';

const CONFIG_DIR = path.join(homedir(), '.zentao');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function normalizeServerUrl(url: string): string {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch {
    const fallback = trimmed.replace(/\/+$/, '');
    const zentaoIndex = fallback.indexOf('/zentao');
    if (zentaoIndex >= 0) return fallback.slice(0, zentaoIndex);
    const pathIndex = fallback.indexOf('/', fallback.indexOf('://') >= 0 ? fallback.indexOf('://') + 3 : 0);
    return pathIndex >= 0 ? fallback.slice(0, pathIndex) : fallback;
  }
}

function normalizeApiBaseUrl(apiBaseUrl?: string): string | undefined {
  if (!apiBaseUrl) return undefined;
  return apiBaseUrl.trim().replace(/\/+$/, '');
}

function normalizeLegacyBaseUrl(legacyBaseUrl?: string): string | undefined {
  if (!legacyBaseUrl) return undefined;
  return legacyBaseUrl.trim().replace(/\/+$/, '');
}

function normalizeApiVersion(apiVersion?: string): string {
  const normalized = apiVersion?.trim();
  if (!normalized || normalized === 'legacy') return 'v1';
  return normalized;
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
    apiVersion: normalizeApiVersion(config.apiVersion),
    apiBaseUrl: normalizeApiBaseUrl(config.apiBaseUrl),
    legacyBaseUrl: normalizeLegacyBaseUrl(config.legacyBaseUrl),
  };
}

export function loadConfig(): ZentaoConfig | null {
  const envConfig: Partial<ZentaoConfig> = {
    url: process.env.ZENTAO_URL,
    username: process.env.ZENTAO_USERNAME || process.env.ZENTAO_ACCOUNT,
    password: process.env.ZENTAO_PASSWORD,
    apiVersion: normalizeApiVersion(process.env.ZENTAO_API_VERSION),
    apiBaseUrl: process.env.ZENTAO_API_BASE_URL,
    legacyBaseUrl: process.env.ZENTAO_LEGACY_BASE_URL,
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
