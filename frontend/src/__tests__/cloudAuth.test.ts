import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseCloudAuth, registerRequest } from '@/services/cloudAuth';
import { createCloudApiClient } from '@/services/cloudApi';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('createSupabaseCloudAuth.signUp', () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it('creates a Supabase account and returns session + user', async () => {
    createClient.mockReturnValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'sup-1', email: 'a@b.com' },
            session: { access_token: 'tok-1', expires_at: 1720000000 },
          },
          error: null,
        }),
      },
    });
    const auth = createSupabaseCloudAuth({ supabaseUrl: 'http://x', supabaseAnonKey: 'k' });
    const result = await auth.signUp({ email: 'a@b.com', password: 'pw', firstName: 'Ada' });
    expect(result.session?.accessToken).toBe('tok-1');
    expect(result.user.id).toBe('sup-1');
    expect(result.user.email).toBe('a@b.com');
  });

  it('passes first/last name and role as user metadata', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'sup-1', email: 'a@b.com' }, session: null },
      error: null,
    });
    createClient.mockReturnValue({ auth: { signUp } });
    const auth = createSupabaseCloudAuth({ supabaseUrl: 'http://x', supabaseAnonKey: 'k' });
    await auth.signUp({
      email: 'a@b.com',
      password: 'pw',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'CONTRACTOR',
    });
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      options: { data: { first_name: 'Ada', last_name: 'Lovelace', role: 'CONTRACTOR' } },
    });
  });

  it('throws ApiError with the server message when Supabase returns an error', async () => {
    createClient.mockReturnValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        }),
      },
    });
    const auth = createSupabaseCloudAuth({ supabaseUrl: 'http://x', supabaseAnonKey: 'k' });
    await expect(auth.signUp({ email: 'a@b.com', password: 'pw' })).rejects.toMatchObject({
      status: 401,
      message: 'User already registered',
    });
  });
});

describe('registerRequest', () => {
  it('POSTs the register-request payload to /auth/register-request/', async () => {
    let calledUrl = '';
    let body: unknown;
    const client = createCloudApiClient({
      apiBaseUrl: 'http://localhost:8000/api/v1',
      getAccessToken: async () => null,
      fetchImpl: (async (url: string, init?: RequestInit) => {
        calledUrl = url;
        body = init?.body;
        return jsonResponse({ success: true, message: 'Account request created successfully.' }, 201);
      }) as typeof fetch,
    });
    const result = await registerRequest(client, {
      email: 'a@b.com',
      supabaseId: 'sup-1',
      role: 'CONTRACTOR',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '+2782 1234',
    });
    expect(calledUrl).toBe('http://localhost:8000/api/v1/auth/register-request/');
    expect(JSON.parse(body as string)).toEqual({
      email: 'a@b.com',
      supabase_id: 'sup-1',
      role: 'CONTRACTOR',
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone_number: '+2782 1234',
    });
    expect(result).toEqual({ success: true, message: 'Account request created successfully.' });
  });
});