import { createClient } from '@supabase/supabase-js';

// Anon key is a public credential — safe to ship in client code.
// Env vars take precedence; hardcoded values are the fallback so uploads
// work even when VITE_* vars are not yet set in Vercel.
const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    'https://fsocxpoojglxedazllrk.supabase.co';
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb2N4cG9vamdseGVkYXpsbHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODQ3MDAsImV4cCI6MjA4ODc2MDcwMH0.5z1ggqSvBId6PTF9mpjaKcwz4S2Q3Tv38x3R3sPRTZQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = () => true;
