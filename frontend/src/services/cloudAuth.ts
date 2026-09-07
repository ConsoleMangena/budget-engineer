import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api/types';

export interface CloudSession {
  accessToken: string;
  email: string;
  expiresAt?: number;
}

export interface CloudAuthProvider {
  getSession(): Promise<CloudSession | null>;
  signInWithPassword(email: string, password: string): Promise<CloudSession>;
  signInWithMagicLink(email: string, emailRedirectTo?: string): Promise<void>;
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