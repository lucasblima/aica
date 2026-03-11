import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui', () => ({
  Logo: () => <div data-testid="logo" />,
}));

import ResetPasswordPage from '../ResetPasswordPage';
import { supabase } from '@/services/supabaseClient';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password fields', () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeDefined();
    expect(screen.getByPlaceholderText('Repita a senha')).toBeDefined();
  });

  it('renders submit button', () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    expect(screen.getByText('Salvar nova senha')).toBeDefined();
  });

  it('shows error when password too short', async () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeDefined();
    });
  });

  it('shows error when passwords do not match', async () => {
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem.')).toBeDefined();
    });
  });

  it('calls updateUser on valid submit', async () => {
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'newpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'newpassword' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword' });
    });
  });

  it('shows success state after password reset', async () => {
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'newpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'newpassword' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('Senha redefinida!')).toBeDefined();
      expect(screen.getByText('Ir para o painel')).toBeDefined();
    });
  });

  it('shows error on updateUser failure', async () => {
    (supabase.auth.updateUser as any).mockResolvedValue({
      error: { message: 'Token expired' },
    });
    render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'newpassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repita a senha'), {
      target: { value: 'newpassword' },
    });
    fireEvent.click(screen.getByText('Salvar nova senha'));

    await waitFor(() => {
      expect(screen.getByText('Erro ao redefinir senha. Tente novamente.')).toBeDefined();
    });
  });
});
