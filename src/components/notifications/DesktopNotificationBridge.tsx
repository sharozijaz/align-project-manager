import { useCallback, useEffect } from "react";
import { isTerminalTaskStatus, normalizeTaskReminder } from "../../config/taskOptions";
import {
  canUseDesktopNotifications,
  getDesktopNotificationsEnabled,
  sendDesktopNotification,
  setDesktopReminderHeartbeat,
} from "../../integrations/desktop/notifications";
import { useTaskStore } from "../../store/taskStore";
import type { Task } from "../../types/task";

const SENT_NOTIFICATIONS_KEY = "align.desktopNotifications.sentIds";
const MAX_SENT_IDS = 120;
const POLL_INTERVAL_MS = 30_000;
const MAX_MISSED_REMINDER_AGE_MS = 36 * 60 * 60 * 1000;

function readSentIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SENT_NOTIFICATIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberSentIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).slice(-MAX_SENT_IDS);
  window.localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(uniqueIds));
}

export function DesktopNotificationBridge() {
  const tasks = useTaskStore((state) => state.tasks);
  const canLoad = canUseDesktopNotifications();

  const checkForNotifications = useCallback(async () => {
    if (!canLoad) return;

    if (!getDesktopNotificationsEnabled()) {
      setDesktopReminderHeartbeat({
        checkedAt: new Date().toISOString(),
        status: "disabled",
        sentCount: 0,
        message: "Desktop reminders are paused on this PC.",
      });
      return;
    }

    try {
      const now = new Date();
      const sentIds = readSentIds();
      const dueNotifications = tasks
        .map((task) => buildDesktopReminder(task, now))
        .filter((item): item is DesktopReminder => Boolean(item))
        .filter((item) => !sentIds.includes(item.id))
        .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

      if (!dueNotifications.length) {
        setDesktopReminderHeartbeat({
          checkedAt: now.toISOString(),
          status: "idle",
          sentCount: 0,
          message: "Checked reminders. Nothing due right now.",
        });
        return;
      }

      const nextSentIds = [...sentIds];
      let sentCount = 0;
      for (const item of dueNotifications) {
        const sent = await sendDesktopNotification(item.title, item.message);
        if (sent) {
          nextSentIds.push(item.id);
          sentCount += 1;
        }
      }

      rememberSentIds(nextSentIds);
      setDesktopReminderHeartbeat({
        checkedAt: now.toISOString(),
        status: sentCount > 0 ? "sent" : "error",
        sentCount,
        message: sentCount > 0 ? `${sentCount} desktop reminder${sentCount === 1 ? "" : "s"} sent.` : "No reminders could be delivered.",
      });
    } catch (error) {
      setDesktopReminderHeartbeat({
        checkedAt: new Date().toISOString(),
        status: "error",
        sentCount: 0,
        message: error instanceof Error ? error.message : "Desktop reminder check failed.",
      });
      // Desktop toasts should never interrupt the app if Windows notification delivery fails.
    }
  }, [canLoad, tasks]);

  useEffect(() => {
    void checkForNotifications();
    if (!canLoad) return;

    const interval = window.setInterval(() => void checkForNotifications(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [canLoad, checkForNotifications]);

  return null;
}

interface DesktopReminder {
  id: string;
  title: string;
  message: string;
  scheduledFor: Date;
}

function buildDesktopReminder(task: Task, now: Date): DesktopReminder | null {
  if (!task.dueDate || task.deletedAt || isTerminalTaskStatus(task.status)) return null;

  const reminder = normalizeTaskReminder(task.reminder);
  const offsetDays = reminderOffsetDays(reminder);
  if (offsetDays === null) return null;

  const scheduledFor = scheduledReminderDate(task.dueDate, task.dueTime, offsetDays);
  if (!scheduledFor) return null;

  const age = now.getTime() - scheduledFor.getTime();
  if (age < 0 || age > MAX_MISSED_REMINDER_AGE_MS) return null;

  return {
    id: `${task.id}:${reminder}:${task.dueDate}:${normalizeTime(task.dueTime || "09:00")}`,
    title: `Reminder: ${task.title}`,
    message: reminderMessage(task, now),
    scheduledFor,
  };
}

function scheduledReminderDate(dueDate: string, dueTime: string | undefined, offsetDays: number) {
  const time = normalizeTime(dueTime || "09:00");
  const scheduledFor = new Date(`${dueDate}T${time}:00`);
  if (Number.isNaN(scheduledFor.getTime())) return null;
  scheduledFor.setDate(scheduledFor.getDate() - offsetDays);
  return scheduledFor;
}

function normalizeTime(time: string) {
  return /^\d{2}:\d{2}$/u.test(time) ? time : "09:00";
}

function reminderOffsetDays(reminder: Task["reminder"]) {
  if (reminder === "due-date") return 0;
  if (reminder === "day-before") return 1;
  if (reminder === "two-days-before") return 2;
  if (reminder === "week-before") return 7;
  return null;
}

function reminderMessage(task: Task, now: Date) {
  const dueDate = new Date(`${task.dueDate}T${normalizeTime(task.dueTime || "09:00")}:00`);
  const dueLabel = Number.isNaN(dueDate.getTime())
    ? task.dueDate
    : dueDate.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  if (task.dueDate === dateKey(now)) return `${task.title} is due today at ${timeLabel(task.dueTime)}.`;
  return `${task.title} is due ${dueLabel}.`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeLabel(time: string | undefined) {
  const normalized = normalizeTime(time || "09:00");
  const date = new Date(`2000-01-01T${normalized}:00`);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
