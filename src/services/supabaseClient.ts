import { createBrowserClient } from '@supabase/ssr';
import { createCookieHandlers } from '../lib/supabase/cookieStorageAdapter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing in environment variables.');
}

/**
 * Single Supabase client instance for the entire application
 *
 * MIGRATION: @supabase/supabase-js → @supabase/ssr
 *
 * Changes:
 * - createClient → createBrowserClient
 * - localStorage → Cookie storage (via adapter)
 * - PKCE flow mantido (default em @supabase/ssr)
 *
 * Benefits:
 * - Cookies persistem entre diferentes containers em Cloud Run
 * - code_verifier armazenado em cookie (acessível em callback)
 */
export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        cookies: createCookieHandlers(),
        cookieOptions: {
            path: '/',
            sameSite: 'lax',
            secure: window.location.protocol === 'https:',
            maxAge: 60 * 60 * 24 * 7, // 7 dias
        },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    }
);

/**
 * Configura listener para lidar graciosamente com sessões expiradas
 * MANTIDO: Este código não precisa mudar
 */
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
        console.log('[Supabase] ✅ Token renovado com sucesso');
    }
    if (event === 'SIGNED_OUT' && !session) {
        // Limpa a URL de parâmetros OAuth antigos após sign out
        if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
});
