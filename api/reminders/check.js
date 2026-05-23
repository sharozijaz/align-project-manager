import {
  applyApiCors,
  createReminderNotificationsForUser,
  ensureEnv,
  findTasksForUser,
  getEnv,
  handleApiError,
  requireAllowedUser,
  requireMethod,
  sendReminderEmailsForUser,
} from "../_googleCalendar.js";
import { applyRateLimit, rejectOversizedPayload } from "../_security.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "POST,OPTIONS")) return;
  if (requireMethod(req, res, "POST")) return;
  if (applyRateLimit(req, res, { keyPrefix: "reminders-check", max: 60 })) return;
  if (rejectOversizedPayload(req, res, 1024)) return;

  const env = getEnv();
  if (ensureEnv(res, env, ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey"])) return;

  try {
    const user = await requireAllowedUser(req, env);
    const tasks = await findTasksForUser(env, user.id);
    const reminderResult = await createReminderNotificationsForUser(env, user.id, tasks);
    const emailResult = await sendReminderEmailsForUser(env, user.id);

    res.status(200).json({ ok: true, ...reminderResult, ...emailResult });
  } catch (error) {
    handleApiError(res, error);
  }
}
