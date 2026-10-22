import { createCloudApiClient, type CloudApiClient } from '@/services/cloudApi';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';

export function useCloudApi(): CloudApiClient {
  const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  return createCloudApiClient({
    apiBaseUrl,
    getAccessToken: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (!supabaseUrl || !supabaseAnonKey) return null;
      const auth = createSupabaseCloudAuth({ supabaseUrl, supabaseAnonKey });
      const session = await auth.getSession();
      return session?.accessToken ?? null;
    },
  });
}