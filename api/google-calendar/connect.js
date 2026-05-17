import {
  applyApiCors,
  buildGoogleAuthUrl,
  ensureEnv,
  getEnv,
  getSupabaseUser,
  handleApiError,
  requireMethod,
} from "../_googleCalendar.js";
import { applyRateLimit, rejectOversizedPayload } from "../_security.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
  if (requireMethod(req, res, "POST")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-calendar-connect", max: 5 })) return;
  if (rejectOversizedPayload(req, res, 1024)) return;

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
