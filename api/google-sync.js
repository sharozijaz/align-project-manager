import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  getGoogleTaskLists,
  getGoogleTodoSyncSettings,
  googleCalendarRequest,
  googleEventToCalendarEvent,
  googleTasksScopes,
  handleApiError,
  refreshGoogleAccessTokenIfNeeded,
  requireAllowedUser,
  requireMethod,
  syncGoogleTodosForUser,
  syncTasksToGoogleCalendarForUser,
  upsertGoogleTodoSyncSettings,
} from "./_googleCalendar.js";
import {
  applyRateLimit,
  rejectOversizedPayload,
  requireJsonPayload,
  sanitizeGoogleTodoSettings,
  sanitizeIdArray,
  sanitizeTaskSyncPayload,
} from "./_security.js";

const SYNC_MAX_BYTES = 512 * 1024;
const SETTINGS_MAX_BYTES = 8 * 1024;

export default async function handler(req, res) {
  if (applyApiCors(req, res, "GET,POST,OPTIONS")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-sync", max: 120 })) return;

  const action = getAction(req);
  if (action === "status") {
    await handleStatus(req, res);
    return;
  }
  if (action === "settings") {
    await handleSettings(req, res);
    return;
  }
  if (action === "sync") {
    await handleSync(req, res);
    return;
  }

  res.status(404).json({ error: "Unknown Google sync action." });
}

function getAction(req) {
  const queryAction = typeof req.query?.action === "string" ? req.query.action : "";
  return queryAction || "status";
}

async function handleStatus(req, res) {
  if (requireMethod(req, res, "GET")) return;

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
    const includeLists = req.query?.includeLists === "true" || req.query?.includeLists === "1";
    const user = await requireAllowedUser(req, env);
    const connection = await getGoogleConnection(env, user.id);
    const settings = await getGoogleTodoSyncSettings(env, user.id);
    const scopes = connection?.scopes ?? [];
    const needsReconnect = Boolean(connection) && googleTasksScopes.some((scope) => !scopes.includes(scope));
    let lists = [];
    let refreshedConnection = connection;

    if (connection && includeLists && !needsReconnect) {
      refreshedConnection = await refreshGoogleAccessTokenIfNeeded(env, connection);
      lists = await getGoogleTaskLists(env, refreshedConnection);
    }

    res.status(200).json({
      calendar: {
        connected: Boolean(connection),
        calendarId: connection?.calendar_id,
        expiresAt: refreshedConnection?.expires_at,
        updatedAt: connection?.updated_at,
        scopes,
      },
      todos: {
        connected: Boolean(connection),
        needsReconnect,
        scopes,
        lists,
        settings,
        accountEmail: connection?.account_email,
        updatedAt: connection?.updated_at,
      },
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function handleSettings(req, res) {
  if (requireMethod(req, res, "POST")) return;
  if (rejectOversizedPayload(req, res, SETTINGS_MAX_BYTES)) return;
  if (requireJsonPayload(req, res)) return;

  const env = getEnv();
  if (ensureEnv(res, env, ["supabaseUrl", "supabaseAnonKey", "supabaseServiceRoleKey"])) return;

  try {
    const user = await requireAllowedUser(req, env);
    const settings = await upsertGoogleTodoSyncSettings(env, user.id, sanitizeGoogleTodoSettings(req.body));

    res.status(200).json({ settings });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function handleSync(req, res) {
  if (requireMethod(req, res, "POST")) return;
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
    const result = {};

    if (req.body?.calendar) {
      const calendarResult = await syncTasksToGoogleCalendarForUser(env, user.id, tasks, {
        forceTaskIds: sanitizeIdArray(req.body?.forceTaskIds),
      });
      result.calendar = {
        ...calendarResult,
        events: await fetchGoogleEventsForUser(env, user.id),
      };
    }

    if (req.body?.todos) {
      result.todos = await syncGoogleTodosForUser(env, user.id, { tasks }, sanitizeGoogleTodoSettings(req.body?.settings));
    }

    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error);
  }
}

async function fetchGoogleEventsForUser(env, userId) {
  const connection = await getGoogleConnection(env, userId);
  if (!connection) return [];

  const refreshedConnection = await refreshGoogleAccessTokenIfNeeded(env, connection);
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
    timeMax: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const data = await googleCalendarRequest(env, refreshedConnection, `/events?${params.toString()}`);
  return (data.items || []).map(googleEventToCalendarEvent).filter((event) => event.startDate);
}
