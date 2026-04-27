import {
  deleteGoogleConnection,
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireGoogleConnection,
  requireMethod,
  revokeGoogleToken,
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

    await revokeGoogleToken(connection.refresh_token || connection.access_token);
    await deleteGoogleConnection(env, user.id);

    res.status(200).json({ disconnected: true });
  } catch (error) {
    handleApiError(res, error);
  }
}
