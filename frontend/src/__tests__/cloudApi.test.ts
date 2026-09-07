import { describe, it, expect } from 'vitest';
import { createCloudApiClient } from '@/services/cloudApi';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('cloudApi', () => {
  it('injects an Authorization header when a token is present', async () => {
    const calls: RequestInit[] = [];
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => 'jwt-abc',
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        calls.push(init ?? {});
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });
    await client.request('/projects/');
    const headers = new Headers(calls[0]?.headers as HeadersInit | undefined);
    expect(headers.get('Authorization')).toBe('Bearer jwt-abc');
  });

  it('omits the Authorization header when signed out', async () => {
    let call: RequestInit = {};
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async (_url: string, init?: RequestInit) => {
        call = init ?? {};
        return jsonResponse({ ok: true });
      }) as typeof fetch,
    });
    await client.request('/projects/');
    const headers = new Headers(call.headers as HeadersInit | undefined);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('parses JSON responses and prefixes the API base URL', async () => {
    let calledUrl = '';
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async (url: string) => {
        calledUrl = url;
        return jsonResponse({ id: 7, title: 'House' });
      }) as typeof fetch,
    });
    const data = await client.request<{ id: number; title: string }>('/projects/');
    expect(data).toEqual({ id: 7, title: 'House' });
    expect(calledUrl).toBe('http://localhost:8000/api/v1/projects/');
  });

  it('retries once with a fresh token after a 401', async () => {
    let calls = 0;
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => (calls === 0 ? 'stale-token' : 'fresh-token'),
      fetchImpl: (async () => {
        calls += 1;
        if (calls === 1) return jsonResponse({}, 401);
        return jsonResponse({ fresh: true });
      }) as typeof fetch,
    });
    const data = await client.request<{ fresh: boolean }>('/projects/');
    expect(calls).toBe(2);
    expect(data).toEqual({ fresh: true });
  });

  it('throws ApiError with the server message on failure', async () => {
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async () =>
        jsonResponse({ message: 'Account pending approval.' }, 403)) as typeof fetch,
    });
    await expect(client.request('/projects/')).rejects.toMatchObject({
      status: 403,
      message: 'Account pending approval.',
    });
  });
});
