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
        }
    }
);
