import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCloudStore } from '@/stores/cloudStore';
import { useCloudApi } from '@/hooks/useCloudApi';
import { createSupabaseCloudAuth, registerRequest } from '@/services/cloudAuth';
import { Button } from '@/components/ui/Button';

export function RegisterPage() {
  const navigate = useNavigate();
  const store = useCloudStore();
  const cloudApi = useCloudApi();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUILDER' | 'CONTRACTOR' | 'SUPPLIER'>('BUILDER');
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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
    setVerificationSent(false);
    try {
      const auth = createSupabaseCloudAuth({ supabaseUrl, supabaseAnonKey });
      const result = await auth.signUp({ email, password, firstName, lastName, role });
      await registerRequest(cloudApi, {
        email: result.user.email,
        supabaseId: result.user.id,
        role,
        firstName,
        lastName,
      });
      if (result.session) {
        store.setSignedIn(result.session.email);
        navigate('/');
      } else {
        setVerificationSent(true);
        store.clearError();
      }
    } catch (err) {
      store.recordError(err instanceof Error ? err.message : 'Registration failed');
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
            <h1 className="font-display text-2xl font-bold">Create Account</h1>
            <p className="text-sm text-[var(--text-secondary)]">Join the Africa ConTech Hub</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-2xl">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Sign up to back up projects &amp; BOQ to the hub. Accounts require admin approval before
            syncing.
          </p>

          {store.lastError && (
            <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              {store.lastError}
            </p>
          )}

          {verificationSent && (
            <p className="mb-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Almost there — check your email to verify your account before signing in.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first" className="mb-1 block text-sm font-medium">
                  First name
                </label>
                <input
                  id="reg-first"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="reg-last" className="mb-1 block text-sm font-medium">
                  Last name
                </label>
                <input
                  id="reg-last"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="reg-role" className="mb-1 block text-sm font-medium">
                Role
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className={inputClass}
              >
                <option value="BUILDER">Builder</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--brand-accent)] hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}