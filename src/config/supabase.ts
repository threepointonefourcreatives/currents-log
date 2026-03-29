/**
 * ══════════════════════════════════════════════════════════════
 * Supabase Client Configuration
 * Reads credentials from environment variables.
 * Auth sessions are persisted via expo-sqlite localStorage polyfill.
 * ══════════════════════════════════════════════════════════════
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Import expo-sqlite localStorage polyfill for auth persistence
import 'expo-sqlite/localStorage/install';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Current] Supabase credentials not found. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env. ' +
    'Running in offline-only mode.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Check if Supabase is properly configured (not placeholders).
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};
