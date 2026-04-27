export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  linkedTaskId?: string;
  source: "local" | "google";
}

export type CalendarEventInput = Omit<CalendarEvent, "id" | "source"> & {
  source?: CalendarEvent["source"];
};
