import {
  applyApiCors,
  deleteGoogleConnection,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  handleApiError,
  requireAllowedUser,
  requireMethod,
  revokeGoogleToken,
} from "../_googleCalendar.js";
import { applyRateLimit, rejectOversizedPayload } from "../_security.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
  if (requireMethod(req, res, "POST")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-calendar-disconnect", max: 20 })) return;
  if (rejectOversizedPayload(req, res, 1024)) return;

  const env = getEnv();
  if (
    ensureEnv(res, env, [
      "supabaseUrl",
      "supabaseAnonKey",
      "supabaseServiceRoleKey",
      "googleClientId",
      "googleClientSecret",
      "googleTokenEncryptionKey",
    ])
  ) {
    return;
  }

  try {
    const user = await requireAllowedUser(req, env);
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
