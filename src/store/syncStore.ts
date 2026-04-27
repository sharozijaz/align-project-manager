import { create } from "zustand";

type SyncStateValue = "idle" | "pulling" | "pushing" | "synced" | "error";

interface SyncState {
  state: SyncStateValue;
  message: string;
  lastSyncedAt?: string;
  setSyncState: (state: SyncStateValue, message: string) => void;
  setSynced: (message?: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  state: "idle",
  message: "Cloud sync is ready.",
  lastSyncedAt: undefined,
  setSyncState: (state, message) => set({ state, message }),
  setSynced: (message = "Workspace synced.") =>
    set({ state: "synced", message, lastSyncedAt: new Date().toISOString() }),
}));
