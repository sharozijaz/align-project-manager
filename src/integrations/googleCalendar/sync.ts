import type { Task } from "../../types/task";
import { fetchGoogleEvents, syncTaskToGoogleCalendar } from "./googleCalendarClient";

export async function syncLocalTasksWithGoogleCalendar(tasks: Task[]) {
  const googleEvents = await fetchGoogleEvents();
  const datedTasks = tasks.filter((task) => task.dueDate && task.status !== "completed");

  await Promise.all(datedTasks.map((task) => syncTaskToGoogleCalendar(task)));
  return { syncedTasks: datedTasks.length, importedEvents: googleEvents.length };
}
