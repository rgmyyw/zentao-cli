import http from 'node:http';
import https from 'node:https';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ZentaoAuth } from './auth.js';
import type { ZentaoConfig } from '../types/common.js';
import { recordRequestFinished, recordRequestStarted } from './http-metrics.js';
import { sanitizeJsonLikeResponse } from '../utils/json.js';

export interface HttpError extends Error {
  statusCode?: number;
  responseBody?: unknown;
}

export class ZentaoHttpClient {
  /** GET 请求触发的写副作用路径片段（禅道用 GET 调用 finish/activate 等动词）。 */
  private static readonly WRITE_VERB_PATTERN = /(?:^|\/)(finish|activate|start|close|confirm|pause|restart|cancel|suspend|putoff|assign|resolve)(?:\/|$)/i;
  /** 旧版资源下载大小上限（50MB），防止恶意 URL 拖垮内存。 */
  private static readonly MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
  /** GET 响应缓存条目上限，避免长期运行时内存无限增长。 */
  private static readonly MAX_CACHE_ENTRIES = 64;
  private readonly client: AxiosInstance;
  private readonly auth: ZentaoAuth;
  private readonly responseCache = new Map<string, { expiresAt: number; value: unknown }>();
  constructor(private readonly config: ZentaoConfig) {
    this.client = axios.create({
      baseURL: config.apiBaseUrl || `${config.url}/zentao/api.php/${config.apiVersion}`,
      timeout: 30_000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });
    this.auth = new ZentaoAuth(this.client, config);
  }

  get username(): string {
    return this.config.username;
  }

  async getToken(): Promise<string> {
    return this.auth.getToken();
  }

  async request<T = unknown>(method: string, url: string, options: AxiosRequestConfig = {}): Promise<T> {
    return this.requestWithRetry<T>(method, url, options, false);
  }

  async legacyRequest<T = unknown>(method: string, path: string, options: AxiosRequestConfig = {}): Promise<T> {
    return this.legacyRequestWithRetry<T>(method, path, options, false);
  }

  resolveLegacyUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const baseURL = this.getLegacyBaseURL().replace(/\/$/, '');
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${baseURL}${path}`;
  }

  /**
   * 校验绝对 URL 的 host 必须匹配配置的禅道 serverUrl，防止 SSRF（如引向 169.254.169.254）。
   * 相对路径直接放行（会拼接到配置的 legacy base URL）。
   */
  private assertAllowedLegacyHost(targetUrl: string): void {
    if (!/^https?:\/\//i.test(targetUrl)) return;
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return;
    }
    const configuredHost = this.getConfiguredHost();
    if (!configuredHost) return;
    if (normalizeHost(parsed.host) !== normalizeHost(configuredHost)) {
      throw createHttpError(
        `旧版资源下载地址 host 与禅道配置不一致: ${parsed.host}（期望 ${configuredHost}），已拒绝以防止 SSRF`,
        undefined,
        { url: targetUrl },
      );
    }
  }

  private getConfiguredHost(): string | undefined {
    const candidates = [this.config.legacyBaseUrl, this.config.apiBaseUrl, this.config.url];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || candidate.trim() === '') continue;
      try {
        return new URL(candidate.startsWith('http') ? candidate : `http://${candidate}`).host;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  async downloadLegacy(pathOrUrl: string): Promise<{ data: Buffer; contentType?: string; fileName?: string }> {
    return this.downloadLegacyWithRetry(pathOrUrl, false);
  }

  private getLegacyBaseURL(): string {
    if (this.config.legacyBaseUrl) return this.config.legacyBaseUrl;
    if (this.config.apiBaseUrl) return this.config.apiBaseUrl.replace(/\/api\.php(?:\/.*)?$/i, '');
    return `${this.config.url.replace(/\/$/, '')}/zentao`;
  }

  private async downloadLegacyWithRetry(pathOrUrl: string, retried: boolean): Promise<{ data: Buffer; contentType?: string; fileName?: string }> {
    const token = await this.auth.getToken();
    const url = this.resolveLegacyUrl(pathOrUrl);
    this.assertAllowedLegacyHost(url);
    recordRequestStarted();
    const startedAt = Date.now();

    try {
      const response = await axios.request<ArrayBuffer>({
        method: 'GET',
        url,
        timeout: 30_000,
        responseType: 'arraybuffer',
        maxContentLength: ZentaoHttpClient.MAX_DOWNLOAD_BYTES,
        maxBodyLength: ZentaoHttpClient.MAX_DOWNLOAD_BYTES,
        httpAgent: this.client.defaults.httpAgent,
        httpsAgent: this.client.defaults.httpsAgent,
        headers: { Token: token },
      });
      recordRequestFinished(Date.now() - startedAt);

      return {
        data: Buffer.from(response.data),
        contentType: getHeaderString(response.headers['content-type']),
        fileName: getFileNameFromDisposition(response.headers['content-disposition']),
      };
    } catch (error) {
      recordRequestFinished(Date.now() - startedAt);
      if (axios.isAxiosError(error)) {
        if (!retried && (error.response?.status === 401 || isRetryableNetworkError(error))) {
          if (error.response?.status === 401) this.auth.clearToken();
          return this.downloadLegacyWithRetry(pathOrUrl, true);
        }

        const data = error.response?.data;
        const message = Buffer.isBuffer(data) ? data.toString('utf8').slice(0, 500) : JSON.stringify(data ?? error.message);
        throw createHttpError(`旧版资源下载失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`, error.response?.status, data);
      }

      throw createHttpError(`旧版资源下载失败: ${String(error)}`, undefined, { path: pathOrUrl });
    }
  }

  private async legacyRequestWithRetry<T = unknown>(method: string, path: string, options: AxiosRequestConfig, retried: boolean): Promise<T> {
    const token = await this.auth.getToken();
    const baseURL = this.getLegacyBaseURL();
    recordRequestStarted();
    const startedAt = Date.now();

    try {
      const response = await axios.request({
        ...options,
        method,
        baseURL,
        url: path,
        timeout: 30_000,
        headers: {
          ...options.headers,
          Token: token,
        },
      });
      recordRequestFinished(Date.now() - startedAt);

      return normalizeResponseData(response.data) as T;
    } catch (error) {
      recordRequestFinished(Date.now() - startedAt);
      if (axios.isAxiosError(error)) {
        if (!retried && (error.response?.status === 401 || isRetryableNetworkError(error))) {
          if (error.response?.status === 401) this.auth.clearToken();
          return this.legacyRequestWithRetry<T>(method, path, options, true);
        }

        const data = error.response?.data;
        const message = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data ?? error.message);
        throw createHttpError(`旧版页面请求失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`, error.response?.status, data);
      }

      throw createHttpError(`旧版页面请求失败: ${String(error)}`, undefined, { path });
    }
  }

  private async requestWithRetry<T = unknown>(method: string, url: string, options: AxiosRequestConfig, retried: boolean): Promise<T> {
    const cacheKey = this.getCacheKey(method, url, options);
    const cached = this.readCache<T>(cacheKey);
    if (cached !== undefined) return cached;
    const token = await this.auth.getToken();
    recordRequestStarted();
    const startedAt = Date.now();

    try {
      const response = await this.client.request({
        ...options,
        method,
        url,
        headers: {
          ...options.headers,
          Token: token,
        },
      });
      recordRequestFinished(Date.now() - startedAt);
      const normalized = normalizeResponseData(response.data) as T;
      this.writeCache(cacheKey, method, normalized);
      return normalized;
    } catch (error) {
      recordRequestFinished(Date.now() - startedAt);
      if (axios.isAxiosError(error)) {
        if (!retried && (error.response?.status === 401 || isRetryableNetworkError(error))) {
          if (error.response?.status === 401) this.auth.clearToken();
          return this.requestWithRetry<T>(method, url, options, true);
        }

        const data = error.response?.data;
        const message = typeof data === 'string' ? data : JSON.stringify(data ?? error.message);
        throw createHttpError(`请求失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`, error.response?.status, data);
      }

      throw createHttpError(`请求失败: ${String(error)}`, undefined, { url });
    }
  }

  private getCacheKey(method: string, url: string, options: AxiosRequestConfig): string | undefined {
    if (method.toUpperCase() !== 'GET') return undefined;
    // 禅道用 GET 触发写副作用（如 /todos/{id}/finish、/todos/{id}/activate），不能缓存。
    if (ZentaoHttpClient.WRITE_VERB_PATTERN.test(url)) return undefined;
    return JSON.stringify({ method: method.toUpperCase(), url, params: options.params ?? null, data: options.data ?? null });
  }

  private readCache<T>(key: string | undefined): T | undefined {
    if (!key) return undefined;
    const cached = this.responseCache.get(key);
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
      this.responseCache.delete(key);
      return undefined;
    }
    // 重新插入以维持 LRU 访问顺序（Map 按插入序）。
    this.responseCache.delete(key);
    this.responseCache.set(key, cached);
    return attachCacheMeta(cached.value) as T;
  }

  private writeCache(key: string | undefined, method: string, value: unknown): void {
    if (!key || method.toUpperCase() !== 'GET') return;
    if (this.responseCache.size >= ZentaoHttpClient.MAX_CACHE_ENTRIES && !this.responseCache.has(key)) {
      // 删除最早插入且大概率最早过期的条目，限制缓存规模。
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey !== undefined) this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(key, { expiresAt: Date.now() + 15_000, value });
  }
}

function normalizeResponseData(data: unknown): unknown {
  if (data === null || data === undefined) return {};
  if (typeof data === 'string' && data.trim() === '') return {};
  return sanitizeJsonLikeResponse(data);
}

function attachCacheMeta(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return {
    ...(value as Record<string, unknown>),
    cacheHit: true,
  };
}

function createHttpError(message: string, statusCode?: number, responseBody?: unknown): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  error.responseBody = responseBody;
  return error;
}

function isRetryableNetworkError(error: { code?: string; message?: string }): boolean {
  return ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code ?? '') || /timeout|socket hang up|network/i.test(error.message ?? '');
}

function getHeaderString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function normalizeHost(host: string): string {
  // 去除端口与大小写差异，便于 host 比对。
  return host.toLowerCase().replace(/:\d+$/, '');
}

function getFileNameFromDisposition(disposition: unknown): string | undefined {
  if (typeof disposition !== 'string') return undefined;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}
