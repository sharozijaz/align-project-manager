import type { Task } from "../../types/task";
import type { GoogleCalendarConnection, GoogleCalendarEvent } from "./types";

export async function connectGoogleCalendar(): Promise<GoogleCalendarConnection> {
  // Add Google OAuth client ID, scopes, and token exchange here when backend/auth exists.
  return { connected: false };
}

export async function fetchGoogleEvents(): Promise<GoogleCalendarEvent[]> {
  // Use the Google Calendar API events.list endpoint after OAuth is connected.
  return [];
}

export async function syncTaskToGoogleCalendar(_task: Task): Promise<void> {
  // Map Task fields to Google Calendar event payloads and call events.insert/update here.
}

export async function disconnectGoogleCalendar(): Promise<void> {
  // Revoke tokens and clear saved calendar connection metadata here.
}
