import {
  ensureEnv,
  getEnv,
  getGoogleConnection,
  getSupabaseUser,
  handleApiError,
  requireMethod,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (requireMethod(req, res, "GET")) return;

  const env = getEnv();
  if (ensureEnv(res, env, ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey"])) return;

  try {
    const user = await getSupabaseUser(req, env);
    const connection = await getGoogleConnection(env, user.id);

    res.status(200).json({
      connected: Boolean(connection),
      calendarId: connection?.calendar_id,
      expiresAt: connection?.expires_at,
      updatedAt: connection?.updated_at,
      scopes: connection?.scopes ?? [],
    });
  } catch (error) {
    handleApiError(res, error);
  }
}
