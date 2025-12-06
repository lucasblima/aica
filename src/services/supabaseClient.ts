import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing in environment variables.');
}

// Single Supabase client instance for the entire application
// This prevents "Multiple GoTrueClient instances detected" warnings
export const supabase = createClient(
    supabaseUrl || '',
    supabaseKey || '',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            // Configura para lidar graciosamente com sessões expiradas
            onAuthStateChange: (event, session) => {
                if (event === 'TOKEN_REFRESHED') {
                    console.log('[Supabase] ✅ Token renovado com sucesso');
                }
                if (event === 'SIGNED_OUT' && !session) {
                    // Limpa a URL de parâmetros OAuth antigos após sign out
                    if (window.location.hash.includes('access_token')) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
            }
        }
    }
);
