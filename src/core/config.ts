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
  const normalized = apiBaseUrl.trim().replace(/\/+$/, '');
  return normalized || undefined;
}

function normalizeLegacyBaseUrl(legacyBaseUrl?: string): string | undefined {
  if (!legacyBaseUrl) return undefined;
  const normalized = legacyBaseUrl.trim().replace(/\/+$/, '');
  return normalized || undefined;
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
  const url = requireNonBlank(config.url, '缺少禅道地址 url');
  const username = requireNonBlank(config.username, '缺少禅道用户名 username');
  if (!config.password?.trim()) throw new Error('缺少禅道密码 password');

  return {
    url: normalizeServerUrl(url),
    username,
    password: config.password,
    apiVersion: normalizeApiVersion(config.apiVersion),
    apiBaseUrl: normalizeApiBaseUrl(config.apiBaseUrl),
    legacyBaseUrl: normalizeLegacyBaseUrl(config.legacyBaseUrl),
  };
}

export function loadConfig(): ZentaoConfig | null {
  const envConfig: Partial<ZentaoConfig> = {
    url: normalizeOptionalEnvValue(process.env.ZENTAO_URL),
    username: normalizeOptionalEnvValue(process.env.ZENTAO_USERNAME) || normalizeOptionalEnvValue(process.env.ZENTAO_ACCOUNT),
    password: normalizeOptionalEnvValue(process.env.ZENTAO_PASSWORD),
    apiVersion: normalizeOptionalEnvValue(process.env.ZENTAO_API_VERSION),
    apiBaseUrl: normalizeOptionalEnvValue(process.env.ZENTAO_API_BASE_URL),
    legacyBaseUrl: normalizeOptionalEnvValue(process.env.ZENTAO_LEGACY_BASE_URL),
  };

  const hasAnyEnvOverride = Object.values(envConfig).some((value) => value !== undefined && value !== '');
  const hasCompleteEnvConfig = Boolean(envConfig.url && envConfig.username && envConfig.password);

  if (hasCompleteEnvConfig) return normalizeConfig(envConfig);

  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  const raw = readConfigFile();
  if (!hasAnyEnvOverride) return normalizeConfig(raw);

  return normalizeConfig({
    ...raw,
    ...Object.fromEntries(Object.entries(envConfig).filter(([, value]) => value !== undefined && value !== '')),
  });
}

function readConfigFile(): Partial<ZentaoConfig> {
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('配置内容必须是 JSON 对象');
    }
    return parsed as Partial<ZentaoConfig>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`禅道配置文件损坏，请检查 ${CONFIG_FILE}：${message}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonBlank(value: string | undefined, message: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function normalizeOptionalEnvValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.trim() === '' ? undefined : value;
}

export function saveConfig(config: ZentaoConfig): void {
  const normalized = normalizeConfig(config);
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CONFIG_FILE, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
}
