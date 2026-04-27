import type { Task } from "../../types/task";
import { fetchGoogleEvents, syncTasksToGoogleCalendar } from "./googleCalendarClient";
import type { GoogleCalendarSyncPreview } from "./types";

export function previewGoogleCalendarSync(tasks: Task[]): GoogleCalendarSyncPreview {
  const activeTasks = tasks.filter((task) => !task.deletedAt && task.status !== "completed");
  const syncableTasks = activeTasks.filter((task) => Boolean(task.dueDate)).length;

  return {
    syncableTasks,
    skippedTasks: activeTasks.length - syncableTasks,
    reason: syncableTasks
      ? `${syncableTasks} dated task${syncableTasks === 1 ? "" : "s"} can become Google Calendar events.`
      : "Add due dates to active tasks before syncing them to Google Calendar.",
  };
}

export async function syncLocalTasksWithGoogleCalendar(tasks: Task[]) {
  const googleEvents = await fetchGoogleEvents();
  const result = await syncTasksToGoogleCalendar(tasks);

  return {
    syncedTasks: result.created + result.updated,
    importedEvents: googleEvents.length,
    created: result.created,
    updated: result.updated,
    removed: result.removed,
    skipped: result.skipped,
    googleEvents,
  };
}
