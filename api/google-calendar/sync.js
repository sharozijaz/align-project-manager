import {
  applyApiCors,
  ensureEnv,
  getEnv,
  handleApiError,
  requireAllowedUser,
  requireMethod,
  syncTasksToGoogleCalendarForUser,
} from "../_googleCalendar.js";
import {
  applyRateLimit,
  rejectOversizedPayload,
  requireJsonPayload,
  sanitizeIdArray,
  sanitizeTaskSyncPayload,
} from "../_security.js";

const SYNC_MAX_BYTES = 512 * 1024;

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
  if (requireMethod(req, res, "POST")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-calendar-sync", max: 60 })) return;
  if (rejectOversizedPayload(req, res, SYNC_MAX_BYTES)) return;
  if (requireJsonPayload(req, res)) return;

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
    const tasks = sanitizeTaskSyncPayload(req.body?.tasks);
    const forceTaskIds = sanitizeIdArray(req.body?.forceTaskIds);
    const result = await syncTasksToGoogleCalendarForUser(env, user.id, tasks, { forceTaskIds });

    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error);
  }
}
