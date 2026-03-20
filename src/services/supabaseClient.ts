import { createBrowserClient } from '@supabase/ssr';

// Re-export commonly used Supabase types so modules import from here
// instead of directly from @supabase/supabase-js
export type { Session, User, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('[SupabaseClient] Supabase URL or Key is missing in environment variables.');
}

const DEBUG = import.meta.env.DEV;

function authLog(message: string, data?: unknown) {
    if (DEBUG) {
        // eslint-disable-next-line no-console -- debug-only auth logging behind DEV flag
        console.debug(`[SupabaseClient] [Supabase Auth] ${message}`, data ?? '');
    }
}

/**
 * One-time cleanup of legacy auth cookies from the old custom cookieStorageAdapter.
 *
 * The old adapter used encodeURIComponent encoding, while @supabase/ssr@0.8.0
 * uses base64url encoding with a "base64-" prefix. Stale cookies from the old
 * format cause PKCE code_verifier mismatches → 401 on token exchange.
 *
 * This runs once per browser (tracked via localStorage flag) and clears ALL
 * sb-* auth cookies so Supabase can start fresh with the correct encoding.
 */
function cleanupLegacyCookies(): void {
    const CLEANUP_KEY = 'aica_cookie_adapter_v2_migrated';
    try {
        if (localStorage.getItem(CLEANUP_KEY)) return;

        // Skip cleanup on OAuth callback — we need the code_verifier cookie intact
        if (window.location.search.includes('code=')) {
            authLog('Skipping legacy cookie cleanup on OAuth callback');
            return;
        }

        const allCookies = document.cookie.split(';').map(c => c.trim());
        const sbCookies = allCookies.filter(c => c.startsWith('sb-'));

        if (sbCookies.length > 0) {
            authLog(`Cleaning ${sbCookies.length} legacy sb-* cookies`);
            for (const cookie of sbCookies) {
                const name = cookie.split('=')[0];
                // Delete by setting maxAge=0 for both / and current path
                document.cookie = `${name}=; path=/; max-age=0`;
                document.cookie = `${name}=; max-age=0`;
            }
        }

        localStorage.setItem(CLEANUP_KEY, Date.now().toString());
    } catch {
        // localStorage or cookie access may fail in some contexts — non-blocking
    }
}

// Run cleanup BEFORE creating the Supabase client
cleanupLegacyCookies();

/**
 * No-op lock that bypasses navigator.locks.
 *
 * Some browsers return null from LockManager.request(), causing gotrue-js
 * to loop with warnings and fail to complete auth operations.
 * Safe for single-tab session management.
 */
function noOpLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    return fn();
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
            // Bypass navigator.locks — some browsers (Chrome on certain configs)
            // return null from LockManager.request(), causing gotrue-js to loop
            // with warnings and fail to complete auth operations.
            // This no-op lock is safe for single-tab session management.
            lock: noOpLock,
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
