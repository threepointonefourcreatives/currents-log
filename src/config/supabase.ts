/**
 * Deprecated location. There must be exactly ONE Supabase client in the app,
 * configured with encrypted session storage — it lives in src/utils/supabase.ts.
 * (This file used to create a second client that stored tokens in plaintext.)
 */
export { supabase, isSupabaseConfigured } from '../utils/supabase';
