import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and anon public key
const supabaseUrl = 'https://gppebtrshbvuzatmebhr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcGVidHJzaGJ2dXphdG1lYmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjYzNTMsImV4cCI6MjA3NjkwMjM1M30.vY3EBXKTUj60TVwcDJonbEcOAfbUoO8BCRzuy1NErDw'; // replace with real anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
