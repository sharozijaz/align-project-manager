import type { AppNotification } from "../../types/notification";
import { errorMessage } from "../../utils/errors";
import { supabase } from "./client";

const requireClient = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
};

const rowToNotification = (row: {
  id: string;
  task_id: string | null;
  type: "task-reminder";
  title: string;
  message: string;
  scheduled_for: string;
  read_at: string | null;
  email_sent_at?: string | null;
  email_error?: string | null;
  created_at: string;
}): AppNotification => ({
  id: row.id,
  taskId: row.task_id || undefined,
  type: row.type,
  title: row.title,
  message: row.message,
  scheduledFor: row.scheduled_for,
  readAt: row.read_at || undefined,
  emailSentAt: row.email_sent_at || undefined,
  emailError: row.email_error || undefined,
  createdAt: row.created_at,
});

const READ_NOTIFICATION_VISIBLE_DAYS = 7;
const READ_NOTIFICATION_RETENTION_DAYS = 30;

export async function fetchNotifications(limit = 20) {
  const client = requireClient();
  const visibleReadAfter = new Date(Date.now() - READ_NOTIFICATION_VISIBLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const query = client
    .from("notifications")
    .select("id,task_id,type,title,message,scheduled_for,read_at,email_sent_at,email_error,created_at")
    .lte("scheduled_for", new Date().toISOString())
    .or(`read_at.is.null,read_at.gte.${visibleReadAfter}`)
    .order("scheduled_for", { ascending: false })
    .limit(limit);
  let { data, error } = await query;

  if (error && error.message.toLowerCase().includes("email_")) {
    const fallback = await client
      .from("notifications")
      .select("id,task_id,type,title,message,scheduled_for,read_at,created_at")
      .lte("scheduled_for", new Date().toISOString())
      .or(`read_at.is.null,read_at.gte.${visibleReadAfter}`)
      .order("scheduled_for", { ascending: false })
      .limit(limit);

    if (fallback.error) throw new Error(errorMessage(fallback.error, "Could not load notifications."));
    return sortNotifications((fallback.data ?? []).map(rowToNotification));
  }

  if (error) throw new Error(errorMessage(error, "Could not load notifications."));

  return sortNotifications((data ?? []).map(rowToNotification));
}

export async function markNotificationRead(id: string) {
  const client = requireClient();
  const { error } = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);

  if (error) throw new Error(errorMessage(error, "Could not update notification."));
}

export async function markAllNotificationsRead() {
  const client = requireClient();
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) throw new Error(errorMessage(error, "Could not update notifications."));
}

export async function clearReadNotifications() {
  const client = requireClient();
  const { error } = await client.from("notifications").delete().not("read_at", "is", null);

  if (error) throw new Error(errorMessage(error, "Could not clear read notifications."));
}

export async function deleteOldReadNotifications() {
  const client = requireClient();
  const retentionDate = new Date(Date.now() - READ_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client.from("notifications").delete().not("read_at", "is", null).lt("read_at", retentionDate);

  if (error) throw new Error(errorMessage(error, "Could not clean old notifications."));
}

function sortNotifications(items: AppNotification[]) {
  return items.sort((a, b) => {
    if (!a.readAt && b.readAt) return -1;
    if (a.readAt && !b.readAt) return 1;
    return new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime();
  });
}
