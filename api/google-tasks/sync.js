import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireMethod,
  syncGoogleTasksBridgeForUser,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
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
    const workspace = {
      tasks: Array.isArray(req.body?.tasks) ? req.body.tasks : [],
      projects: Array.isArray(req.body?.projects) ? req.body.projects : [],
    };
    const result = await syncGoogleTasksBridgeForUser(env, user.id, workspace, req.body?.settings ?? {});

    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error);
  }
}
