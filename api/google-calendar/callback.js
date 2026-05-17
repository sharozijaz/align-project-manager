import {
  ensureEnv,
  exchangeCodeForTokens,
  getEnv,
  handleApiError,
  parseOAuthState,
  upsertGoogleConnection,
} from "../_googleCalendar.js";
import { applyRateLimit, sanitizeQueryString } from "../_security.js";

export default async function handler(req, res) {
  if (applyRateLimit(req, res, { keyPrefix: "google-calendar-callback", max: 5 })) return;

  const env = getEnv();
  if (
    ensureEnv(res, env, [
      "supabaseUrl",
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
    const code = sanitizeQueryString(req.query?.code, "code", { maxLength: 2048 });
    const state = sanitizeQueryString(req.query?.state, "state", { maxLength: 2048 });
    const error = sanitizeQueryString(req.query?.error, "error", { maxLength: 256 });

    if (error) {
      res.redirect(`${env.appUrl}/settings?googleCalendar=denied`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${env.appUrl}/settings?googleCalendar=missing-code`);
      return;
    }

    const payload = parseOAuthState(env, state);
    const tokens = await exchangeCodeForTokens(env, code);
    await upsertGoogleConnection(env, payload.userId, tokens);

    res.redirect(`${env.appUrl}/settings?googleCalendar=connected`);
  } catch (error) {
    handleApiError(res, error);
  }
}
