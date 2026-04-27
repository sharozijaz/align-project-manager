import type { CalendarEvent } from "../../types/calendar";

export interface GoogleCalendarConnection {
  connected: boolean;
  accountEmail?: string;
  calendarId?: string;
  connectedAt?: string;
  expiresAt?: string;
  updatedAt?: string;
  scopes?: string[];
}

export interface GoogleCalendarEvent extends CalendarEvent {
  googleEventId?: string;
}

export interface GoogleCalendarConfig {
  clientId: string;
  redirectUri: string;
  calendarId: string;
  scopes: string[];
}

export interface GoogleCalendarReadiness {
  ready: boolean;
  missing: string[];
  config: GoogleCalendarConfig;
}

export interface GoogleCalendarSyncPreview {
  syncableTasks: number;
  skippedTasks: number;
  reason: string;
}

export interface GoogleCalendarSyncResult {
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  conflicts: GoogleCalendarConflict[];
}
import type { GoogleCalendarConflict } from "../../store/googleCalendarSyncStore";
