import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  getGoogleTaskLists,
  getGoogleTodoSyncSettings,
  googleTasksScopes,
  handleApiError,
  refreshGoogleAccessTokenIfNeeded,
  requireAllowedUser,
  requireMethod,
  syncGoogleTodosForUser,
  upsertGoogleTodoSyncSettings,
} from "./_googleCalendar.js";
import {
  applyRateLimit,
  rejectOversizedPayload,
  requireJsonPayload,
  sanitizeGoogleTodoSettings,
  sanitizeTaskSyncPayload,
} from "./_security.js";

const SYNC_MAX_BYTES = 512 * 1024;
const SETTINGS_MAX_BYTES = 8 * 1024;

export default async function handler(req, res) {
  if (applyApiCors(req, res, "GET,POST,OPTIONS")) return;
  if (applyRateLimit(req, res, { keyPrefix: "google-todos", max: 120 })) return;

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

  res.status(404).json({ error: "Unknown Google Todos action." });
}

function getAction(req) {
  const queryAction = typeof req.query?.action === "string" ? req.query.action : "";
  if (queryAction) return queryAction;

  const parts = String(req.url ?? "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  return parts[parts.length - 1] === "google-todos" ? "" : parts[parts.length - 1];
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
    const user = await requireAllowedUser(req, env);
    const connection = await getGoogleConnection(env, user.id);
    const settings = await getGoogleTodoSyncSettings(env, user.id);

    if (!connection) {
      res.status(200).json({
        connected: false,
        needsReconnect: false,
        scopes: [],
        lists: [],
        settings,
      });
      return;
    }

    const scopes = connection.scopes ?? [];
    const needsReconnect = googleTasksScopes.some((scope) => !scopes.includes(scope));
    const refreshedConnection = needsReconnect ? connection : await refreshGoogleAccessTokenIfNeeded(env, connection);
    const lists = needsReconnect ? [] : await getGoogleTaskLists(env, refreshedConnection);

    res.status(200).json({
      connected: true,
      needsReconnect,
      scopes,
      lists,
      settings,
      accountEmail: connection.account_email,
      updatedAt: connection.updated_at,
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
    const workspace = {
      tasks: sanitizeTaskSyncPayload(req.body?.tasks),
    };
    const result = await syncGoogleTodosForUser(env, user.id, workspace, sanitizeGoogleTodoSettings(req.body?.settings));

    res.status(200).json(result);
  } catch (error) {
    handleApiError(res, error);
  }
}
