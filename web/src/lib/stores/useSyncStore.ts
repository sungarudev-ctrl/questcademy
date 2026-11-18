import { create } from "zustand";

export interface OfflineAttempt {
  id: string;
  node_id: string;
  item_id: string;
  selected_option_id?: string;
  correct: boolean;
  hints_used: number;
  latency_ms: number;
  timestamp: string;
}

interface SyncState {
  isOnline: boolean;
  pendingAttempts: OfflineAttempt[];
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;

  setOnline: (isOnline: boolean) => void;
  enqueueAttempt: (attempt: Omit<OfflineAttempt, "id" | "timestamp">) => void;
  replayQueue: () => Promise<{ replayed: number; success: boolean }>;
  clearQueue: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingAttempts: [],
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,

  setOnline: (isOnline) => {
    set({ isOnline });
    if (isOnline && get().pendingAttempts.length > 0) {
      get().replayQueue();
    }
  },

  enqueueAttempt: (attempt) => {
    const record: OfflineAttempt = {
      ...attempt,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      pendingAttempts: [...state.pendingAttempts, record],
    }));
  },

  replayQueue: async () => {
    const queue = [...get().pendingAttempts];
    if (queue.length === 0) return { replayed: 0, success: true };

    set({ isSyncing: true, syncError: null });

    try {
      // In production, POST /api/learners/attempts/sync
      // Simulated sequential replay with ordered processing
      await new Promise((resolve) => setTimeout(resolve, 600));

      set({
        pendingAttempts: [],
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      });
      return { replayed: queue.length, success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync replay failed";
      set({ isSyncing: false, syncError: msg });
      return { replayed: 0, success: false };
    }
  },

  clearQueue: () => set({ pendingAttempts: [] }),
}));
