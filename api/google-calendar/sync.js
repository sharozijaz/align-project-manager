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

    for (const task of tasks) {
      const linkedEventId = links.get(task.id);
      const shouldSync = task.dueDate && task.status !== "completed" && !task.deletedAt;

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
        await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`, {
          method: "PATCH",
          body: JSON.stringify(eventPayload),
        });
        updated += 1;
      } else {
        const createdEvent = await googleCalendarRequest(env, connection, "/events", {
          method: "POST",
          body: JSON.stringify(eventPayload),
        });
        await upsertTaskLink(env, user.id, task.id, createdEvent.id);
        created += 1;
      }
    }

    res.status(200).json({ created, updated, removed, skipped });
  } catch (error) {
    handleApiError(res, error);
  }
}
