import { appUrl, getAuthRedirectUrl, supabase } from "../supabase/client";
import { isTauriRuntime, openExternalUrl } from "../desktop/runtime";
import type {
  GoogleCalendarConfig,
  GoogleCalendarConnection,
  GoogleCalendarReadiness,
} from "./types";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/tasks",
];

function getGoogleCalendarConfig(): GoogleCalendarConfig {
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

  if (!appUrl) {
    throw new Error("Hosted API URL is not configured. Add VITE_APP_URL before using Google Calendar sync from desktop.");
  }

  const baseUrl = appUrl;
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
