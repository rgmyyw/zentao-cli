import { afterEach, describe, expect, it, vi } from 'vitest';

const config = { url: 'https://zentao.example.com', username: 'me', password: 'secret', apiVersion: 'v1' };

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function mockAxios() {
  const axiosMock = {
    create: vi.fn(),
    request: vi.fn(),
    isAxiosError: vi.fn((error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError)),
  };
  vi.doMock('axios', () => ({ default: axiosMock }));
  return axiosMock;
}

function axiosError(status: number | undefined, data: unknown = 'error') {
  return { isAxiosError: true, message: 'boom', response: status ? { status, data } : undefined };
}

describe('ZentaoAuth', () => {
  it('gets and caches token from the token endpoint', async () => {
    mockAxios();
    const client = { post: vi.fn(async () => ({ data: { token: 't1' } })) };
    const { ZentaoAuth } = await import('../../src/core/auth.js');
    const auth = new ZentaoAuth(client as never, config);

    await expect(auth.getToken()).resolves.toBe('t1');
    await expect(auth.getToken()).resolves.toBe('t1');

    expect(client.post).toHaveBeenCalledOnce();
    expect(client.post).toHaveBeenCalledWith('/tokens', { account: 'me', password: 'secret' });
  });

  it('falls back to md5 password after credential failure', async () => {
    mockAxios();
    const client = {
      post: vi.fn()
        .mockResolvedValueOnce({ data: { error: 'password invalid' } })
        .mockResolvedValueOnce({ data: { token: 'md5-token' } }),
    };
    const { ZentaoAuth } = await import('../../src/core/auth.js');

    await expect(new ZentaoAuth(client as never, config).getToken()).resolves.toBe('md5-token');

    expect(client.post).toHaveBeenNthCalledWith(2, '/tokens', {
      account: 'me',
      password: '5ebe2294ecd0e0f08eab7690d2a6ee69',
    });
  });

  it('normalizes auth failures', async () => {
    mockAxios();
    const { ZentaoAuth } = await import('../../src/core/auth.js');

    await expect(new ZentaoAuth({ post: vi.fn(async () => ({ data: {} })) } as never, config).getToken()).rejects.toThrow('响应中没有 token');
    await expect(new ZentaoAuth({ post: vi.fn().mockRejectedValue(axiosError(undefined)) } as never, config).getToken()).rejects.toThrow('连接禅道失败');
    await expect(new ZentaoAuth({ post: vi.fn().mockRejectedValue(axiosError(404, { error: 'missing' })) } as never, config).getToken()).rejects.toThrow('token 接口不存在');
    await expect(new ZentaoAuth({ post: vi.fn().mockRejectedValue(axiosError(500, { error: 'server' })) } as never, config).getToken()).rejects.toThrow('服务端异常');
  });
});

describe('ZentaoHttpClient', () => {
  it('creates a client with the expected baseURL and sends authenticated requests', async () => {
    const axiosMock = mockAxios();
    const client = {
      post: vi.fn(async () => ({ data: { token: 'token' } })),
      request: vi.fn(async () => ({ data: { ok: true } })),
    };
    axiosMock.create.mockReturnValue(client);
    const { ZentaoHttpClient } = await import('../../src/core/http.js');
    const http = new ZentaoHttpClient(config);

    await expect(http.request('GET', '/tasks', { params: { page: 1 }, headers: { A: 'B' } })).resolves.toEqual({ ok: true });

    expect(http.username).toBe('me');
    expect(axiosMock.create).toHaveBeenCalledWith({ baseURL: 'https://zentao.example.com/zentao/api.php/v1', timeout: 30_000 });
    expect(client.request).toHaveBeenCalledWith({ method: 'GET', url: '/tasks', params: { page: 1 }, headers: { A: 'B', Token: 'token' } });
  });

  it('clears token and retries once on 401', async () => {
    const axiosMock = mockAxios();
    const client = {
      post: vi.fn()
        .mockResolvedValueOnce({ data: { token: 'old' } })
        .mockResolvedValueOnce({ data: { token: 'new' } }),
      request: vi.fn()
        .mockRejectedValueOnce(axiosError(401, 'expired'))
        .mockResolvedValueOnce({ data: { ok: true } }),
    };
    axiosMock.create.mockReturnValue(client);
    const { ZentaoHttpClient } = await import('../../src/core/http.js');

    await expect(new ZentaoHttpClient(config).request('GET', '/tasks')).resolves.toEqual({ ok: true });

    expect(client.post).toHaveBeenCalledTimes(2);
    expect(client.request).toHaveBeenNthCalledWith(2, { method: 'GET', url: '/tasks', headers: { Token: 'new' } });
  });

  it('wraps REST and legacy request failures', async () => {
    const axiosMock = mockAxios();
    axiosMock.create.mockReturnValue({
      post: vi.fn(async () => ({ data: { token: 't' } })),
      request: vi.fn().mockRejectedValue(axiosError(500, { error: 'server' })),
    });
    axiosMock.request.mockRejectedValue(axiosError(404, 'legacy missing'));
    const { ZentaoHttpClient } = await import('../../src/core/http.js');
    const http = new ZentaoHttpClient(config);

    await expect(http.request('GET', '/bad')).rejects.toThrow('请求失败: 500');
    await expect(http.legacyRequest('GET', '/old')).rejects.toThrow('旧版页面请求失败: 404');
  });
});
