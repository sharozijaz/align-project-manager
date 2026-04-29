import {
  createReminderNotificationsForUser,
  ensureEnv,
  findGoogleCalendarConnections,
  findTasksForUser,
  findWorkspaceUserIds,
  getEnv,
  handleApiError,
  requireCronAuthorization,
  requireMethod,
  sendReminderEmailsForUser,
  syncTasksToGoogleCalendarForUser,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (requireMethod(req, res, "GET")) return;

  const env = getEnv();
  if (
    ensureEnv(res, env, [
      "supabaseUrl",
      "supabaseServiceRoleKey",
      "googleClientId",
      "googleClientSecret",
      "cronSecret",
    ])
  ) {
    return;
  }
  if (requireCronAuthorization(req, res, env)) return;

  try {
    const connections = await findGoogleCalendarConnections(env);
    const connectionsByUserId = new Map(connections.map((connection) => [connection.user_id, connection]));
    const userIds = await findWorkspaceUserIds(env);
    const results = [];

    for (const userId of userIds) {
      const hasGoogleConnection = connectionsByUserId.has(userId);

      try {
        const tasks = await findTasksForUser(env, userId);
        const googleResult = hasGoogleConnection
          ? await syncTasksToGoogleCalendarForUser(env, userId, tasks)
          : { created: 0, updated: 0, removed: 0, skipped: tasks.length, conflicts: [], googleSkipped: true };
        const reminderResult = await createReminderNotificationsForUser(env, userId, tasks);
        const emailResult = await sendReminderEmailsForUser(env, userId);
        results.push({ userId, ok: true, ...googleResult, ...reminderResult, ...emailResult });
      } catch (error) {
        results.push({ userId, ok: false, error: error.message || "Google Calendar sync failed." });
      }
    }

    const totals = results.reduce(
      (summary, item) => ({
        users: summary.users + 1,
        failed: summary.failed + (item.ok ? 0 : 1),
        created: summary.created + (item.created ?? 0),
        updated: summary.updated + (item.updated ?? 0),
        removed: summary.removed + (item.removed ?? 0),
        skipped: summary.skipped + (item.skipped ?? 0),
        conflicts: summary.conflicts + (item.conflicts?.length ?? 0),
        reminders: summary.reminders + (item.reminders ?? 0),
        emails: summary.emails + (item.emails ?? 0),
        emailFailed: summary.emailFailed + (item.emailFailed ?? 0),
      }),
      { users: 0, failed: 0, created: 0, updated: 0, removed: 0, skipped: 0, conflicts: 0, reminders: 0, emails: 0, emailFailed: 0 },
    );

    res.status(totals.failed ? 207 : 200).json({ ok: totals.failed === 0, totals, results });
  } catch (error) {
    handleApiError(res, error);
  }
}
