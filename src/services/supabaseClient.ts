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

// Se estamos no callback OAuth, força processamento da sessão
if (hasAuthCode) {
    authLog('🔄 Processando callback OAuth...');
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('[Supabase Auth] ❌ Erro no callback OAuth:', error.message);
            // Log adicional para debug do PKCE
            if (error.message.includes('code_verifier')) {
                console.error('[Supabase Auth] 💡 Problema com PKCE code_verifier - verifique se cookies estão habilitados');
            }
        } else if (data.session) {
            authLog('✅ Sessão obtida com sucesso no callback', {
                userId: data.session.user.id,
                email: data.session.user.email,
            });
        }
    });
}
