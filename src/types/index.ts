/**
 * ══════════════════════════════════════════════════════════════
 * PROJECT CURRENT — TypeScript Type Definitions
 * ══════════════════════════════════════════════════════════════
 */

// ─── Mood ────────────────────────────────────────────────────

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type SyncStatus = 'pending' | 'synced' | 'modified';

export type NotificationPreference = 'Morning' | 'Evening' | 'Custom' | 'None';

// ─── Database Models ─────────────────────────────────────────

/** Local + Remote log entry */
export interface LogEntry {
  id: string;               // UUID
  user_id: string;          // UUID FK
  date_logged: string;      // ISO timestamp
  mood_score: MoodScore;
  color_hex: string;
  note: string | null;
  sync_status: SyncStatus;  // LOCAL ONLY — not synced to Supabase
  created_at: string;
  updated_at: string;
}

/** Supabase user profile (cached locally) */
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  compass_quote: string | null;
  talisman_url: string | null;
  notification_preference: NotificationPreference;
  created_at?: string;
}

// ─── Navigation ──────────────────────────────────────────────

export type AppTab = 'daily' | 'flow' | 'surface' | 'logbook' | 'sanctuary';

// ─── Theme Types ─────────────────────────────────────────────

export type CanvasMode = 'light' | 'dark';

export interface InnerShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface IndentShadowSet {
  topLeft: InnerShadow;
  bottomRight: InnerShadow;
  outerShadow: null;  // Always null — strictly zero
}
