import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { secureSessionStorage } from './secureSessionStorage';
import { logger } from './logger';

/*
 * SECURITY NOTE — read before changing anything here.
 *
 * Anything prefixed EXPO_PUBLIC_ is compiled into the app in plain text: anyone
 * can unzip the APK and read it. That is fine for these two values, because the
 * Supabase *anon* key is designed to be public. What protects your data is
 * Row Level Security in the database (see supabase/security.sql), not hiding
 * this key.
 *
 * NEVER put the service_role key (or any other secret) in an EXPO_PUBLIC_
 * variable or anywhere in this app. scripts/check-public-env.mjs blocks the
 * build if you do.
 */
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

/**
 * True only when real credentials were baked into this build.
 * In EAS builds the local .env is NOT uploaded (it's in .gitignore), so the
 * values must come from EAS environment variables (see eas.json "environment").
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 0;

if (!isSupabaseConfigured) {
  logger.warn(
    '⚠️ Supabase URL or Anon Key is missing from this build. ' +
      'Locally: check frontend/.env. EAS builds: set them with `eas env:push` for the build environment.'
  );
}

// createClient() THROWS ("supabaseUrl is required.") when given an empty URL.
// Because this module is imported by the first screen, that throw used to kill
// the app on launch. Fall back to a harmless placeholder so the app always opens;
// auth calls are guarded with isSupabaseConfigured instead.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://not-configured.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'not-configured',
  {
    auth: {
      // Tokens are encrypted with a Keystore-held key (see secureSessionStorage.ts).
      storage: secureSessionStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: true,
      // Never accept a session from a URL / deep link: OTP codes only.
      detectSessionInUrl: false,
    },
  }
);

// Supabase's recommended React Native setup: only refresh tokens while the app
// is in the foreground.
if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'Sign-in is not available in this build because the Supabase settings were not included. ' +
  'Rebuild the app after adding EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to EAS.';

/** Very small sanity check before we ask Supabase to email a code. */
export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}
