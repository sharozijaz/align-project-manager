import { differenceInCalendarDays, parseISO } from "date-fns";

export const TRASH_TASK_RETENTION_DAYS = 30;
export const TRASH_PROJECT_RETENTION_DAYS = 90;
export const AUTO_CLEANUP_DELETED_TASKS_KEY = "align-auto-cleanup-deleted-tasks-v1";
export const AUTO_CLEANUP_DELETED_PROJECTS_KEY = "align-auto-cleanup-deleted-projects-v1";

export function getTrashCleanupPreference(key: string) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(key) !== "false";
}

export function setTrashCleanupPreference(key: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, enabled ? "true" : "false");
}

export function deletedAgeDays(deletedAt?: string) {
  if (!deletedAt) return 0;

  const parsed = parseISO(deletedAt);
  if (Number.isNaN(parsed.getTime())) return 0;

  return Math.max(0, differenceInCalendarDays(new Date(), parsed));
}

export function isDeletedBeyondRetention(deletedAt: string | undefined, retentionDays: number) {
  return Boolean(deletedAt) && deletedAgeDays(deletedAt) >= retentionDays;
}

export function daysUntilPermanentDelete(deletedAt: string | undefined, retentionDays: number) {
  return Math.max(0, retentionDays - deletedAgeDays(deletedAt));
}
