import type { CalendarEvent } from "../../types/calendar";
import type { Task } from "../../types/task";
import { appUrl, supabase } from "../supabase/client";
import { isTauriRuntime } from "../desktop/runtime";
import type { GoogleCalendarConnection, GoogleCalendarSyncOptions, GoogleCalendarSyncResult } from "../googleCalendar/types";
import type { GoogleTodoSyncResult, GoogleTodoSyncSettings, GoogleTodoSyncStatus } from "../googleTasks/types";

export interface GoogleSyncStatus {
  calendar: GoogleCalendarConnection;
  todos: GoogleTodoSyncStatus;
}

export interface GoogleWorkspaceSyncPayload {
  tasks: Task[];
  settings?: GoogleTodoSyncSettings;
  calendar?: boolean;
  todos?: boolean;
  forceTaskIds?: GoogleCalendarSyncOptions["forceTaskIds"];
}

export interface GoogleWorkspaceSyncResult {
  calendar?: GoogleCalendarSyncResult & { events: CalendarEvent[] };
  todos?: GoogleTodoSyncResult;
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

export async function saveGoogleSyncSettings(settings: GoogleTodoSyncSettings): Promise<GoogleTodoSyncSettings> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-sync?action=settings"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  const data = (await response.json()) as { settings?: GoogleTodoSyncSettings; error?: string };

  if (!response.ok || !data.settings) {
    throw new Error(data.error || "Could not save Google sync settings.");
  }

  clearGoogleSyncStatusCache();
  return normalizeSettings(data.settings);
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
      settings: payload.settings,
      calendar: Boolean(payload.calendar),
      todos: Boolean(payload.todos),
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
    todos: data.todos ? normalizeTodoResult(data.todos) : undefined,
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
    todos: {
      connected: Boolean(data.todos?.connected),
      needsReconnect: Boolean(data.todos?.needsReconnect),
      scopes: data.todos?.scopes ?? [],
      lists: data.todos?.lists ?? [],
      settings: normalizeSettings(data.todos?.settings),
      accountEmail: data.todos?.accountEmail,
      updatedAt: data.todos?.updatedAt,
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

function normalizeTodoResult(result: Partial<GoogleTodoSyncResult>): GoogleTodoSyncResult {
  return {
    created: result.created ?? 0,
    updated: result.updated ?? 0,
    removed: result.removed ?? 0,
    skipped: result.skipped ?? 0,
    imported: result.imported ?? 0,
    changedTasks: result.changedTasks ?? [],
    settings: normalizeSettings(result.settings),
    lists: result.lists ?? [],
  };
}

function normalizeSettings(settings: Partial<GoogleTodoSyncSettings> | undefined): GoogleTodoSyncSettings {
  return {
    enabled: Boolean(settings?.enabled),
    todoListId: settings?.todoListId ?? "",
    lastSyncedAt: settings?.lastSyncedAt,
    lastError: settings?.lastError,
    updatedAt: settings?.updatedAt,
  };
}

function apiEndpoint(path: string) {
  if (!isTauriRuntime()) return path;

  const baseUrl = appUrl || "https://align.sharoz.dev/";
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
