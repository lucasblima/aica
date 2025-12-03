// Re-export from centralized Supabase client
// All Supabase clients should use the single instance from src/services/supabaseClient.ts
// to prevent "Multiple GoTrueClient instances detected" warnings
export { supabase } from '../../services/supabaseClient';
