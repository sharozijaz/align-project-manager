import type { CalendarEvent } from "../../types/calendar";
import type { Task } from "../../types/task";
import { appUrl, supabase } from "../supabase/client";
import { isTauriRuntime } from "../desktop/runtime";
import type { GoogleCalendarConnection, GoogleCalendarSyncOptions, GoogleCalendarSyncResult } from "../googleCalendar/types";

export interface GoogleSyncStatus {
  calendar: GoogleCalendarConnection;
}

export interface GoogleWorkspaceSyncPayload {
  tasks: Task[];
  calendar?: boolean;
  forceTaskIds?: GoogleCalendarSyncOptions["forceTaskIds"];
}

export interface GoogleWorkspaceSyncResult {
  calendar?: GoogleCalendarSyncResult & { events: CalendarEvent[] };
}

let statusCache: { status: GoogleSyncStatus; fetchedAt: number; includesLists: boolean } | null = null;

export function clearGoogleSyncStatusCache() {
  statusCache = null;
}

export async function getGoogleSyncStatus(options: { includeLists?: boolean; maxAgeMs?: number } = {}): Promise<GoogleSyncStatus> {
  const includeLists = Boolean(options.includeLists);
  const maxAgeMs = options.maxAgeMs ?? 0;

  if (
    statusCache &&
    maxAgeMs > 0 &&
    Date.now() - statusCache.fetchedAt < maxAgeMs &&
    (!includeLists || statusCache.includesLists)
  ) {
    return statusCache.status;
  }

  const token = await getAccessToken();
  const params = new URLSearchParams({ action: "status" });
  if (includeLists) params.set("includeLists", "1");
  const response = await fetch(apiEndpoint(`/api/google-sync?${params.toString()}`), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as Partial<GoogleSyncStatus> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not read Google sync status.");
  }

  const status = normalizeStatus(data);
  statusCache = { status, fetchedAt: Date.now(), includesLists: includeLists };
  return status;
}

export async function syncGoogleWorkspace(payload: GoogleWorkspaceSyncPayload): Promise<GoogleWorkspaceSyncResult> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-sync?action=sync"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tasks: payload.tasks,
      calendar: Boolean(payload.calendar),
      forceTaskIds: payload.forceTaskIds ?? [],
    }),
  });
  const data = (await response.json()) as Partial<GoogleWorkspaceSyncResult> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not sync Google workspace.");
  }

  clearGoogleSyncStatusCache();
  return {
    calendar: data.calendar ? normalizeCalendarResult(data.calendar) : undefined,
  };
}

function normalizeStatus(data: Partial<GoogleSyncStatus>): GoogleSyncStatus {
  return {
    calendar: {
      connected: Boolean(data.calendar?.connected),
      accountEmail: data.calendar?.accountEmail,
      calendarId: data.calendar?.calendarId,
      connectedAt: data.calendar?.connectedAt,
      expiresAt: data.calendar?.expiresAt,
      updatedAt: data.calendar?.updatedAt,
      scopes: data.calendar?.scopes ?? [],
    },
  };
}

function normalizeCalendarResult(result: Partial<GoogleCalendarSyncResult & { events: CalendarEvent[] }>) {
  return {
    created: result.created ?? 0,
    updated: result.updated ?? 0,
    removed: result.removed ?? 0,
    skipped: result.skipped ?? 0,
    conflicts: result.conflicts ?? [],
    events: result.events ?? [],
  };
}

function apiEndpoint(path: string) {
  if (!isTauriRuntime()) return path;

  if (!appUrl) {
    throw new Error("Hosted API URL is not configured. Add VITE_APP_URL before using Google sync from desktop.");
  }

  const baseUrl = appUrl;
  return new URL(path, baseUrl).toString();
}

async function getAccessToken() {
  if (!supabase) throw new Error("Sign in before using Google sync.");

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("Sign in before using Google sync.");

  return session.access_token;
}
