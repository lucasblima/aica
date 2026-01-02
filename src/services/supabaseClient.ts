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
 * - localStorage → Cookie storage (via adapter with chunking support)
 * - PKCE flow with explicit code exchange in useAuth hook
 *
 * Benefits:
 * - Cookies persist across stateless containers (Cloud Run)
 * - code_verifier properly stored/retrieved via chunked cookies
 * - Explicit PKCE code exchange prevents 401 errors
 *
 * IMPORTANT: detectSessionInUrl is set to FALSE because:
 * - The useAuth hook explicitly handles code exchange via exchangeCodeForSession()
 * - This prevents race conditions and double-handling of the auth code
 * - Gives us more control over error handling and URL cleanup
 */
export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        cookies: createCookieHandlers(),
        cookieOptions: {
            path: '/',
            sameSite: 'lax',
            secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // Handled explicitly in useAuth hook
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
