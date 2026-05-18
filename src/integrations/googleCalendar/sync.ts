import type { Task } from "../../types/task";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import type { GoogleCalendarSyncPreview } from "./types";

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

function validDateKey(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === value ? value : undefined;
}
