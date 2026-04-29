import {
  ensureEnv,
  findGoogleCalendarConnections,
  findTasksForUser,
  getEnv,
  handleApiError,
  requireCronAuthorization,
  requireMethod,
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
    const results = [];

    for (const connection of connections) {
      const userId = connection.user_id;

      try {
        const tasks = await findTasksForUser(env, userId);
        const result = await syncTasksToGoogleCalendarForUser(env, userId, tasks);
        results.push({ userId, ok: true, ...result });
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
      }),
      { users: 0, failed: 0, created: 0, updated: 0, removed: 0, skipped: 0, conflicts: 0 },
    );

    res.status(totals.failed ? 207 : 200).json({ ok: totals.failed === 0, totals, results });
  } catch (error) {
    handleApiError(res, error);
  }
}
