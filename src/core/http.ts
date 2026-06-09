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

  private getLegacyBaseURL(): string {
    if (this.config.legacyBaseUrl) return this.config.legacyBaseUrl;
    if (this.config.apiBaseUrl) return this.config.apiBaseUrl.replace(/\/api\.php(?:\/.*)?$/i, '');
    return `${this.config.url.replace(/\/$/, '')}/zentao`;
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
