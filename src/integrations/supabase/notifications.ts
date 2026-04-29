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
  created_at: string;
}): AppNotification => ({
  id: row.id,
  taskId: row.task_id || undefined,
  type: row.type,
  title: row.title,
  message: row.message,
  scheduledFor: row.scheduled_for,
  readAt: row.read_at || undefined,
  createdAt: row.created_at,
});

export async function fetchNotifications(limit = 10) {
  const client = requireClient();
  const { data, error } = await client
    .from("notifications")
    .select("id,task_id,type,title,message,scheduled_for,read_at,created_at")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (error) throw new Error(errorMessage(error, "Could not load notifications."));

  return (data ?? []).map(rowToNotification);
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
