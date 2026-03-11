import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Must mock BEFORE importing the component
const mockSignInWithEmail = vi.fn();
const mockSendMagicLink = vi.fn();
const mockSendPasswordReset = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    sendMagicLink: mockSendMagicLink,
    sendPasswordReset: mockSendPasswordReset,
  }),
}));

vi.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    login: vi.fn(),
    error: null,
    loading: false,
    clearError: vi.fn(),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    button: React.forwardRef(({ children, whileHover, whileTap, transition, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    p: React.forwardRef(({ children, ...props }: any, ref: any) => <p ref={ref} {...props}>{children}</p>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Turnstile
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

// Mock Logo
vi.mock('@/components/ui', () => ({
  Logo: () => <div data-testid="logo" />,
}));

// Mock animation config
vi.mock('@/lib/animations/ceramic-motion', () => ({
  springHover: {},
  springPress: {},
}));

import Login from '../Login';

describe('Login email form (sheet variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('seu@email.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Sua senha')).toBeDefined();
  });

  it('renders email login button', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByText('Entrar com email')).toBeDefined();
  });

  it('renders magic link and forgot password links', () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    expect(screen.getByText('Entrar com magic link')).toBeDefined();
    expect(screen.getByText('Esqueci minha senha')).toBeDefined();
  });

  it('calls signInWithEmail on form submit', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('Entrar com email'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows translated error on invalid credentials', async () => {
    mockSignInWithEmail.mockResolvedValue({ error: 'Invalid login credentials' });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Sua senha'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Entrar com email'));

    await waitFor(() => {
      expect(screen.getByText('Email ou senha incorretos')).toBeDefined();
    });
  });

  it('sends magic link when clicking magic link button', async () => {
    mockSendMagicLink.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Entrar com magic link'));

    await waitFor(() => {
      expect(mockSendMagicLink).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success message after magic link sent', async () => {
    mockSendMagicLink.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Entrar com magic link'));

    await waitFor(() => {
      expect(screen.getByText('Link enviado! Verifique seu email.')).toBeDefined();
    });
  });

  it('sends password reset when clicking forgot password', async () => {
    mockSendPasswordReset.mockResolvedValue({ error: null });
    render(<Login variant="sheet" onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Esqueci minha senha'));

    await waitFor(() => {
      expect(mockSendPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows error when clicking magic link without email', async () => {
    render(<Login variant="sheet" onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('Entrar com magic link'));

    await waitFor(() => {
      expect(screen.getByText('Digite seu email primeiro')).toBeDefined();
    });
  });
});
