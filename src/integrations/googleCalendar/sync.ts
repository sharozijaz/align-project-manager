import type { Task } from "../../types/task";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { fetchGoogleEvents, syncTasksToGoogleCalendar } from "./googleCalendarClient";
import type { GoogleCalendarSyncOptions, GoogleCalendarSyncPreview } from "./types";

export function previewGoogleCalendarSync(tasks: Task[]): GoogleCalendarSyncPreview {
  const activeTasks = tasks.filter((task) => !task.deletedAt && !isTerminalTaskStatus(task.status));
  const syncableTasks = activeTasks.filter((task) => Boolean(validDateKey(task.dueDate))).length;

  return {
    syncableTasks,
    skippedTasks: activeTasks.length - syncableTasks,
    reason: syncableTasks
      ? `${syncableTasks} dated task${syncableTasks === 1 ? "" : "s"} can become Google Calendar events.`
      : "Add due dates to active tasks before syncing them to Google Calendar.",
  };
}

export async function syncLocalTasksWithGoogleCalendar(tasks: Task[], options: GoogleCalendarSyncOptions = {}) {
  const googleEvents = await fetchGoogleEvents();
  const result = await syncTasksToGoogleCalendar(tasks.map(normalizeTaskForGoogleCalendar), options);

  return {
    syncedTasks: result.created + result.updated,
    importedEvents: googleEvents.length,
    created: result.created,
    updated: result.updated,
    removed: result.removed,
    skipped: result.skipped,
    conflicts: result.conflicts,
    googleEvents,
  };
}

function normalizeTaskForGoogleCalendar(task: Task): Task {
  const dueDate = validDateKey(task.dueDate);
  const startDate = validDateKey(task.startDate);
  const dueTime = dueDate ? validTime(task.dueTime) : undefined;
  const startTime = startDate ? validTime(task.startTime) : undefined;
  const usableStartDate = startDate && dueDate && startDate <= dueDate ? startDate : undefined;

  return {
    ...task,
    dueDate,
    dueTime,
    startDate: usableStartDate,
    startTime: usableStartDate ? startTime : undefined,
  };
}

function validDateKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === value ? value : undefined;
}

function validTime(value?: string) {
  if (!value) return undefined;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/u);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
