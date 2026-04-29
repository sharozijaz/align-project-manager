import {
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireMethod,
  syncTasksToGoogleCalendarForUser,
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
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const forceTaskIds = Array.isArray(req.body?.forceTaskIds) ? req.body.forceTaskIds : [];
    const result = await syncTasksToGoogleCalendarForUser(env, user.id, tasks, { forceTaskIds });

    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error);
  }
}
