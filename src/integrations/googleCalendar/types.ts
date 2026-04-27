import type { CalendarEvent } from "../../types/calendar";

export interface GoogleCalendarConnection {
  connected: boolean;
  accountEmail?: string;
  accessToken?: string;
}

export interface GoogleCalendarEvent extends CalendarEvent {
  googleEventId?: string;
}
