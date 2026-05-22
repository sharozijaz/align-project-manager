import { create } from "zustand";
import { persist } from "zustand/middleware";

type SyncStateValue = "idle" | "pulling" | "pushing" | "synced" | "error";
export type SyncMode = "cloud" | "paused" | "local";

interface SyncState {
  state: SyncStateValue;
  mode: SyncMode;
  message: string;
  lastSyncedAt?: string;
  setMode: (mode: SyncMode) => void;
  setSyncState: (state: SyncStateValue, message: string) => void;
  setSynced: (message?: string) => void;
}

export const syncModeOptions: Array<{ value: SyncMode; label: string; description: string }> = [
  { value: "cloud", label: "Cloud sync", description: "Automatically download and upload workspace changes when signed in." },
  { value: "paused", label: "Paused", description: "Stay signed in, but use manual upload and download controls." },
  { value: "local", label: "Local only", description: "Keep data on this device and block Supabase upload/download." },
];

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      state: "idle",
      mode: "cloud",
      message: "Cloud sync is ready.",
      lastSyncedAt: undefined,
      setMode: (mode) =>
        set({
          mode,
          state: "idle",
          message:
            mode === "cloud"
              ? "Cloud sync is ready."
              : mode === "paused"
                ? "Cloud sync is paused. Manual upload and download are still available."
                : "Local-only mode is active. Cloud upload and download are disabled.",
        }),
      setSyncState: (state, message) => set({ state, message }),
      setSynced: (message = "Workspace synced.") =>
        set({ state: "synced", message, lastSyncedAt: new Date().toISOString() }),
    }),
    {
      name: "align-sync-preferences-v1",
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
