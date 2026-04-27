import {
  ensureEnv,
  getEnv,
  getSupabaseUser,
  googleCalendarRequest,
  googleEventToCalendarEvent,
  handleApiError,
  requireGoogleConnection,
  requireMethod,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (requireMethod(req, res, "GET")) return;

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
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const data = await googleCalendarRequest(env, connection, `/events?${params.toString()}`);
    const events = (data.items || []).map(googleEventToCalendarEvent).filter((event) => event.startDate);

    res.status(200).json({ events });
  } catch (error) {
    handleApiError(res, error);
  }
}
