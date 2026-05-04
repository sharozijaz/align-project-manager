import type { Task } from "../../types/task";
import type { CalendarEvent } from "../../types/calendar";
import { appUrl, getAuthRedirectUrl, supabase } from "../supabase/client";
import { isTauriRuntime, openExternalUrl } from "../desktop/runtime";
import type {
  GoogleCalendarConfig,
  GoogleCalendarConnection,
  GoogleCalendarEvent,
  GoogleCalendarReadiness,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncResult,
} from "./types";

const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events.owned"];

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "server-managed",
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? getAuthRedirectUrl(),
    calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? "primary",
    scopes: GOOGLE_CALENDAR_SCOPES,
  };
}

export function getGoogleCalendarReadiness(): GoogleCalendarReadiness {
  const config = getGoogleCalendarConfig();
  const missing = [
    !config.redirectUri ? "VITE_GOOGLE_REDIRECT_URI or VITE_APP_URL" : "",
  ].filter(Boolean);

  return {
    ready: missing.length === 0,
    missing,
    config,
  };
}

export async function connectGoogleCalendar(): Promise<GoogleCalendarConnection> {
  const readiness = getGoogleCalendarReadiness();

  if (!readiness.ready) {
    throw new Error(`Google Calendar is missing configuration: ${readiness.missing.join(", ")}.`);
  }

  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-calendar/connect"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !data.url) {
    throw new Error(data.error || "Could not start Google Calendar connection.");
  }

  await openExternalUrl(data.url);
  return { connected: false };
}

export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnection> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-calendar/status"), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as GoogleCalendarConnection & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not read Google Calendar connection.");
  }

  return data;
}

export async function fetchGoogleEvents(): Promise<GoogleCalendarEvent[]> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-calendar/events"), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as { events?: CalendarEvent[]; error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not fetch Google Calendar events.");
  }

  return (data.events ?? []) as GoogleCalendarEvent[];
}

export async function syncTasksToGoogleCalendar(tasks: Task[], options: GoogleCalendarSyncOptions = {}): Promise<GoogleCalendarSyncResult> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-calendar/sync"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ tasks, forceTaskIds: options.forceTaskIds ?? [] }),
  });
  const data = (await response.json()) as Partial<GoogleCalendarSyncResult> & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not sync tasks to Google Calendar.");
  }

  return {
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    removed: data.removed ?? 0,
    skipped: data.skipped ?? 0,
    conflicts: data.conflicts ?? [],
  };
}

export async function syncTaskToGoogleCalendar(task: Task): Promise<void> {
  await syncTasksToGoogleCalendar([task]);
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(apiEndpoint("/api/google-calendar/disconnect"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Could not disconnect Google Calendar.");
  }
}

function apiEndpoint(path: string) {
  if (!isTauriRuntime()) return path;

  const baseUrl = appUrl || "https://align.sharoz.dev/";
  return new URL(path, baseUrl).toString();
}

async function getAccessToken() {
  if (!supabase) throw new Error("Sign in before connecting Google Calendar.");

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error("Sign in before connecting Google Calendar.");

  return session.access_token;
}
