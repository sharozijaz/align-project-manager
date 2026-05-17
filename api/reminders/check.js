import {
  applyApiCors,
  createReminderNotificationsForUser,
  ensureEnv,
  findTasksForUser,
  getEnv,
  handleApiError,
  HttpError,
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
    const userId = await requireSupabaseUserId(req, env);
    const tasks = await findTasksForUser(env, userId);
    const reminderResult = await createReminderNotificationsForUser(env, userId, tasks);
    const emailResult = await sendReminderEmailsForUser(env, userId);

    res.status(200).json({ ok: true, ...reminderResult, ...emailResult });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function requireSupabaseUserId(req, env) {
  const authorization = req.headers.authorization || "";
  const token = authorization.replace(/^Bearer\s+/iu, "").trim();
  if (!token) {
    throw new HttpError(401, "Sign in to check reminder emails.");
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, "Reminder email session expired. Sign in again.");
  }

  const user = await response.json();
  if (!user?.id) {
    throw new HttpError(401, "Could not identify reminder email user.");
  }

  return user.id;
}
