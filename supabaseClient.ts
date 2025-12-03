/**
 * Centralized Supabase Client
 *
 * This file re-exports the single Supabase client instance from src/services/supabaseClient.ts
 *
 * Purpose: Prevent "Multiple GoTrueClient instances detected" warnings by ensuring
 * only one Supabase client is created across the entire application.
 *
 * Usage:
 *   import { supabase } from './supabaseClient';
 *   // or
 *   import { supabase } from './src/services/supabaseClient';
 *
 * Both imports refer to the same singleton instance.
 */

export { supabase } from './src/services/supabaseClient';
