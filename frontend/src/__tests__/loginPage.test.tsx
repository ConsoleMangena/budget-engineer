// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { useCloudStore } from '@/stores/cloudStore';

const { createSupabaseCloudAuth } = vi.hoisted(() => ({ createSupabaseCloudAuth: vi.fn() }));
vi.mock('@/services/cloudAuth', () => ({ createSupabaseCloudAuth }));

function mockAuth(overrides: Record<string, unknown> = {}) {
  const auth = {
    getSession: vi.fn().mockResolvedValue(null),
    signInWithPassword: vi.fn().mockResolvedValue({ accessToken: 'tok', email: 'a@b.com' }),
    signInWithMagicLink: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    onStateChange: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
  createSupabaseCloudAuth.mockReturnValue(auth);
  return auth;
}

beforeEach(() => {
  vi.clearAllMocks();
  useCloudStore.setState({
    status: 'unconfigured',
    email: '',
    lastSyncAt: null,
    lastError: null,
    projectLinks: [],
  });
  import.meta.env.VITE_SUPABASE_URL = 'http://supabase.test';
  import.meta.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});

afterEach(() => {
  cleanup();
});

describe('LoginPage', () => {
  it('renders email and password fields with a register link', () => {
    mockAuth();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /create account/i }).getAttribute('href')).toBe('/register');
  });

  it('signs in with Supabase password auth and records the session', async () => {
    const auth = mockAuth();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(auth.signInWithPassword).toHaveBeenCalledWith('a@b.com', 'pw');
      expect(useCloudStore.getState().status).toBe('signed-in');
      expect(useCloudStore.getState().email).toBe('a@b.com');
    });
  });

  it('shows the error message when sign-in fails', async () => {
    mockAuth({
      signInWithPassword: vi.fn().mockRejectedValue(new Error('Invalid login credentials')),
    });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeTruthy();
    });
  });
});