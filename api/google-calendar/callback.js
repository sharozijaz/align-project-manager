import {
  ensureEnv,
  exchangeCodeForTokens,
  getEnv,
  handleApiError,
  parseOAuthState,
  upsertGoogleConnection,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
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
    const { code, state, error } = req.query;

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
