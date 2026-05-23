import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  handleApiError,
  requireAllowedUser,
  requireMethod,
} from "../_googleCalendar.js";
import { applyRateLimit } from "../_security.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "GET,OPTIONS")) return;
  if (requireMethod(req, res, "GET")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-calendar-status", max: 120 })) return;

  const env = getEnv();
  if (ensureEnv(res, env, ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey"])) return;

  try {
    const user = await requireAllowedUser(req, env);
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
