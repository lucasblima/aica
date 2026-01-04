import { createBrowserClient } from '@supabase/ssr';
import { createCookieHandlers } from '../lib/supabase/cookieStorageAdapter';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing in environment variables.');
}

const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';

function authLog(message: string, data?: unknown) {
    if (DEBUG) {
        console.log(`[Supabase Auth] ${message}`, data ?? '');
    }
}

// Detecta se estamos no callback OAuth (tem code na URL)
const urlParams = new URLSearchParams(window.location.search);
const hasAuthCode = urlParams.has('code');

if (hasAuthCode) {
    authLog('🔐 OAuth callback detectado - code presente na URL');
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
 * - Cookies persistem entre diferentes containers em Cloud Run
 * - code_verifier armazenado em cookie (acessível em callback)
 *
 * PKCE Flow:
 * 1. signInWithOAuth() gera code_verifier e salva em cookie
 * 2. Usuário é redirecionado para Google
 * 3. Google redireciona de volta com ?code=xxx
 * 4. detectSessionInUrl=true lê o code da URL
 * 5. code_verifier é lido do cookie para completar exchange
 */
export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        // Custom cookie handlers REQUIRED for Cloud Run (stateless containers)
        // Without these, Supabase uses localStorage which doesn't persist across containers
        // FIX: Removed JSON.parse from decodeCookieValue to return strings (not objects)
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
            detectSessionInUrl: true, // FIX: Let Supabase handle OAuth callback automatically
            flowType: 'pkce',
            // Debug: log storage operations
            debug: DEBUG,
        },
    }
);

/**
 * Configura listener para lidar com eventos de autenticação
 */
supabase.auth.onAuthStateChange((event, session) => {
    authLog(`Auth event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        provider: session?.user?.app_metadata?.provider,
    });

    if (event === 'SIGNED_IN') {
        authLog('✅ Login bem-sucedido!');
        // Limpa parâmetros OAuth da URL após login
        if (window.location.search.includes('code=')) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    if (event === 'TOKEN_REFRESHED') {
        authLog('✅ Token renovado com sucesso');
    }

    if (event === 'SIGNED_OUT' && !session) {
        authLog('👋 Usuário deslogado');
        // Limpa a URL de parâmetros OAuth antigos após sign out
        if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
});

// REMOVED: This was causing race condition with useAuth hook
// The premature getSession() call was consuming and deleting the code_verifier cookie
// BEFORE useAuth.exchangeCodeForSession() could use it, causing 401 errors.
//
// Root cause: getSession() during module load deletes code_verifier
// Solution: Let useAuth hook handle OAuth callback exclusively
//
// See Issue #28 for full investigation
