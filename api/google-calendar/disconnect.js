import {
  applyApiCors,
  deleteGoogleConnection,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  getSupabaseUser,
  handleApiError,
  requireMethod,
  revokeGoogleToken,
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
    const connection = await getGoogleConnection(env, user.id);

    if (connection) {
      try {
        await revokeGoogleToken(connection.refresh_token || connection.access_token);
      } catch {
        // If Google already revoked/expired the token, still clear Align's saved connection.
      }
    }
    await deleteGoogleConnection(env, user.id);

    res.status(200).json({ disconnected: true });
  } catch (error) {
    handleApiError(res, error);
  }
}
