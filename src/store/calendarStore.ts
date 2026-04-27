import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalendarEvent, CalendarEventInput } from "../types/calendar";

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (input: CalendarEventInput) => void;
  updateEvent: (id: string, updates: Partial<CalendarEventInput>) => void;
  deleteEvent: (id: string) => void;
  replaceEvents: (events: CalendarEvent[]) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (input) =>
        set((state) => ({
          events: [{ ...input, id: crypto.randomUUID(), source: input.source ?? "local" }, ...state.events],
        })),
      updateEvent: (eventId, updates) =>
        set((state) => ({
          events: state.events.map((event) => (event.id === eventId ? { ...event, ...updates } : event)),
        })),
      deleteEvent: (eventId) =>
        set((state) => ({ events: state.events.filter((event) => event.id !== eventId) })),
      replaceEvents: (events) => set({ events }),
    }),
    { name: "priority-calendar-v1" },
  ),
);
