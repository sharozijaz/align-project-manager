import type { Task } from "../../types/task";
import { fetchGoogleEvents, syncTaskToGoogleCalendar } from "./googleCalendarClient";
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
  const datedTasks = tasks.filter((task) => !task.deletedAt && task.dueDate && task.status !== "completed");

  await Promise.all(datedTasks.map((task) => syncTaskToGoogleCalendar(task)));
  return { syncedTasks: datedTasks.length, importedEvents: googleEvents.length };
}
