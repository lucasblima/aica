import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('[SupabaseClient] Supabase URL or Key is missing in environment variables.');
}

const DEBUG = import.meta.env.DEV;

function authLog(message: string, data?: unknown) {
    if (DEBUG) {
        console.debug(`[SupabaseClient] [Supabase Auth] ${message}`, data ?? '');
    }
}

/**
 * Single Supabase client instance for the entire application
 *
 * Uses @supabase/ssr createBrowserClient which natively handles browser cookies
 * via the `cookie` npm package (parse/serialize). No custom cookie adapter needed.
 *
 * PKCE Flow:
 * 1. signInWithOAuth() generates code_verifier and stores in cookie
 * 2. User is redirected to Google
 * 3. Google redirects back with ?code=xxx
 * 4. detectSessionInUrl=true reads the code from URL
 * 5. code_verifier is read from cookie to complete exchange
 */
export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        // No custom cookies handler — @supabase/ssr@0.8.0 uses document.cookie API
        // natively via the `cookie` package. This avoids encoding conflicts between
        // our custom adapter's encodeURIComponent and Supabase SSR's base64url encoding.

        cookieOptions: {
            path: '/',
            sameSite: 'lax' as const,
            secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            debug: DEBUG,
        },
    }
);

/**
 * Auth event listener for logging and URL cleanup
 */
supabase.auth.onAuthStateChange((event, session) => {
    authLog(`Auth event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        provider: session?.user?.app_metadata?.provider,
    });

    if (event === 'SIGNED_IN') {
        authLog('Login successful');
        if (window.location.search.includes('code=')) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    if (event === 'TOKEN_REFRESHED') {
        authLog('Token refreshed');
    }

    if (event === 'SIGNED_OUT' && !session) {
        authLog('User signed out');
        const url = new URL(window.location.href);
        const hasStaleCode = url.searchParams.has('code');
        const hasStaleToken = window.location.hash.includes('access_token');
        if (hasStaleCode || hasStaleToken) {
            url.searchParams.delete('code');
            url.searchParams.delete('error');
            url.searchParams.delete('error_description');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }
});
