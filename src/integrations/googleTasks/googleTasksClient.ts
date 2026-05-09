import { appUrl, getAuthRedirectUrl, supabase } from "../supabase/client";
import { isTauriRuntime } from "../desktop/runtime";
import type {
  GoogleTodoSyncSettings,
  GoogleTodoSyncStatus,
  GoogleTodoSyncPayload,
  GoogleTodoSyncResult,
} from "./types";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export function getGoogleTodoSyncReadiness() {
  const missing = [!getAuthRedirectUrl() ? "VITE_GOOGLE_REDIRECT_URI or VITE_APP_URL" : ""].filter(Boolean);

  return {
    ready: missing.length === 0,
    missing,
    scope: GOOGLE_TASKS_SCOPE,
  };
}

export async function getGoogleTodoSyncStatus(): Promise<GoogleTodoSyncStatus> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-todos/status"), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as Partial<GoogleTodoSyncStatus> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not read Google Todo sync status.");
  }

  return {
    connected: Boolean(data.connected),
    needsReconnect: Boolean(data.needsReconnect),
    scopes: data.scopes ?? [],
    lists: data.lists ?? [],
    settings: normalizeSettings(data.settings),
    accountEmail: data.accountEmail,
    updatedAt: data.updatedAt,
  };
}

export async function saveGoogleTodoSyncSettings(settings: GoogleTodoSyncSettings): Promise<GoogleTodoSyncSettings> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-todos/settings"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  const data = (await response.json()) as { settings?: GoogleTodoSyncSettings; error?: string };

  if (!response.ok || !data.settings) {
    throw new Error(data.error || "Could not save Google Todo sync settings.");
  }

  return normalizeSettings(data.settings);
}

export async function syncGoogleTodos(payload: GoogleTodoSyncPayload): Promise<GoogleTodoSyncResult> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-todos/sync"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as Partial<GoogleTodoSyncResult> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not sync Google Todos.");
  }

  return {
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    removed: data.removed ?? 0,
    skipped: data.skipped ?? 0,
    imported: data.imported ?? 0,
    changedTasks: data.changedTasks ?? [],
    settings: normalizeSettings(data.settings),
    lists: data.lists ?? [],
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
  if (!supabase) throw new Error("Sign in before connecting Google Tasks.");

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("Sign in before connecting Google Tasks.");

  return session.access_token;
}
