import { create } from "zustand";

export interface GoogleCalendarConflict {
  taskId: string;
  taskTitle: string;
  googleEventId: string;
  googleUpdatedAt: string;
}

export interface GoogleCalendarSyncSummary {
  created: number;
  updated: number;
  removed: number;
  importedEvents: number;
  conflicts: GoogleCalendarConflict[];
}

export interface GoogleCalendarSyncHistoryItem extends GoogleCalendarSyncSummary {
  id: string;
  syncedAt: string;
  mode: "manual" | "auto";
}

interface GoogleCalendarSyncState {
  status: "idle" | "checking" | "syncing" | "synced" | "error";
  message: string;
  lastSyncedAt?: string;
  lastSummary?: GoogleCalendarSyncSummary;
  history: GoogleCalendarSyncHistoryItem[];
  setStatus: (status: GoogleCalendarSyncState["status"], message: string) => void;
  recordSuccess: (summary: GoogleCalendarSyncSummary, mode: GoogleCalendarSyncHistoryItem["mode"]) => void;
  recordError: (message: string) => void;
}

export const useGoogleCalendarSyncStore = create<GoogleCalendarSyncState>((set) => ({
  status: "idle",
  message: "Google Calendar sync is ready.",
  lastSyncedAt: undefined,
  lastSummary: undefined,
  history: [],
  setStatus: (status, message) => set({ status, message }),
  recordSuccess: (summary, mode) =>
    set((state) => {
      const syncedAt = new Date().toISOString();
      const item = {
        ...summary,
        id: crypto.randomUUID(),
        syncedAt,
        mode,
      };

      return {
        status: "synced",
        message: summary.conflicts.length
          ? `Synced with ${summary.conflicts.length} Google edit conflict${summary.conflicts.length === 1 ? "" : "s"}.`
          : "Google Calendar synced.",
        lastSyncedAt: syncedAt,
        lastSummary: summary,
        history: [item, ...state.history].slice(0, 8),
      };
    }),
  recordError: (message) => set({ status: "error", message }),
}));
