import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  googleCalendarRequest,
  googleEventToCalendarEvent,
  handleApiError,
  refreshGoogleAccessTokenIfNeeded,
  requireAllowedUser,
  requireMethod,
  syncTasksToGoogleCalendarForUser,
} from "./_googleCalendar.js";
import {
  applyRateLimit,
  rejectOversizedPayload,
  requireJsonPayload,
  sanitizeIdArray,
  sanitizeTaskSyncPayload,
} from "./_security.js";

const SYNC_MAX_BYTES = 512 * 1024;

export default async function handler(req, res) {
  if (applyApiCors(req, res, "GET,POST,OPTIONS")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-sync", max: 120 })) return;

  const action = getAction(req);
  if (action === "status") {
    await handleStatus(req, res);
    return;
  }
  if (action === "settings") {
    res.status(410).json({ error: "Google Todo sync has been retired. Align tasks sync through Supabase." });
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
    const scopes = connection?.scopes ?? [];
    let refreshedConnection = connection;

    if (connection && includeLists) {
      refreshedConnection = await refreshGoogleAccessTokenIfNeeded(env, connection);
    }

    res.status(200).json({
      calendar: {
        connected: Boolean(connection),
        calendarId: connection?.calendar_id,
        expiresAt: refreshedConnection?.expires_at,
        updatedAt: connection?.updated_at,
        scopes,
      },
    });
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
