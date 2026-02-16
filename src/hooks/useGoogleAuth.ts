import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface UseGoogleAuthReturn {
  login: () => Promise<void>;
  error: string | null;
  loading: boolean;
  clearError: () => void;
}

/**
 * Hook para autenticação com Google OAuth
 * Inclui escopos do Google Calendar para funcionamento completo
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Escopos mínimos para verificação OAuth do Google
    // - calendar.readonly: Leitura de calendários (suficiente para o AICA)
    // - userinfo.email: Email do usuário
    // NOTA: Scopes reduzidos de calendar (read-write) para calendar.readonly
    // conforme exigido pelo processo de verificação OAuth do Google (#256)
    const googleCalendarScopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: googleCalendarScopes,
        queryParams: {
          access_type: 'offline', // Garante refresh_token
          prompt: 'consent',      // Força tela de consentimento para novas permissões
        },
      }
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
  }, []);

  return {
    login,
    error,
    loading,
    clearError,
  };
}
