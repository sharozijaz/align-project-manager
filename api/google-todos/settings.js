import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireMethod,
  upsertGoogleTodoSyncSettings,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
  if (requireMethod(req, res, "POST")) return;

  const env = getEnv();
  if (ensureEnv(res, env, ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey"])) return;

  try {
    const user = await getSupabaseUser(req, env);
    const settings = await upsertGoogleTodoSyncSettings(env, user.id, {
      enabled: req.body?.enabled,
      todoListId: req.body?.todoListId,
    });

    res.status(200).json({ settings });
  } catch (error) {
    handleApiError(res, error);
  }
}
