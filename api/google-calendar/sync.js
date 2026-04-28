import {
  deleteTaskLink,
  ensureEnv,
  findTaskLinks,
  getEnv,
  getSupabaseUser,
  googleCalendarRequest,
  handleApiError,
  requireGoogleConnection,
  requireMethod,
  taskToGoogleEvent,
  upsertTaskLink,
  wasGoogleEventEditedAfterLastSync,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (requireMethod(req, res, "POST")) return;

  const env = getEnv();
  if (
    ensureEnv(res, env, [
      "supabaseUrl",
      "supabaseAnonKey",
      "supabaseServiceRoleKey",
      "googleClientId",
      "googleClientSecret",
    ])
  ) {
    return;
  }

  try {
    const user = await getSupabaseUser(req, env);
    const connection = await requireGoogleConnection(env, user.id);
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const links = await findTaskLinks(env, user.id);
    let created = 0;
    let updated = 0;
    let removed = 0;
    let skipped = 0;
    const conflicts = [];

    for (const task of tasks) {
      const link = links.get(task.id);
      const linkedEventId = link?.google_event_id;
      const shouldSync = task.dueDate && !["done", "delivered", "cancelled"].includes(task.status) && !task.deletedAt;

      if (!shouldSync) {
        skipped += 1;

        if (linkedEventId) {
          await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`, { method: "DELETE" });
          await deleteTaskLink(env, user.id, task.id);
          removed += 1;
        }

        continue;
      }

      const eventPayload = taskToGoogleEvent(task);

      if (linkedEventId) {
        const googleEvent = await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`);

        if (wasGoogleEventEditedAfterLastSync(link, googleEvent)) {
          conflicts.push({
            taskId: task.id,
            taskTitle: task.title,
            googleEventId: linkedEventId,
            googleUpdatedAt: googleEvent.updated,
          });
          skipped += 1;
          continue;
        }

        const updatedEvent = await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`, {
          method: "PATCH",
          body: JSON.stringify(eventPayload),
        });
        await upsertTaskLink(env, user.id, task.id, linkedEventId, updatedEvent.updated);
        updated += 1;
      } else {
        const createdEvent = await googleCalendarRequest(env, connection, "/events", {
          method: "POST",
          body: JSON.stringify(eventPayload),
        });
        await upsertTaskLink(env, user.id, task.id, createdEvent.id, createdEvent.updated);
        created += 1;
      }
    }

    res.status(200).json({ created, updated, removed, skipped, conflicts });
  } catch (error) {
    handleApiError(res, error);
  }
}
