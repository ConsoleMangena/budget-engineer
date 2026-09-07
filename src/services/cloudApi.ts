import { ApiError } from '@/lib/api/types';

export interface CloudApiConfig {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export interface CloudApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createCloudApiClient(config: CloudApiConfig): CloudApiClient {
  const { apiBaseUrl, getAccessToken } = config;
  const fetchImpl = config.fetchImpl ?? fetch;

  async function doFetch<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetchImpl(`${apiBaseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(401, 'unauthorized', 'Session expired or invalid');
      }
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(response.status, 'http_error', payload?.message ?? response.statusText);
    }
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return (await response.text()) as unknown as T;
    return (await response.json()) as T;
  }

  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const token = await getAccessToken();
      try {
        return await doFetch<T>(path, init, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const freshToken = await getAccessToken();
          if (freshToken) return doFetch<T>(path, init, freshToken);
        }
        throw err;
      }
    },
  };
}
