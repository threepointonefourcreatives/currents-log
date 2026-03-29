/**
 * ══════════════════════════════════════════════════════════════
 * Zustand Store — Sync Queue & App State
 * Manages offline-first sync queue and local UI state.
 * ══════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced' | 'modified';
export type NotificationPreference = 'Morning' | 'Evening' | 'Custom' | 'None';

export interface LogEntry {
  id: string;
  userId: string;
  dateLogged: string;
  moodScore: number;      // 1–5
  colorHex: string;
  note: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  compassQuote: string | null;
  talismanUrl: string | null;
  notificationPreference: NotificationPreference;
}

// ─── Store Interface ─────────────────────────────────────────

interface SyncStoreState {
  // Connection state
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;

  // User
  user: UserProfile | null;
  isAuthenticated: boolean;

  // Pending sync queue count
  pendingCount: number;

  // Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSync: (timestamp: string) => void;
  setUser: (user: UserProfile | null) => void;
  setPendingCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  reset: () => void;
}

// ─── Store ───────────────────────────────────────────────────

const initialState = {
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  user: null,
  isAuthenticated: false,
  pendingCount: 0,
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...initialState,

  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSync: (timestamp) => set({ lastSyncAt: timestamp }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setPendingCount: (count) => set({ pendingCount: count }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),

  reset: () => set(initialState),
}));
