import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { ZentaoAuth } from './auth.js';
import type { ZentaoConfig } from '../types/common.js';
import { sanitizeJsonLikeResponse } from '../utils/json.js';

export class ZentaoHttpClient {
  private readonly client: AxiosInstance;
  private readonly auth: ZentaoAuth;

  constructor(private readonly config: ZentaoConfig) {
    this.client = axios.create({
      baseURL: config.apiBaseUrl || `${config.url}/zentao/api.php/${config.apiVersion}`,
      timeout: 30_000,
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

    try {
      const response = await axios.request<ArrayBuffer>({
        method: 'GET',
        url,
        timeout: 30_000,
        responseType: 'arraybuffer',
        headers: { Token: token },
      });

      return {
        data: Buffer.from(response.data),
        contentType: getHeaderString(response.headers['content-type']),
        fileName: getFileNameFromDisposition(response.headers['content-disposition']),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!retried && error.response?.status === 401) {
          this.auth.clearToken();
          return this.downloadLegacyWithRetry(pathOrUrl, true);
        }

        const data = error.response?.data;
        const message = Buffer.isBuffer(data) ? data.toString('utf8').slice(0, 500) : JSON.stringify(data ?? error.message);
        throw new Error(`旧版资源下载失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`);
      }
      throw error;
    }
  }

  private async legacyRequestWithRetry<T = unknown>(method: string, path: string, options: AxiosRequestConfig, retried: boolean): Promise<T> {
    const token = await this.auth.getToken();
    const baseURL = this.getLegacyBaseURL();

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

      return sanitizeJsonLikeResponse(response.data) as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!retried && error.response?.status === 401) {
          this.auth.clearToken();
          return this.legacyRequestWithRetry<T>(method, path, options, true);
        }

        const data = error.response?.data;
        const message = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data ?? error.message);
        throw new Error(`旧版页面请求失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`);
      }
      throw error;
    }
  }

  private async requestWithRetry<T = unknown>(method: string, url: string, options: AxiosRequestConfig, retried: boolean): Promise<T> {
    const token = await this.auth.getToken();

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

      return sanitizeJsonLikeResponse(response.data) as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!retried && error.response?.status === 401) {
          this.auth.clearToken();
          return this.requestWithRetry<T>(method, url, options, true);
        }

        const data = error.response?.data;
        const message = typeof data === 'string' ? data : JSON.stringify(data ?? error.message);
        throw new Error(`请求失败: ${error.response?.status ?? 'NO_STATUS'} - ${message}`);
      }
      throw error;
    }
  }
}

function getHeaderString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getFileNameFromDisposition(disposition: unknown): string | undefined {
  if (typeof disposition !== 'string') return undefined;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}
