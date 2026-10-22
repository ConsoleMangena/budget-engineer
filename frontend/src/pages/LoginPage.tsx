import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';
import { useCloudStore } from '@/stores/cloudStore';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const store = useCloudStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');
  const [busy, setBusy] = useState(false);

  const inputClass =
    'w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--brand-accent)] focus:outline-none';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !supabaseAnonKey) {
      store.recordError('Cloud sync is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    store.clearError();
    try {
      const auth = createSupabaseCloudAuth({ supabaseUrl, supabaseAnonKey });
      if (mode === 'magic-link') {
        await auth.signInWithMagicLink(email);
        store.recordError('Check your inbox for the sign-in link.');
      } else {
        const session = await auth.signInWithPassword(email, password);
        store.setSignedIn(session.email);
        navigate('/');
      }
    } catch (err) {
      store.recordError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="absolute inset-0 aurora opacity-20 pointer-events-none" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="touch-target flex items-center">
            <Button variant="ghost" size="icon" className="h-11 w-11">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Sign In</h1>
            <p className="text-sm text-[var(--text-secondary)]">Africa ConTech Hub cloud sync</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-2xl">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Your work stays local — sign in only when you want to back up to the hub.
          </p>

          {store.lastError && (
            <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              {store.lastError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            {mode === 'password' ? (
              <div>
                <label htmlFor="login-password" className="mb-1 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
                className="text-[var(--brand-accent)] hover:underline"
              >
                {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
              </button>
              <span className="text-[var(--text-muted)]">Offline-first · optional</span>
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            Need an account?{' '}
            <Link to="/register" className="text-[var(--brand-accent)] hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}