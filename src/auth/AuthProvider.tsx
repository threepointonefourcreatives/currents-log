/**
 * AuthProvider — single source of truth for "is someone signed in?".
 *
 * The session comes from Supabase and is verified by Supabase's servers when it
 * is issued and refreshed. Nothing a user can type into a URL, deep link
 * (current://...), query parameter or route param can change it.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { logger } from '../utils/logger';

type AuthState = {
  session: Session | null;
  /** True until the stored session (if any) has been read and checked. */
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session ?? null);
      })
      .catch((err) => logger.warn('[Auth] Could not restore session', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) setSession(next ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          setSession(null);
        }
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
