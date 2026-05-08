import { appUrl, getAuthRedirectUrl, supabase } from "../supabase/client";
import { isTauriRuntime } from "../desktop/runtime";
import type {
  GoogleTasksBridgeSettings,
  GoogleTasksBridgeStatus,
  GoogleTasksBridgeSyncPayload,
  GoogleTasksBridgeSyncResult,
} from "./types";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export function getGoogleTasksBridgeReadiness() {
  const missing = [!getAuthRedirectUrl() ? "VITE_GOOGLE_REDIRECT_URI or VITE_APP_URL" : ""].filter(Boolean);

  return {
    ready: missing.length === 0,
    missing,
    scope: GOOGLE_TASKS_SCOPE,
  };
}

export async function getGoogleTasksBridgeStatus(): Promise<GoogleTasksBridgeStatus> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-tasks/status"), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as Partial<GoogleTasksBridgeStatus> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not read Google Tasks bridge status.");
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

export async function saveGoogleTasksBridgeSettings(settings: GoogleTasksBridgeSettings): Promise<GoogleTasksBridgeSettings> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-tasks/settings"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  const data = (await response.json()) as { settings?: GoogleTasksBridgeSettings; error?: string };

  if (!response.ok || !data.settings) {
    throw new Error(data.error || "Could not save Google Tasks bridge settings.");
  }

  return normalizeSettings(data.settings);
}

export async function syncGoogleTasksBridge(payload: GoogleTasksBridgeSyncPayload): Promise<GoogleTasksBridgeSyncResult> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-tasks/sync"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as Partial<GoogleTasksBridgeSyncResult> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not sync Google Tasks bridge.");
  }

  return {
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    removed: data.removed ?? 0,
    skipped: data.skipped ?? 0,
    imported: data.imported ?? 0,
    importedTasks: data.importedTasks ?? [],
    importConflicts: data.importConflicts ?? [],
    settings: normalizeSettings(data.settings),
    lists: data.lists ?? [],
  };
}

function normalizeSettings(settings: Partial<GoogleTasksBridgeSettings> | undefined): GoogleTasksBridgeSettings {
  return {
    enabled: Boolean(settings?.enabled),
    todayListId: settings?.todayListId ?? "",
    inboxListId: settings?.inboxListId ?? "",
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
