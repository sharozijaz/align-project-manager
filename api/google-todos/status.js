import {
  applyApiCors,
  ensureEnv,
  getEnv,
  getGoogleConnection,
  getGoogleTaskLists,
  getGoogleTodoSyncSettings,
  getSupabaseUser,
  googleTasksScopes,
  handleApiError,
  refreshGoogleAccessTokenIfNeeded,
  requireMethod,
} from "../_googleCalendar.js";

export default async function handler(req, res) {
  if (applyApiCors(req, res, "GET,OPTIONS")) return;
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
