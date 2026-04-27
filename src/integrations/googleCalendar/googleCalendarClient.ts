import type { Task } from "../../types/task";
import { getAuthRedirectUrl } from "../supabase/client";
import type {
  GoogleCalendarConfig,
  GoogleCalendarConnection,
  GoogleCalendarEvent,
  GoogleCalendarReadiness,
} from "./types";

const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events.owned"];

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? getAuthRedirectUrl(),
    calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID ?? "primary",
    scopes: GOOGLE_CALENDAR_SCOPES,
  };
}

export function getGoogleCalendarReadiness(): GoogleCalendarReadiness {
  const config = getGoogleCalendarConfig();
  const missing = [
    !config.clientId ? "VITE_GOOGLE_CLIENT_ID" : "",
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

  throw new Error(
    "Google Calendar OAuth needs a backend or serverless callback to exchange the authorization code and store tokens safely.",
  );
}

export async function fetchGoogleEvents(): Promise<GoogleCalendarEvent[]> {
  // Future serverless flow: call Calendar API events.list with a backend-held OAuth token.
  return [];
}

export async function syncTaskToGoogleCalendar(_task: Task): Promise<void> {
  // Future serverless flow: map Task fields to Calendar API events.insert/events.update payloads.
}

export async function disconnectGoogleCalendar(): Promise<void> {
  // Future serverless flow: revoke Google tokens and clear stored connection metadata.
}
