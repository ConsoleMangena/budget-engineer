// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '@/pages/RegisterPage';
import { useCloudStore } from '@/stores/cloudStore';

const { createSupabaseCloudAuth, registerRequest } = vi.hoisted(() => ({
  createSupabaseCloudAuth: vi.fn(),
  registerRequest: vi.fn(),
}));

vi.mock('@/services/cloudAuth', () => ({ createSupabaseCloudAuth, registerRequest }));

function mockAuth(overrides: Record<string, unknown> = {}) {
  const auth = {
    getSession: vi.fn().mockResolvedValue(null),
    signInWithPassword: vi.fn(),
    signInWithMagicLink: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue({
      user: { id: 'sup-1', email: 'a@b.com' },
      session: { accessToken: 'tok', email: 'a@b.com' },
    }),
    signOut: vi.fn(),
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

describe('RegisterPage', () => {
  it('renders registration fields with a sign-in link', () => {
    mockAuth();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/last name/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /sign in instead/i }).getAttribute('href')).toBe('/login');
  });

  it('signs up via Supabase then sends a Django register-request', async () => {
    const auth = mockAuth();
    registerRequest.mockResolvedValue({ success: true });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'password123',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: 'BUILDER',
      });
      expect(registerRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'a@b.com',
          supabaseId: 'sup-1',
        }),
      );
      expect(useCloudStore.getState().status).toBe('signed-in');
    });
  });

  it('shows an email-verification notice when no session is returned', async () => {
    const auth = mockAuth({
      signUp: vi.fn().mockResolvedValue({ user: { id: 'sup-1', email: 'a@b.com' }, session: null }),
    });
    registerRequest.mockResolvedValue({ success: true });
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalled();
      expect(registerRequest).toHaveBeenCalled();
      expect(screen.getByText(/check your email|verify/i)).toBeTruthy();
    });
  });
});