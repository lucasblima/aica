/**
 * Tests for useAuth hook — email authentication methods
 *
 * Tests the new email auth methods:
 * - signInWithEmail calls supabase.auth.signInWithPassword
 * - sendMagicLink calls supabase.auth.signInWithOtp
 * - sendPasswordReset calls supabase.auth.resetPasswordForEmail
 * - Error propagation for all methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// HOISTED MOCKS — available before vi.mock factories run
// ============================================

const {
  mockSignInWithPassword,
  mockSignInWithOtp,
  mockResetPasswordForEmail,
  mockSignOut,
  mockGetSession,
  mockOnAuthStateChange,
} = vi.hoisted(() => {
  const mockSignInWithPassword = vi.fn();
  const mockSignInWithOtp = vi.fn();
  const mockResetPasswordForEmail = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetSession = vi.fn();
  const mockOnAuthStateChange = vi.fn();

  return {
    mockSignInWithPassword,
    mockSignInWithOtp,
    mockResetPasswordForEmail,
    mockSignOut,
    mockGetSession,
    mockOnAuthStateChange,
  };
});

// ============================================
// vi.mock — factories use hoisted variables
// ============================================

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOtp: mockSignInWithOtp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

vi.mock('@/services/authCacheService', () => ({
  invalidateAuthCache: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import AFTER mocks are set up
import { useAuth } from '../useAuth';

// ============================================
// TESTS
// ============================================

describe('useAuth — email auth methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: getSession returns no session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Default: onAuthStateChange returns a subscription object
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    // Default: signOut succeeds
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------
  // signInWithEmail
  // ------------------------------------------

  describe('signInWithEmail', () => {
    it('calls supabase.auth.signInWithPassword with email and password', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.signInWithEmail('user@example.com', 'mypassword');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'mypassword',
      });
      expect(response?.error).toBeNull();
    });

    it('returns error message on failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.signInWithEmail('user@example.com', 'wrongpass');
      });

      expect(response?.error).toBe('Invalid login credentials');
    });
  });

  // ------------------------------------------
  // sendMagicLink
  // ------------------------------------------

  describe('sendMagicLink', () => {
    it('calls supabase.auth.signInWithOtp with email and redirect URL', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.sendMagicLink('user@example.com');
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      expect(response?.error).toBeNull();
    });

    it('returns error message on failure', async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.sendMagicLink('user@example.com');
      });

      expect(response?.error).toBe('Rate limit exceeded');
    });
  });

  // ------------------------------------------
  // sendPasswordReset
  // ------------------------------------------

  describe('sendPasswordReset', () => {
    it('calls supabase.auth.resetPasswordForEmail with email and redirect URL', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.sendPasswordReset('user@example.com');
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      expect(response?.error).toBeNull();
    });

    it('returns error message on failure', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let response: { error: string | null } | undefined;
      await act(async () => {
        response = await result.current.sendPasswordReset('unknown@example.com');
      });

      expect(response?.error).toBe('User not found');
    });
  });

  // ------------------------------------------
  // Return value includes new methods
  // ------------------------------------------

  it('exposes signInWithEmail, sendMagicLink, sendPasswordReset in return value', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.signInWithEmail).toBe('function');
    expect(typeof result.current.sendMagicLink).toBe('function');
    expect(typeof result.current.sendPasswordReset).toBe('function');
  });
});
