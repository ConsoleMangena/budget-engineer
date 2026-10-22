import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/types';
import type { CloudApiClient } from './cloudApi';

export interface CloudSession {
  accessToken: string;
  email: string;
  expiresAt?: number;
}

export interface CloudSignUpInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface CloudSignUpResult {
  user: { id: string; email: string };
  session: CloudSession | null;
}

export interface CloudAuthProvider {
  getSession(): Promise<CloudSession | null>;
  signInWithPassword(email: string, password: string): Promise<CloudSession>;
  signInWithMagicLink(email: string, emailRedirectTo?: string): Promise<void>;
  signUp(input: CloudSignUpInput): Promise<CloudSignUpResult>;
  signOut(): Promise<void>;
  onStateChange(listener: (session: CloudSession | null) => void): () => void;
}

function toCloudSession(session: Session): CloudSession {
  return {
    accessToken: session.access_token,
    email: session.user?.email ?? '',
    expiresAt: session.expires_at ?? undefined,
  };
}

export function createSupabaseCloudAuth(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}): CloudAuthProvider {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      return toCloudSession(data.session);
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        throw new ApiError(401, 'auth_error', error?.message ?? 'Sign-in failed');
      }
      return toCloudSession(data.session);
    },

    async signInWithMagicLink(email, emailRedirectTo) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      if (error) throw new ApiError(401, 'auth_error', error.message);
    },

    async signUp(input) {
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.firstName ?? '',
            last_name: input.lastName ?? '',
            role: input.role ?? 'BUILDER',
          },
        },
      });
      if (error || !data.user) {
        throw new ApiError(401, 'auth_error', error?.message ?? 'Sign-up failed');
      }
      return {
        user: { id: data.user.id, email: data.user.email ?? input.email },
        session: data.session ? toCloudSession(data.session) : null,
      };
    },

    async signOut() {
      await client.auth.signOut();
    },

    onStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session ? toCloudSession(session) : null);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export interface RegisterRequestInput {
  email: string;
  supabaseId: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface RegisterRequestResult {
  success: boolean;
  message?: string;
}

export async function registerRequest(
  client: CloudApiClient,
  input: RegisterRequestInput,
): Promise<RegisterRequestResult> {
  return client.request<RegisterRequestResult>('/auth/register-request/', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      supabase_id: input.supabaseId,
      role: input.role ?? 'BUILDER',
      first_name: input.firstName ?? '',
      last_name: input.lastName ?? '',
      phone_number: input.phoneNumber ?? '',
    }),
  });
}