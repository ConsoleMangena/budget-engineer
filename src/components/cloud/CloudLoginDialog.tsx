import { useState } from 'react';
import { useCloudStore } from '@/stores/cloudStore';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';

interface CloudLoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CloudLoginDialog({ open, onClose }: CloudLoginDialogProps) {
  const store = useCloudStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabaseUrl || !supabaseAnonKey) {
      store.recordError(
        'Cloud sync is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      );
      return;
    }
    setBusy(true);
    store.clearError();
    try {
      const auth = createSupabaseCloudAuth({ supabaseUrl, supabaseAnonKey });
      store.setStatus('signing-in');
      if (mode === 'magic-link') {
        await auth.signInWithMagicLink(email);
        store.recordError('Check your inbox for the sign-in link.');
      } else {
        const session = await auth.signInWithPassword(email, password);
        store.setSignedIn(session.email);
        onClose();
      }
    } catch (err) {
      store.recordError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <h2 className="mb-1 text-lg font-semibold">Africa ConTech Hub</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Optional cloud sync for projects &amp; BOQ. Your work stays local — sign in only when you
          want to back up to the hub.
        </p>
        {store.lastError && (
          <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            {store.lastError}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
          {mode === 'password' && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
          )}
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
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-[var(--brand-accent)] disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Continue offline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}