import {
  applyApiCors,
  buildGoogleAuthUrl,
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireMethod,
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
      "appUrl",
      "googleClientId",
      "googleClientSecret",
      "googleRedirectUri",
      "stateSecret",
    ])
  ) {
    return;
  }

  try {
    const user = await getSupabaseUser(req, env);
    res.status(200).json({ url: buildGoogleAuthUrl(env, user.id) });
  } catch (error) {
    handleApiError(res, error);
  }
}
