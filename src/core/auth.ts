import { createHash } from 'node:crypto';
import axios, { type AxiosInstance } from 'axios';
import { asRecord, sanitizeJsonLikeResponse } from '../utils/json.js';
import type { ZentaoConfig } from '../types/common.js';

class ZentaoAuthError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid-credentials' | 'endpoint-not-found' | 'server-error' | 'network-error' | 'bad-response',
  ) {
    super(message);
    this.name = 'ZentaoAuthError';
  }
}

export class ZentaoAuth {
  private token: string | null = null;

  constructor(
    private readonly client: AxiosInstance,
    private readonly config: ZentaoConfig,
  ) {}

  async getToken(): Promise<string> {
    if (this.token) return this.token;

    try {
      return await this.tryGetToken(this.config.password);
    } catch (error) {
      if (!(error instanceof ZentaoAuthError) || error.code !== 'invalid-credentials') {
        throw error;
      }

      const md5Password = createHash('md5').update(this.config.password).digest('hex');
      try {
        return await this.tryGetToken(md5Password);
      } catch (fallbackError) {
        if (fallbackError instanceof ZentaoAuthError && fallbackError.code === 'invalid-credentials') {
          throw new Error('登录失败：账号或密码错误；已尝试明文密码和 MD5 密码。');
        }
        throw fallbackError;
      }
    }
  }

  clearToken(): void {
    this.token = null;
  }

  private async tryGetToken(password: string): Promise<string> {
    try {
      const response = await this.client.post('/tokens', {
        account: this.config.username,
        password,
      });

      const data = asRecord(sanitizeJsonLikeResponse(response.data));
      const token = data.token;
      if (typeof token === 'string' && token.length > 0) {
        this.token = token;
        return token;
      }

      if (this.looksLikeCredentialFailure(data)) {
        throw new ZentaoAuthError('登录失败：账号或密码错误。', 'invalid-credentials');
      }

      throw new ZentaoAuthError(`获取 token 失败：响应中没有 token，返回=${JSON.stringify(data)}`, 'bad-response');
    } catch (error) {
      throw this.normalizeAuthError(error);
    }
  }

  private looksLikeCredentialFailure(data: Record<string, unknown>): boolean {
    const text = JSON.stringify(data).toLowerCase();
    return /(password|account|login|auth|用户|账号|密码|登录|认证|invalid|failed)/.test(text);
  }

  private normalizeAuthError(error: unknown): Error {
    if (error instanceof ZentaoAuthError) return error;

    if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error(String(error));

    if (!error.response) {
      return new ZentaoAuthError(`连接禅道失败：${error.message}`, 'network-error');
    }

    const status = error.response.status;
    const data = describeResponseData(error.response.data);

    if (status === 401 || status === 403) {
      return new ZentaoAuthError(`登录失败：账号或密码错误，HTTP ${status}。`, 'invalid-credentials');
    }

    if (status === 404) {
      return new ZentaoAuthError(
        `登录失败：token 接口不存在，当前地址可能不对。请检查 ZENTAO_URL / ZENTAO_API_BASE_URL。HTTP 404，返回=${data}`,
        'endpoint-not-found',
      );
    }

    if (status >= 500) {
      return new ZentaoAuthError(`登录失败：禅道服务端异常，HTTP ${status}，返回=${data}`, 'server-error');
    }

    return new ZentaoAuthError(`登录失败：HTTP ${status}，返回=${data}`, 'bad-response');
  }
}

function describeResponseData(data: unknown): string {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return '';

    try {
      const parsed = sanitizeJsonLikeResponse(trimmed);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch {
      return trimmed;
    }
  }

  if (data === null || data === undefined) return '';
  return JSON.stringify(data);
}
