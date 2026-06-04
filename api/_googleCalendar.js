import crypto from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TASKS_API_URL = "https://tasks.googleapis.com/tasks/v1";
const RESEND_EMAIL_API_URL = "https://api.resend.com/emails";
const ENCRYPTED_TOKEN_PREFIX = "enc:v1:";

export const calendarScopes = ["https://www.googleapis.com/auth/calendar.events.owned"];
export const googleTasksScopes = ["https://www.googleapis.com/auth/tasks"];
export const googleWorkspaceScopes = [...calendarScopes];

export function getEnv() {
  const supabaseUrl = normalizeUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const appUrl = normalizeUrl(process.env.APP_URL || process.env.VITE_APP_URL);
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const googleRedirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.VITE_GOOGLE_REDIRECT_URI ||
    (appUrl ? `${appUrl}/api/google-calendar/callback` : "");
  const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID || "primary";
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || supabaseServiceRoleKey || googleClientSecret;
  const cronSecret = process.env.CRON_SECRET || "";
  const resendApiKey = process.env.RESEND_API_KEY || "";
  const reminderEmailFrom = process.env.REMINDER_EMAIL_FROM || "";
  const reminderEmailReplyTo = process.env.REMINDER_EMAIL_REPLY_TO || "";
  const allowedApiOrigins = process.env.ALLOWED_API_ORIGINS || "";
  const googleTokenEncryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "";

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    appUrl,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    googleCalendarId,
    stateSecret,
    cronSecret,
    resendApiKey,
    reminderEmailFrom,
    reminderEmailReplyTo,
    allowedApiOrigins,
    googleTokenEncryptionKey,
  };
}

export function normalizeUrl(value = "") {
  if (!value.trim()) return "";
  const trimmed = value.trim();
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;

  return withProtocol.replace(/\/$/u, "");
}

export function requireMethod(req, res, method) {
  if (req.method === method) return false;

  res.status(405).json({ error: `Use ${method}.` });
  return true;
}

export function applyApiCors(req, res, methods = "GET,POST,OPTIONS") {
  const env = getEnv();
  const origin = String(req.headers.origin || "").replace(/\/$/u, "");
  const allowedOrigins = allowedApiOrigins(env);

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (origin) {
    if (!allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Origin is not allowed." });
      return true;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method !== "OPTIONS") return false;

  res.status(204).end();
  return true;
}

export function requireCronAuthorization(req, res, env) {
  if (!env.cronSecret) {
    res.status(500).json({ error: "Missing server configuration: cronSecret." });
    return true;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/iu, "");
  if (token === env.cronSecret) return false;

  res.status(401).json({ error: "Invalid cron authorization." });
  return true;
}

export function ensureEnv(res, env, keys) {
  const missing = keys.filter((key) => !env[key]);

  if (!missing.length) return false;

  res.status(500).json({ error: `Missing server configuration: ${missing.map(envKeyLabel).join(", ")}.` });
  return true;
}

function envKeyLabel(key) {
  const labels = {
    appUrl: "APP_URL",
    supabaseUrl: "SUPABASE_URL",
    supabaseAnonKey: "SUPABASE_ANON_KEY",
    supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
    googleClientId: "GOOGLE_CLIENT_ID",
    googleClientSecret: "GOOGLE_CLIENT_SECRET",
    googleRedirectUri: "GOOGLE_REDIRECT_URI",
    googleCalendarId: "GOOGLE_CALENDAR_ID",
    googleTokenEncryptionKey: "GOOGLE_TOKEN_ENCRYPTION_KEY",
    cronSecret: "CRON_SECRET",
    resendApiKey: "RESEND_API_KEY",
    reminderEmailFrom: "REMINDER_EMAIL_FROM",
  };

  return labels[key] ?? key;
}

export async function getSupabaseUser(req, env) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/iu, "");

  if (!token) {
    throw new HttpError(401, "Missing Supabase session.");
  }

  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, "Invalid Supabase session.");
  }

  return response.json();
}

export async function requireAllowedUser(req, env) {
  const user = await getSupabaseUser(req, env);
  const email = String(user?.email || "").trim();

  if (!user?.id || !email) {
    throw new HttpError(403, "This account is not allowed to use hosted Align APIs.");
  }

  await requireAllowedEmail(env, email);

  return user;
}

export async function requireAllowedUserId(env, userId) {
  const email = await findUserEmail(env, userId);

  if (!email) {
    throw new HttpError(403, "This account is not allowed to use hosted Align APIs.");
  }

  await requireAllowedEmail(env, email);

  return { id: userId, email };
}

export async function isAllowedUserId(env, userId) {
  try {
    await requireAllowedUserId(env, userId);
    return true;
  } catch {
    return false;
  }
}

async function requireAllowedEmail(env, email) {
  const [profileAccess, legacyAccess] = await Promise.all([
    readAllowedEmailRows(env, "app_profiles", email, { activeOnly: true }),
    readAllowedEmailRows(env, "allowed_users", email),
  ]);

  if (profileAccess.rows.length || legacyAccess.rows.length) return;

  if (!profileAccess.configured && !legacyAccess.configured) {
    throw new HttpError(403, "Hosted API access tables are not configured. Run supabase/security-hardening.sql and supabase/feature-access.sql.");
  }

  throw new HttpError(403, "This account is not allowed to use hosted Align APIs. Add the email in Admin or public.allowed_users.");
}

async function readAllowedEmailRows(env, table, email, options = {}) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("email", `ilike.${email}`);
  url.searchParams.set("select", "email");
  url.searchParams.set("limit", "1");
  if (options.activeOnly) url.searchParams.set("active", "eq.true");

  try {
    const response = await serviceFetch(env, url);
    return { configured: true, rows: await response.json() };
  } catch (error) {
    if (isMissingSupabaseRelation(error)) {
      return { configured: false, rows: [] };
    }

    throw error;
  }
}

function isMissingSupabaseRelation(error) {
  const message = String(error?.message ?? "").toLowerCase();
  return error?.status === 404 || message.includes("schema cache") || message.includes("could not find the table");
}

export function createOAuthState(env, userId) {
  const payload = {
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    issuedAt: Date.now(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signState(env, encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseOAuthState(env, state) {
  const [encodedPayload, signature] = String(state || "").split(".");

  if (!encodedPayload || !signature || signature !== signState(env, encodedPayload)) {
    throw new HttpError(400, "Invalid OAuth state.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

  if (!payload.userId || Date.now() - Number(payload.issuedAt) > 10 * 60 * 1000) {
    throw new HttpError(400, "Expired OAuth state.");
  }

  return payload;
}

export function buildGoogleAuthUrl(env, userId) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", env.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleWorkspaceScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", createOAuthState(env, userId));

  return url.toString();
}

export async function exchangeCodeForTokens(env, code) {
  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: env.googleRedirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new HttpError(response.status, data.error_description || data.error || "Could not connect Google Calendar.");
  }

  return data;
}

export async function upsertGoogleConnection(env, userId, tokens) {
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();
  const row = {
    user_id: userId,
    access_token: encryptGoogleToken(env, tokens.access_token),
    ...(tokens.refresh_token ? { refresh_token: encryptGoogleToken(env, tokens.refresh_token) } : {}),
    expires_at: expiresAt,
    calendar_id: env.googleCalendarId,
    scopes: googleWorkspaceScopes,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${env.supabaseUrl}/rest/v1/google_calendar_connections`, {
    method: "POST",
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(response.status, detail || "Could not save Google Calendar connection.");
  }
}

export async function getGoogleConnection(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_connections`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "user_id,calendar_id,access_token,refresh_token,expires_at,updated_at,scopes");

  const response = await fetch(url, {
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(response.status, detail || "Could not read Google Calendar connection.");
  }

  const rows = await response.json();
  return rows[0] ? decryptGoogleConnection(env, rows[0]) : null;
}

export async function requireGoogleConnection(env, userId) {
  const connection = await getGoogleConnection(env, userId);

  if (!connection) {
    throw new HttpError(409, "Connect Google Calendar first.");
  }

  return refreshGoogleAccessTokenIfNeeded(env, connection);
}

export async function refreshGoogleAccessTokenIfNeeded(env, connection) {
  const expiresAt = new Date(connection.expires_at).getTime();

  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 2 * 60 * 1000) {
    return connection;
  }

  if (!connection.refresh_token) {
    throw new HttpError(409, "Reconnect Google Calendar to refresh access.");
  }

  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    refresh_token: connection.refresh_token,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new HttpError(response.status, data.error_description || data.error || "Could not refresh Google token.");
  }

  await upsertGoogleConnection(env, connection.user_id, {
    ...data,
    refresh_token: connection.refresh_token,
  });

  return {
    ...connection,
    access_token: data.access_token,
    expires_at: new Date(Date.now() + Number(data.expires_in || 3600) * 1000).toISOString(),
  };
}

export async function googleCalendarRequest(env, connection, path, options = {}) {
  const calendarId = encodeURIComponent(connection.calendar_id || env.googleCalendarId);
  const response = await fetch(`${GOOGLE_CALENDAR_API_URL}/calendars/${calendarId}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${connection.access_token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(response.status, data?.error?.message || data?.error || "Google Calendar request failed.");
  }

  return data;
}

export async function googleTasksRequest(_env, connection, path, options = {}) {
  const response = await fetch(`${GOOGLE_TASKS_API_URL}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${connection.access_token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(response.status, data?.error?.message || data?.error || "Google Tasks request failed.");
  }

  return data;
}

export async function getGoogleTaskBridgeSettings(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_task_bridge_settings`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "enabled,today_list_id,inbox_list_id,last_synced_at,last_error,updated_at");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return normalizeGoogleTaskBridgeSettings(rows[0]);
  } catch (error) {
    if (isMissingGoogleTasksBridgeTable(error)) return normalizeGoogleTaskBridgeSettings(null);
    throw error;
  }
}

export async function upsertGoogleTaskBridgeSettings(env, userId, settings) {
  const row = {
    user_id: userId,
    enabled: Boolean(settings.enabled),
    today_list_id: settings.todayListId || null,
    inbox_list_id: settings.inboxListId || null,
    last_error: settings.lastError || null,
    ...(settings.lastSyncedAt ? { last_synced_at: settings.lastSyncedAt } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/google_task_bridge_settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    });
    const rows = await response.json();
    return normalizeGoogleTaskBridgeSettings(rows[0]);
  } catch (error) {
    if (isMissingGoogleTasksBridgeTable(error)) {
      throw new HttpError(500, "Run supabase/google-tasks-bridge.sql before using Google Tasks sync.");
    }

    throw error;
  }
}

export async function getGoogleTaskLists(env, connection) {
  const lists = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({ maxResults: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleTasksRequest(env, connection, `/users/@me/lists?${params.toString()}`);
    lists.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return lists.map((list) => ({ id: list.id, title: list.title || "Untitled list" }));
}

export async function getGoogleTodoSyncSettings(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_todo_sync_settings`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "enabled,todo_list_id,last_synced_at,last_error,updated_at");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return normalizeGoogleTodoSyncSettings(rows[0]);
  } catch (error) {
    if (isMissingGoogleTodoSyncTable(error)) return normalizeGoogleTodoSyncSettings(null);
    throw error;
  }
}

export async function upsertGoogleTodoSyncSettings(env, userId, settings) {
  const row = {
    user_id: userId,
    enabled: Boolean(settings.enabled),
    todo_list_id: settings.todoListId || null,
    last_error: settings.lastError || null,
    ...(settings.lastSyncedAt ? { last_synced_at: settings.lastSyncedAt } : {}),
    updated_at: new Date().toISOString(),
  };

  try {
    const response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/google_todo_sync_settings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    });
    const rows = await response.json();
    return normalizeGoogleTodoSyncSettings(rows[0]);
  } catch (error) {
    if (isMissingGoogleTodoSyncTable(error)) {
      throw new HttpError(500, "Run supabase/google-todos-sync.sql before using Google Todo sync.");
    }

    throw error;
  }
}

export async function syncGoogleTodosForUser(env, userId, workspace, incomingSettings = {}) {
  const connection = await requireGoogleConnection(env, userId);
  const scopes = connection.scopes || [];
  if (googleTasksScopes.some((scope) => !scopes.includes(scope))) {
    throw new HttpError(409, "Reconnect Google so Align can use the Tasks scope.");
  }

  const savedSettings = await getGoogleTodoSyncSettings(env, userId);
  const mergedSettings = {
    ...savedSettings,
    ...incomingSettings,
    enabled: incomingSettings.enabled ?? savedSettings.enabled,
  };

  if (!mergedSettings.enabled) {
    throw new HttpError(409, "Enable Google Todo sync first.");
  }

  const lists = await getGoogleTaskLists(env, connection);
  const todoList = await ensureGoogleTaskList(env, connection, lists, mergedSettings.todoListId, "Align Todos");
  const settings = await upsertGoogleTodoSyncSettings(env, userId, {
    ...mergedSettings,
    todoListId: todoList.id,
  });

  let result;
  try {
    result = await syncTodoTasks(env, connection, userId, todoList.id, workspace);
  } catch (error) {
    if (isGooglePermissionError(error)) {
      throw new HttpError(403, "Google refused access to this Todo list. Reconnect Google or choose another Google Todo list.");
    }
    throw error;
  }
  const lastSyncedAt = new Date().toISOString();
  await upsertGoogleTodoSyncSettings(env, userId, {
    ...settings,
    enabled: true,
    todoListId: todoList.id,
    lastSyncedAt,
    lastError: "",
  });

  return {
    ...result,
    settings: {
      ...settings,
      enabled: true,
      todoListId: todoList.id,
      lastSyncedAt,
      lastError: "",
    },
    lists: await getGoogleTaskLists(env, connection),
  };
}

export async function syncGoogleTasksBridgeForUser(env, userId, workspace, incomingSettings = {}) {
  const connection = await requireGoogleConnection(env, userId);
  const scopes = connection.scopes || [];
  if (googleTasksScopes.some((scope) => !scopes.includes(scope))) {
    throw new HttpError(409, "Reconnect Google so Align can use the Tasks scope.");
  }

  const savedSettings = await getGoogleTaskBridgeSettings(env, userId);
  const mergedSettings = {
    ...savedSettings,
    ...incomingSettings,
    enabled: incomingSettings.enabled ?? savedSettings.enabled,
  };

  if (!mergedSettings.enabled) {
    throw new HttpError(409, "Enable the Google Tasks bridge first.");
  }

  const lists = await getGoogleTaskLists(env, connection);
  const todayList = await ensureGoogleTaskList(env, connection, lists, mergedSettings.todayListId, "Align Today");
  let inboxList = await ensureGoogleTaskList(env, connection, lists, mergedSettings.inboxListId, "Align Inbox");
  if (inboxList.id === todayList.id) {
    inboxList = await createGoogleTaskList(env, connection, lists, "Align Inbox");
  }
  const settings = await upsertGoogleTaskBridgeSettings(env, userId, {
    ...mergedSettings,
    todayListId: todayList.id,
    inboxListId: inboxList.id,
  });

  const mirrorResult = await syncAlignTodayTasks(env, connection, userId, todayList.id, workspace);
  const importResult = await importGoogleTasksInbox(env, connection, userId, inboxList.id, workspace);
  const lastSyncedAt = new Date().toISOString();
  await upsertGoogleTaskBridgeSettings(env, userId, {
    ...settings,
    enabled: true,
    todayListId: todayList.id,
    inboxListId: inboxList.id,
    lastSyncedAt,
    lastError: "",
  });

  return {
    settings: {
      ...settings,
      enabled: true,
      todayListId: todayList.id,
      inboxListId: inboxList.id,
      lastSyncedAt,
      lastError: "",
    },
    lists: await getGoogleTaskLists(env, connection),
    ...mirrorResult,
    ...importResult,
  };
}

async function ensureGoogleTaskList(env, connection, lists, listId, defaultTitle) {
  const existingById = listId ? lists.find((list) => list.id === listId) : null;
  if (existingById) return existingById;

  const existingByName = lists.find((list) => list.title.toLowerCase() === defaultTitle.toLowerCase());
  if (existingByName) return existingByName;

  return createGoogleTaskList(env, connection, lists, defaultTitle);
}

async function createGoogleTaskList(env, connection, lists, title) {
  const created = await googleTasksRequest(env, connection, "/users/@me/lists", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  const list = { id: created.id, title: created.title || title };
  lists.push(list);

  return list;
}

async function syncTodoTasks(env, connection, userId, todoListId, workspace) {
  const rawAlignTodos = (Array.isArray(workspace.tasks) ? workspace.tasks : []).filter((task) => task?.category === "personal" && !task.projectId);
  const alignTodos = rawAlignTodos.map(cleanAlignTodoSyncMetadata);
  const alignTodoById = new Map(alignTodos.map((task) => [task.id, task]));
  const links = await findGoogleTodoLinks(env, userId);
  const linksByGoogleId = new Map([...links.values()].map((link) => [link.google_task_id, link]));
  const googleTasks = await getGoogleTasksInList(env, connection, todoListId);
  const googleTaskById = new Map(googleTasks.map((task) => [task.id, task]));
  const syncableAlignTodos = dedupeAlignTodosForGoogleSync(alignTodos.filter((task) => task.deletedAt || !isTerminalTaskStatus(task.status)));
  const activeAlignTodoByKey = new Map(syncableAlignTodos.filter((task) => !task.deletedAt).map((task) => [alignTodoSyncKey(task), task]));
  const syncableAlignTodoIds = new Set(syncableAlignTodos.map((task) => task.id));
  const changedTasks = [];
  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  let imported = 0;
  const seenGoogleTaskKeys = new Set();
  const completedByGoogleTodoIds = new Set();

  for (const cleanedTask of alignTodos.filter((task, index) => task !== rawAlignTodos[index])) {
    await upsertSyncedTask(env, userId, cleanedTask);
    changedTasks.push(cleanedTask);
    updated += 1;
  }

  for (const duplicateTask of alignTodos.filter((task) => !task.deletedAt && !isTerminalTaskStatus(task.status) && !syncableAlignTodoIds.has(task.id))) {
    const deletedTask = { ...duplicateTask, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await upsertSyncedTask(env, userId, deletedTask);
    changedTasks.push(deletedTask);
    removed += 1;
  }

  for (const googleTask of googleTasks) {
    if (!googleTask?.id) continue;
    if (!googleTask.deleted && !isCompletedGoogleTask(googleTask)) {
      const googleKey = googleTaskSyncKey(googleTask);
      if (seenGoogleTaskKeys.has(googleKey)) {
        try {
          await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todoListId)}/tasks/${encodeURIComponent(googleTask.id)}`, {
            method: "DELETE",
          });
          removed += 1;
        } catch (error) {
          if (!isRecoverableGoogleTaskLinkError(error)) throw error;
          skipped += 1;
        }
        continue;
      }
      seenGoogleTaskKeys.add(googleKey);
    }
    const link = linksByGoogleId.get(googleTask.id);

    if (!link && isCompletedGoogleTask(googleTask)) continue;

    if (!link && !googleTask.deleted) {
      const markedAlignTask = alignTodoById.get(googleTodoAlignTaskId(googleTask));
      const existingTask =
        markedAlignTask && !markedAlignTask.deletedAt && syncableAlignTodoIds.has(markedAlignTask.id)
          ? markedAlignTask
          : activeAlignTodoByKey.get(googleTaskSyncKey(googleTask));
      const task = existingTask ? mergeGoogleTaskIntoAlignTodo(existingTask, googleTask) : googleTaskToAlignTodo(googleTask);
      await upsertSyncedTask(env, userId, task);
      await upsertGoogleTodoLink(env, userId, task.id, googleTask.id, todoListId, googleTask.updated);
      changedTasks.push(task);
      if (existingTask) {
        updated += 1;
      } else {
        imported += 1;
      }
      continue;
    }

    if (!link) continue;
    const alignTask = alignTodoById.get(link.align_task_id);

    if (googleTask.deleted) {
      if (alignTask && !alignTask.deletedAt) {
        const deletedTask = { ...alignTask, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await upsertSyncedTask(env, userId, deletedTask);
        changedTasks.push(deletedTask);
        removed += 1;
      }
      await deleteGoogleTodoLink(env, userId, link.align_task_id);
      continue;
    }

    if (!alignTask) continue;

    if (isTerminalTaskStatus(alignTask.status)) {
      try {
        const patched = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todoListId)}/tasks/${encodeURIComponent(googleTask.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: googleTask.title || alignTask.title || "Untitled todo",
            notes: stripAlignGoogleTodoNotes(googleTask.notes),
            status: "completed",
            completed: new Date().toISOString(),
          }),
        });
        await upsertGoogleTodoLink(env, userId, alignTask.id, googleTask.id, todoListId, patched.updated);
        updated += 1;
      } catch (error) {
        if (!isRecoverableGoogleTaskLinkError(error)) throw error;
        skipped += 1;
      }
      await deleteGoogleTodoLink(env, userId, alignTask.id);
      continue;
    }

    if (isCompletedGoogleTask(googleTask)) {
      if (!isTerminalTaskStatus(alignTask.status)) {
        completedByGoogleTodoIds.add(alignTask.id);
        const completedAt = new Date().toISOString();
        const completedTask = mergeGoogleTaskIntoAlignTodo(alignTask, googleTask);
        await upsertSyncedTask(env, userId, completedTask);
        changedTasks.push(completedTask);
        updated += 1;

        const nextRecurringTask = createNextRecurringTodoTask(alignTask, completedAt, nextBottomSortOrder(alignTodos));
        if (nextRecurringTask) {
          alignTodos.push(nextRecurringTask);
          await upsertSyncedTask(env, userId, nextRecurringTask);
          changedTasks.push(nextRecurringTask);
          created += 1;
        }
      }
      await deleteGoogleTodoLink(env, userId, link.align_task_id);
      continue;
    }

    const googleChanged = Date.parse(googleTask.updated || "") > Date.parse(link.google_updated_at || link.last_synced_at || "");
    const alignChanged = Date.parse(alignTask.updatedAt || "") > Date.parse(link.last_synced_at || "");

    if (googleChanged && (!alignChanged || Date.parse(googleTask.updated || "") > Date.parse(alignTask.updatedAt || ""))) {
      const nextTask = mergeGoogleTaskIntoAlignTodo(alignTask, googleTask);
      await upsertSyncedTask(env, userId, nextTask);
      await upsertGoogleTodoLink(env, userId, nextTask.id, googleTask.id, todoListId, googleTask.updated);
      changedTasks.push(nextTask);
      updated += 1;
    }
  }

  const refreshedLinks = await findGoogleTodoLinks(env, userId);

  for (const task of syncableAlignTodos) {
    if (completedByGoogleTodoIds.has(task.id)) continue;
    const link = refreshedLinks.get(task.id);
    const googleTask = link?.google_task_id ? googleTaskById.get(link.google_task_id) : null;

    if (task.deletedAt) {
      if (link?.google_task_id) {
        try {
          await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(link.google_list_id)}/tasks/${encodeURIComponent(link.google_task_id)}`, {
            method: "DELETE",
          });
          removed += 1;
        } catch (error) {
          if (!isRecoverableGoogleTaskLinkError(error)) throw error;
          skipped += 1;
        }
        await deleteGoogleTodoLink(env, userId, task.id);
      }
      continue;
    }

    if (link?.google_task_id && link.google_list_id === todoListId && !googleTask) {
      const deletedTask = { ...task, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await upsertSyncedTask(env, userId, deletedTask);
      await deleteGoogleTodoLink(env, userId, task.id);
      changedTasks.push(deletedTask);
      removed += 1;
      continue;
    }

    const payload = alignTodoToGoogleTask(task);

    if (link?.google_task_id && googleTask && !googleTask.deleted) {
      const googleChanged = Date.parse(googleTask.updated || "") > Date.parse(link.google_updated_at || link.last_synced_at || "");
      const alignChanged = Date.parse(task.updatedAt || "") > Date.parse(link.last_synced_at || "");
      const shouldCleanGoogleNotes = hasAlignGoogleTodoMetadata(googleTask) && stripAlignGoogleTodoNotes(googleTask.notes) === (payload.notes || "");
      if (googleChanged && !shouldCleanGoogleNotes && (!alignChanged || Date.parse(googleTask.updated || "") > Date.parse(task.updatedAt || ""))) continue;

      try {
        const patched = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todoListId)}/tasks/${encodeURIComponent(link.google_task_id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await upsertGoogleTodoLink(env, userId, task.id, link.google_task_id, todoListId, patched.updated);
        updated += 1;
        continue;
      } catch (error) {
        if (!isRecoverableGoogleTaskLinkError(error)) throw error;
        await deleteGoogleTodoLink(env, userId, task.id);
        skipped += 1;
      }
    }

    const createdTask = await createGoogleTodoTask(env, connection, todoListId, payload);
    await upsertGoogleTodoLink(env, userId, task.id, createdTask.id, todoListId, createdTask.updated);
    created += 1;
  }

  return { created, updated, removed, skipped, imported, changedTasks };
}

async function createGoogleTodoTask(env, connection, todoListId, payload) {
  try {
    return await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todoListId)}/tasks`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (isGooglePermissionError(error)) {
      throw new HttpError(403, "Google refused writes to this Todo list. Reconnect Google or choose another Google Todo list.");
    }
    throw error;
  }
}

async function getGoogleTasksInList(env, connection, listId) {
  const tasks = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      showCompleted: "true",
      showDeleted: "true",
      showHidden: "true",
      maxResults: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(listId)}/tasks?${params.toString()}`);
    tasks.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return tasks;
}

function alignTodoToGoogleTask(task) {
  const dueDate = validDateKeyOrNull(task.dueDate);
  const notes = stripAlignGoogleTodoNotes(task.description);

  return {
    title: task.title || "Untitled todo",
    notes: notes || "",
    status: isTerminalTaskStatus(task.status) ? "completed" : "needsAction",
    ...(dueDate ? { due: `${dueDate}T00:00:00.000Z` } : { due: null }),
  };
}

function googleTaskToAlignTodo(googleTask, existingTask) {
  const now = new Date().toISOString();
  const cleanNotes = stripAlignGoogleTodoNotes(googleTask.notes);

  return {
    id: existingTask?.id || crypto.randomUUID(),
    title: String(googleTask.title || "Untitled todo").trim() || "Untitled todo",
    description: cleanNotes || undefined,
    projectId: undefined,
    category: "personal",
    priority: existingTask?.priority || "medium",
    status: googleTask.status === "completed" ? "done" : existingTask?.status || "not_started",
    startDate: existingTask?.startDate,
    startTime: existingTask?.startTime,
    dueDate: googleTask.due ? googleTask.due.slice(0, 10) : undefined,
    dueTime: existingTask?.dueTime,
    reminder: existingTask?.reminder || "none",
    recurrence: existingTask?.recurrence || "none",
    sortOrder: existingTask?.sortOrder ?? -Date.now(),
    deletedAt: googleTask.deleted ? now : undefined,
    createdAt: existingTask?.createdAt || googleTask.updated || now,
    updatedAt: googleTask.updated || now,
  };
}

function mergeGoogleTaskIntoAlignTodo(alignTask, googleTask) {
  return googleTaskToAlignTodo(googleTask, alignTask);
}

function dedupeAlignTodosForGoogleSync(tasks) {
  const keptByKey = new Map();

  for (const task of tasks) {
    if (task.deletedAt) {
      keptByKey.set(`${task.id}:deleted`, task);
      continue;
    }

    const key = alignTodoSyncKey(task);
    const existing = keptByKey.get(key);
    if (!existing || preferTaskForGoogleTodoSync(task, existing)) {
      keptByKey.set(key, task);
    }
  }

  return [...keptByKey.values()];
}

function alignTodoSyncKey(task) {
  return [
    normalizeSyncText(task.title),
    validDateKeyOrNull(task.dueDate) || "",
  ].join("|");
}

function googleTaskSyncKey(googleTask) {
  return [
    normalizeSyncText(googleTask.title),
    googleTask.due ? validDateKeyOrNull(googleTask.due.slice(0, 10)) || "" : "",
  ].join("|");
}

function googleTodoAlignTaskId(googleTask) {
  const match = String(googleTask?.notes || "").match(/Align todo ID:\s*([^\s]+)/u);
  return match?.[1] || "";
}

function stripAlignGoogleTodoNotes(value) {
  return String(value || "")
    .split("\n")
    .filter((line) => !line.includes("Synced from Align.") && !line.includes("Align todo ID:") && !line.includes("Align task ID:"))
    .join("\n")
    .trim();
}

function cleanAlignTodoSyncMetadata(task) {
  const description = task.description || "";
  const cleanDescription = stripAlignGoogleTodoNotes(description);
  if (cleanDescription === description.trim()) return task;

  return {
    ...task,
    description: cleanDescription || undefined,
    updatedAt: new Date().toISOString(),
  };
}

function hasAlignGoogleTodoMetadata(googleTask) {
  const notes = String(googleTask?.notes || "");
  return notes.includes("Synced from Align.") || notes.includes("Align todo ID:") || notes.includes("Align task ID:");
}

function isCompletedGoogleTask(googleTask) {
  return googleTask?.status === "completed";
}

function preferTaskForGoogleTodoSync(candidate, existing) {
  const candidateCreatedAt = Date.parse(candidate.createdAt || "");
  const existingCreatedAt = Date.parse(existing.createdAt || "");
  if (!Number.isFinite(existingCreatedAt)) return true;
  if (!Number.isFinite(candidateCreatedAt)) return false;
  return candidateCreatedAt < existingCreatedAt;
}

function normalizeSyncText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().toLowerCase();
}

function nextBottomSortOrder(tasks) {
  const orders = tasks.map((task) => task.sortOrder).filter((value) => Number.isFinite(value));
  return orders.length ? Math.max(...orders) + 1 : 0;
}

function createNextRecurringTodoTask(task, createdAt, sortOrder) {
  const recurrence = normalizeTaskRecurrence(task.recurrence);
  if (recurrence === "none" || !task.dueDate || task.deletedAt) return null;

  const nextDueDate = nextRecurringTodoDate(task.dueDate, recurrence);
  if (!nextDueDate) return null;

  return {
    ...task,
    id: crypto.randomUUID(),
    status: "not_started",
    startDate: nextRecurringTodoStartDate(task.startDate, task.dueDate, nextDueDate) || undefined,
    dueDate: nextDueDate,
    sortOrder,
    recurringParentId: task.recurringParentId || task.id,
    createdAt,
    updatedAt: createdAt,
    deletedAt: undefined,
  };
}

function nextRecurringTodoDate(dueDate, recurrence) {
  const safeDueDate = validDateKeyOrNull(dueDate);
  if (!safeDueDate) return null;

  if (recurrence === "daily") return shiftDateKey(safeDueDate, 1);
  if (recurrence === "weekly") return shiftDateKey(safeDueDate, 7);

  const date = new Date(`${safeDueDate}T00:00:00.000Z`);
  if (recurrence === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  else if (recurrence === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
  else return null;

  return toDateKey(date);
}

function nextRecurringTodoStartDate(startDate, dueDate, nextDueDate) {
  const safeStartDate = validDateKeyOrNull(startDate);
  const safeDueDate = validDateKeyOrNull(dueDate);
  if (!safeStartDate || !safeDueDate || !nextDueDate) return null;

  const start = new Date(`${safeStartDate}T00:00:00.000Z`);
  const due = new Date(`${safeDueDate}T00:00:00.000Z`);
  const nextDue = new Date(`${nextDueDate}T00:00:00.000Z`);
  if (![start, due, nextDue].every((date) => Number.isFinite(date.getTime()))) return null;

  const durationDays = Math.max(0, Math.round((due.getTime() - start.getTime()) / 86400000));
  nextDue.setUTCDate(nextDue.getUTCDate() - durationDays);
  return toDateKey(nextDue);
}

async function upsertSyncedTask(env, userId, task) {
  const row = {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    project_id: null,
    category: "personal",
    priority: normalizeTaskPriority(task.priority),
    status: normalizeTaskStatus(task.status),
    start_date: validDateKeyOrNull(task.startDate),
    start_time: validTimeOrNull(task.startTime),
    due_date: validDateKeyOrNull(task.dueDate),
    due_time: validTimeOrNull(task.dueTime),
    reminder: normalizeTaskReminder(task.reminder),
    recurrence: normalizeTaskRecurrence(task.recurrence),
    recurring_parent_id: task.recurringParentId ?? null,
    sort_order: task.sortOrder ?? null,
    deleted_at: task.deletedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };

  const response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  await response.text();
}

async function syncAlignTodayTasks(env, connection, userId, todayListId, workspace) {
  const projectsById = new Map((workspace.projects || []).map((project) => [project.id, project]));
  const tasks = Array.isArray(workspace.tasks) ? workspace.tasks : [];
  const syncableTasks = tasks.filter((task) => shouldMirrorTaskToGoogleTasks(task));
  const activeTaskIds = new Set(syncableTasks.map((task) => task.id));
  const links = await findGoogleTaskLinks(env, userId, "today");
  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;

  for (const task of syncableTasks) {
    const link = links.get(task.id);
    const payload = alignTaskToGoogleTask(task, projectsById.get(task.projectId));

    if (link?.google_task_id) {
      try {
        await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todayListId)}/tasks/${encodeURIComponent(link.google_task_id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await upsertGoogleTaskLink(env, userId, task.id, link.google_task_id, todayListId, "today");
        updated += 1;
      } catch (error) {
        if (error.status !== 404) throw error;
        const createdTask = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todayListId)}/tasks`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await upsertGoogleTaskLink(env, userId, task.id, createdTask.id, todayListId, "today", createdTask.updated);
        created += 1;
      }
    } else {
      const createdTask = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(todayListId)}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await upsertGoogleTaskLink(env, userId, task.id, createdTask.id, todayListId, "today", createdTask.updated);
      created += 1;
    }
  }

  for (const [taskId, link] of links) {
    if (activeTaskIds.has(taskId)) continue;

    try {
      await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(link.google_list_id)}/tasks/${encodeURIComponent(link.google_task_id)}`, {
        method: "DELETE",
      });
      removed += 1;
    } catch (error) {
      if (error.status !== 404) throw error;
      skipped += 1;
    }

    await deleteGoogleTaskLink(env, userId, taskId, "today");
  }

  return { created, updated, removed, skipped };
}

async function importGoogleTasksInbox(env, connection, userId, inboxListId, workspace) {
  const params = new URLSearchParams({
    showCompleted: "false",
    showDeleted: "false",
    showHidden: "false",
    maxResults: "100",
  });
  const data = await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(inboxListId)}/tasks?${params.toString()}`);
  const googleTasks = data.items || [];
  const existingLinks = await findGoogleTaskImportLinks(env, userId);
  const importedTasks = [];
  const importConflicts = [];

  for (const googleTask of googleTasks) {
    if (!googleTask.id || existingLinks.has(`${inboxListId}:${googleTask.id}`)) continue;
    if (isAlignOwnedGoogleTask(googleTask)) continue;

    const parsed = parseGoogleInboxTitle(googleTask.title || "Untitled task", workspace.projects || []);
    const now = new Date().toISOString();

    const task = {
      id: crypto.randomUUID(),
      title: parsed.title,
      description: googleTask.notes || undefined,
      projectId: parsed.projectId || undefined,
      category: parsed.projectId ? "project" : "personal",
      priority: "medium",
      status: "not_started",
      dueDate: googleTask.due ? googleTask.due.slice(0, 10) : undefined,
      reminder: "none",
      recurrence: "none",
      sortOrder: -Date.now() - importedTasks.length,
      createdAt: now,
      updatedAt: now,
    };

    await upsertImportedTask(env, userId, task);
    await upsertGoogleTaskLink(env, userId, task.id, googleTask.id, inboxListId, "inbox", googleTask.updated, now);
    await completeImportedGoogleTask(env, connection, inboxListId, googleTask, `Imported into Align as ${task.id}.`);
    importedTasks.push(task);
    if (parsed.conflict) importConflicts.push(parsed.conflict);
  }

  return { imported: importedTasks.length, importedTasks, importConflicts };
}

function isAlignOwnedGoogleTask(googleTask) {
  const notes = String(googleTask.notes || "");
  return hasAlignGoogleTodoMetadata(googleTask) || notes.includes("Imported into Align");
}

function shouldMirrorTaskToGoogleTasks(task) {
  if (!task?.id || !task.dueDate || task.deletedAt || isTerminalTaskStatus(task.status)) return false;

  const dueDate = validDateKeyOrNull(task.dueDate);
  if (!dueDate) return false;

  const today = toDateKey(new Date());
  const horizon = shiftDateKey(today, 3);
  return dueDate <= horizon;
}

function alignTaskToGoogleTask(task, project) {
  const projectName = project?.name || "Personal";

  return {
    title: `[${projectName}] ${task.title || "Untitled task"}`,
    notes: task.description || "",
    status: "needsAction",
    due: `${validDateKeyOrNull(task.dueDate)}T00:00:00.000Z`,
  };
}

function parseGoogleInboxTitle(rawTitle, projects) {
  const title = String(rawTitle || "Untitled task").trim();
  const bracketMatch = title.match(/^\[([^\]]+)\]\s*(.+)$/u);
  const atMatch = title.match(/^(.*?)\s+@(.+)$/u);
  const hashMatch = title.match(/^(.*?)\s+#([^\s].*)$/u);
  const projectHint = bracketMatch?.[1] || atMatch?.[2] || hashMatch?.[2] || "";
  const taskTitle = (bracketMatch?.[2] || atMatch?.[1] || hashMatch?.[1] || title).trim() || title;

  if (!projectHint.trim()) {
    return { title: taskTitle };
  }

  const normalizedHint = normalizeMatchText(projectHint);
  const exact = projects.find((project) => normalizeMatchText(project.name) === normalizedHint);
  if (exact) return { title: taskTitle, projectId: exact.id };

  const matches = projects.filter((project) => normalizeMatchText(project.name).includes(normalizedHint) || normalizedHint.includes(normalizeMatchText(project.name)));
  if (matches.length === 1) return { title: taskTitle, projectId: matches[0].id };

  return {
    title: taskTitle,
    conflict: {
      title: taskTitle,
      hint: projectHint,
      matches: matches.map((project) => project.name),
      reason: matches.length ? "Multiple project matches." : "No project match.",
    },
  };
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

async function completeImportedGoogleTask(env, connection, listId, googleTask, note) {
  await googleTasksRequest(env, connection, `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(googleTask.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "completed",
      notes: [googleTask.notes || "", "", note].filter(Boolean).join("\n"),
    }),
  });
}

async function upsertImportedTask(env, userId, task) {
  const row = {
    id: task.id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    project_id: task.projectId ?? null,
    category: task.category,
    priority: task.priority,
    status: task.status,
    start_date: null,
    start_time: null,
    due_date: validDateKeyOrNull(task.dueDate),
    due_time: null,
    reminder: task.reminder,
    recurrence: task.recurrence,
    recurring_parent_id: null,
    sort_order: task.sortOrder ?? null,
    deleted_at: null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };

  const response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/tasks`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  await response.text();
}

async function findGoogleTaskLinks(env, userId, syncType) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_task_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("sync_type", `eq.${syncType}`);
  url.searchParams.set("select", "align_task_id,google_task_id,google_list_id,last_synced_at,google_updated_at");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return new Map(rows.map((row) => [row.align_task_id, row]));
  } catch (error) {
    if (isMissingGoogleTasksBridgeTable(error)) return new Map();
    throw error;
  }
}

async function findGoogleTaskImportLinks(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_task_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("sync_type", "eq.inbox");
  url.searchParams.set("select", "google_task_id,google_list_id");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return new Set(rows.map((row) => `${row.google_list_id}:${row.google_task_id}`));
  } catch (error) {
    if (isMissingGoogleTasksBridgeTable(error)) return new Set();
    throw error;
  }
}

async function upsertGoogleTaskLink(env, userId, taskId, googleTaskId, googleListId, syncType, googleUpdatedAt, importedAt) {
  const row = {
    user_id: userId,
    align_task_id: taskId,
    google_task_id: googleTaskId,
    google_list_id: googleListId,
    sync_type: syncType,
    google_updated_at: googleUpdatedAt || null,
    imported_at: importedAt || null,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const url = new URL(`${env.supabaseUrl}/rest/v1/google_task_links`);
  url.searchParams.set("on_conflict", "user_id,align_task_id,sync_type");
  const response = await serviceFetch(env, url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  await response.text();
}

async function deleteGoogleTaskLink(env, userId, taskId, syncType) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_task_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("align_task_id", `eq.${taskId}`);
  url.searchParams.set("sync_type", `eq.${syncType}`);
  await serviceFetch(env, url, { method: "DELETE" });
}

async function findGoogleTodoLinks(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_todo_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "align_task_id,google_task_id,google_list_id,last_synced_at,google_updated_at");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return new Map(rows.map((row) => [row.align_task_id, row]));
  } catch (error) {
    if (isMissingGoogleTodoSyncTable(error)) return new Map();
    throw error;
  }
}

async function upsertGoogleTodoLink(env, userId, taskId, googleTaskId, googleListId, googleUpdatedAt) {
  const row = {
    user_id: userId,
    align_task_id: taskId,
    google_task_id: googleTaskId,
    google_list_id: googleListId,
    google_updated_at: googleUpdatedAt || null,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const url = new URL(`${env.supabaseUrl}/rest/v1/google_todo_links`);
  url.searchParams.set("on_conflict", "user_id,align_task_id");
  const response = await serviceFetch(env, url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  await response.text();
}

async function deleteGoogleTodoLink(env, userId, taskId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_todo_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("align_task_id", `eq.${taskId}`);
  await serviceFetch(env, url, { method: "DELETE" });
}

function normalizeGoogleTaskBridgeSettings(row) {
  return {
    enabled: Boolean(row?.enabled),
    todayListId: row?.today_list_id || "",
    inboxListId: row?.inbox_list_id || "",
    lastSyncedAt: row?.last_synced_at || undefined,
    lastError: row?.last_error || undefined,
    updatedAt: row?.updated_at || undefined,
  };
}

function normalizeGoogleTodoSyncSettings(row) {
  return {
    enabled: Boolean(row?.enabled),
    todoListId: row?.todo_list_id || "",
    lastSyncedAt: row?.last_synced_at || undefined,
    lastError: row?.last_error || undefined,
    updatedAt: row?.updated_at || undefined,
  };
}

function isMissingGoogleTasksBridgeTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("google_task_bridge_settings") || message.includes("google_task_links") || message.includes("pgrst205");
}

function isMissingGoogleTodoSyncTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("google_todo_sync_settings") || message.includes("google_todo_links") || message.includes("pgrst205");
}

function isRecoverableGoogleTaskLinkError(error) {
  return error?.status === 404 || isGooglePermissionError(error);
}

function isGooglePermissionError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.status === 403 || message.includes("caller does not have permission") || message.includes("forbidden");
}

export function taskToGoogleEvent(task) {
  const dueDate = validDateKeyOrNull(task.dueDate);
  if (!dueDate) {
    throw new HttpError(422, `Task "${task.title || task.id}" needs a valid due date before Google Calendar sync.`);
  }

  const startDate = validDateKeyOrNull(task.startDate);
  const startTime = validTimeOrNull(task.startTime);
  const dueTime = validTimeOrNull(task.dueTime);
  const hasTimedDue = Boolean(dueTime);

  if (hasTimedDue) {
    const start = timedEventStart({ startDate, startTime, dueDate, dueTime });
    const end = timedEventEnd(start, { dueDate, dueTime });

    return {
      ...baseGoogleEvent(task),
      start: { dateTime: start, timeZone: appTimeZone() },
      end: { dateTime: end, timeZone: appTimeZone() },
    };
  }

  const allDayStartDate = startDate || dueDate;
  const allDayEndDate = dueDate >= allDayStartDate ? dueDate : allDayStartDate;
  const endDate = new Date(`${allDayEndDate}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    ...baseGoogleEvent(task),
    start: { date: allDayStartDate },
    end: { date: endDate.toISOString().slice(0, 10) },
  };
}

function baseGoogleEvent(task) {
  return {
    summary: task.title,
    description: [
      task.description || "",
      "",
      "Synced from Align.",
      `Priority: ${task.priority}`,
      `Status: ${task.status}`,
    ]
      .filter(Boolean)
      .join("\n"),
    extendedProperties: {
      private: {
        alignTaskId: task.id,
      },
    },
  };
}

function timedEventStart({ startDate, startTime: safeStartTime, dueDate, dueTime: safeDueTime }) {
  const eventStartDate = startDate && safeStartTime ? startDate : dueDate;
  const eventStartTime = startDate && safeStartTime ? safeStartTime : safeDueTime;

  if (!eventStartDate || !eventStartTime) {
    throw new HttpError(422, "Invalid start time.");
  }

  return `${eventStartDate}T${normalizeTime(eventStartTime)}`;
}

function timedEventEnd(startDateTime, { dueDate, dueTime: safeDueTime }) {
  const endDateTime = dueDate && safeDueTime ? `${dueDate}T${normalizeTime(safeDueTime)}` : startDateTime;
  if (endDateTime > startDateTime) return endDateTime;
  const fallbackEnd = new Date(`${startDateTime}.000Z`);
  fallbackEnd.setMinutes(fallbackEnd.getMinutes() + 60);
  return fallbackEnd.toISOString().slice(0, 19);
}

function normalizeTime(value) {
  const safeTime = validTimeOrNull(value) || "09:00";
  return `${safeTime}:00`;
}

function validTimeOrNull(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function validDateKeyOrNull(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

function appTimeZone() {
  return process.env.APP_TIME_ZONE || "Asia/Karachi";
}

export function googleEventToCalendarEvent(event) {
  const startDate = event.start?.date || event.start?.dateTime?.slice(0, 10);
  const endDate = event.end?.date || event.end?.dateTime?.slice(0, 10);
  const linkedTaskId = event.extendedProperties?.private?.alignTaskId;

  return {
    id: `google:${event.id}`,
    title: event.summary || "Untitled Google event",
    description: event.description || undefined,
    startDate,
    endDate,
    linkedTaskId: linkedTaskId || undefined,
    source: "google",
  };
}

export async function findTaskLinks(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_task_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "task_id,google_event_id,last_synced_at");

  let response;
  try {
    response = await serviceFetch(env, url);
  } catch (error) {
    if (!String(error.message || "").includes("last_synced_at")) {
      throw error;
    }

    const fallbackUrl = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_task_links`);
    fallbackUrl.searchParams.set("user_id", `eq.${userId}`);
    fallbackUrl.searchParams.set("select", "task_id,google_event_id");
    response = await serviceFetch(env, fallbackUrl);
  }

  const rows = await response.json();
  return new Map(rows.map((row) => [row.task_id, row]));
}

export async function findGoogleCalendarConnections(env) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_connections`);
  url.searchParams.set("select", "user_id,calendar_id,access_token,refresh_token,expires_at,updated_at,scopes");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  return rows.map((row) => decryptGoogleConnection(env, row));
}

export async function findWorkspaceUserIds(env) {
  const userIds = new Set();

  for (const table of ["tasks", "projects", "google_calendar_connections"]) {
    const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", "user_id");

    const response = await serviceFetch(env, url);
    const rows = await response.json();
    rows.forEach((row) => {
      if (row.user_id) userIds.add(row.user_id);
    });
  }

  return [...userIds];
}

export async function findTasksForUser(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/tasks`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "id,title,description,project_id,category,priority,status,start_date,start_time,due_date,due_time,reminder,deleted_at,created_at,updated_at");
  url.searchParams.set("order", "due_date.asc.nullslast");

  let response;
  try {
    response = await serviceFetch(env, url);
  } catch (error) {
    const message = String(error.message || "").toLowerCase();
    if (!["reminder", "start_time", "due_time"].some((column) => message.includes(column))) {
      throw error;
    }

    const fallbackUrl = new URL(`${env.supabaseUrl}/rest/v1/tasks`);
    fallbackUrl.searchParams.set("user_id", `eq.${userId}`);
    fallbackUrl.searchParams.set("select", "id,title,description,project_id,category,priority,status,start_date,due_date,deleted_at,created_at,updated_at");
    fallbackUrl.searchParams.set("order", "due_date.asc.nullslast");
    response = await serviceFetch(env, fallbackUrl);
  }
  const rows = await response.json();

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    projectId: row.project_id || undefined,
    category: row.category,
    priority: normalizeTaskPriority(row.priority),
    status: normalizeTaskStatus(row.status),
    startDate: row.start_date || undefined,
    startTime: validTimeOrNull(row.start_time) || undefined,
    dueDate: row.due_date || undefined,
    dueTime: validTimeOrNull(row.due_time) || undefined,
    reminder: normalizeTaskReminder(row.reminder),
    deletedAt: row.deleted_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function syncTasksToGoogleCalendarForUser(env, userId, tasks, options = {}) {
  const connection = await requireGoogleConnection(env, userId);
  const forceTaskIds = new Set(Array.isArray(options.forceTaskIds) ? options.forceTaskIds : []);
  const links = await findTaskLinks(env, userId);
  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  const conflicts = [];

  for (const task of tasks) {
    const link = links.get(task.id);
    const linkedEventId = link?.google_event_id;
    const dueDate = validDateKeyOrNull(task.dueDate);
    const shouldSync = dueDate && !isTerminalTaskStatus(task.status) && !task.deletedAt;

    if (!shouldSync) {
      skipped += 1;

      if (linkedEventId) {
        await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`, { method: "DELETE" });
        await deleteTaskLink(env, userId, task.id);
        removed += 1;
      }

      continue;
    }

    let eventPayload;
    try {
      eventPayload = taskToGoogleEvent(task);
    } catch (error) {
      skipped += 1;
      continue;
    }

    if (linkedEventId) {
      const googleEvent = await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`);

      if (wasGoogleEventEditedAfterLastSync(link, googleEvent) && !forceTaskIds.has(task.id)) {
        conflicts.push({
          taskId: task.id,
          taskTitle: task.title,
          googleEventId: linkedEventId,
          googleUpdatedAt: googleEvent.updated,
        });
        skipped += 1;
        continue;
      }

      try {
        const updatedEvent = await googleCalendarRequest(env, connection, `/events/${encodeURIComponent(linkedEventId)}`, {
          method: "PATCH",
          body: JSON.stringify(eventPayload),
        });
        await upsertTaskLink(env, userId, task.id, linkedEventId, updatedEvent.updated);
        updated += 1;
      } catch (error) {
        if (!isRecoverableGoogleEventError(error)) throw error;
        skipped += 1;
      }
    } else {
      try {
        const createdEvent = await googleCalendarRequest(env, connection, "/events", {
          method: "POST",
          body: JSON.stringify(eventPayload),
        });
        await upsertTaskLink(env, userId, task.id, createdEvent.id, createdEvent.updated);
        created += 1;
      } catch (error) {
        if (!isRecoverableGoogleEventError(error)) throw error;
        skipped += 1;
      }
    }
  }

  return { created, updated, removed, skipped, conflicts };
}

function isRecoverableGoogleEventError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("invalid start time") || message.includes("invalid end time") || message.includes("invalid time");
}

export async function createReminderNotificationsForUser(env, userId, tasks, now = new Date()) {
  const today = toDateKey(now);
  const rows = tasks
    .filter((task) => task.dueDate && !task.deletedAt && !isTerminalTaskStatus(task.status))
    .map((task) => buildReminderNotification(userId, task, today))
    .filter(Boolean);

  if (!rows.length) {
    return { reminders: 0 };
  }

  let response;
  try {
    response = await serviceFetch(
      env,
      `${env.supabaseUrl}/rest/v1/notifications?on_conflict=user_id,task_id,type,scheduled_for`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(rows),
      },
    );
  } catch (error) {
    if (String(error.message || "").includes("notifications")) {
      return { reminders: 0, reminderSkipped: true };
    }

    throw error;
  }
  await response.text();

  return { reminders: rows.length };
}

export async function sendReminderEmailsForUser(env, userId) {
  if (!env.resendApiKey || !env.reminderEmailFrom) {
    return { emails: 0, emailFailed: 0, emailSkipped: true };
  }

  const preferences = await findUserPreferences(env, userId);
  if (preferences && preferences.email_reminders_enabled === false) {
    return { emails: 0, emailFailed: 0, emailSkipped: true };
  }

  const notifications = await findDueReminderNotificationsForUser(env, userId);

  if (!notifications.length) {
    return { emails: 0, emailFailed: 0 };
  }

  const email = await findUserEmail(env, userId);

  if (!email) {
    return { emails: 0, emailFailed: notifications.length, emailError: "No email found for user." };
  }

  let emails = 0;
  let emailFailed = 0;

  for (const notification of notifications) {
    try {
      await sendReminderEmail(env, email, notification);
      await markNotificationEmailSent(env, notification.id);
      emails += 1;
    } catch (error) {
      emailFailed += 1;
      await markNotificationEmailError(env, notification.id, error.message || "Email delivery failed.");
    }
  }

  return { emails, emailFailed };
}

async function findUserPreferences(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/user_preferences`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "email_reminders_enabled");
  url.searchParams.set("limit", "1");

  try {
    const response = await serviceFetch(env, url);
    const rows = await response.json();
    return rows[0] || null;
  } catch (error) {
    if (String(error.message || "").includes("user_preferences")) return null;
    throw error;
  }
}

export async function findDueReminderNotificationsForUser(env, userId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/notifications`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("type", "eq.task-reminder");
  url.searchParams.set("scheduled_for", `lte.${new Date().toISOString()}`);
  url.searchParams.set("email_sent_at", "is.null");
  url.searchParams.set("select", "id,title,message,scheduled_for,email_sent_at,email_error");
  url.searchParams.set("order", "scheduled_for.asc");
  url.searchParams.set("limit", "25");

  try {
    const response = await serviceFetch(env, url);
    return response.json();
  } catch (error) {
    if (String(error.message || "").includes("email_sent_at") || String(error.message || "").includes("notifications")) {
      return [];
    }

    throw error;
  }
}

async function findUserEmail(env, userId) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) return "";

  const user = await response.json();
  return user.email || "";
}

async function sendReminderEmail(env, to, notification) {
  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.reminderEmailFrom,
      to,
      subject: notification.title,
      text: `${notification.message}\n\nOpen Align: ${env.appUrl}`,
      html: reminderEmailHtml(env, notification),
      ...(env.reminderEmailReplyTo ? { reply_to: env.reminderEmailReplyTo } : {}),
    }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError(response.status, data?.message || data?.error || "Email delivery failed.");
  }
}

function reminderEmailHtml(env, notification) {
  const title = escapeHtml(notification.title);
  const message = escapeHtml(notification.message);
  const appUrl = escapeHtml(env.appUrl || "#");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f5fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;">${message}</div>
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="border-radius:22px;background:#ffffff;border:1px solid #e5e7eb;box-shadow:0 18px 45px rgba(15,23,42,.08);overflow:hidden;">
        <div style="background:#111425;padding:22px 26px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-.02em;">Align</p>
          <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Task Reminder</p>
        </div>
        <div style="padding:28px 26px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#111827;">${title}</h1>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">${message}</p>
          <a href="${appUrl}" style="display:inline-block;border-radius:12px;background:#8b5cf6;color:#ffffff;text-decoration:none;font-weight:800;padding:13px 18px;">Open Align</a>
          <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">You are receiving this because a task reminder is due in Align.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function markNotificationEmailSent(env, notificationId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/notifications`);
  url.searchParams.set("id", `eq.${notificationId}`);
  const response = await serviceFetch(env, url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ email_sent_at: new Date().toISOString(), email_error: null }),
  });
  await response.text();
}

async function markNotificationEmailError(env, notificationId, message) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/notifications`);
  url.searchParams.set("id", `eq.${notificationId}`);
  const response = await serviceFetch(env, url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ email_error: message.slice(0, 500) }),
  });
  await response.text();
}

function buildReminderNotification(userId, task, today) {
  const reminder = normalizeTaskReminder(task.reminder);
  const offsetDays = reminderOffsetDays(reminder);

  if (offsetDays === null || !task.dueDate) return null;

  const scheduledDate = shiftDateKey(task.dueDate, -offsetDays);
  if (scheduledDate > today || task.dueDate < today) return null;

  const id = crypto
    .createHash("sha256")
    .update(`${userId}:${task.id}:task-reminder:${scheduledDate}`)
    .digest("hex")
    .slice(0, 32);

  return {
    id,
    user_id: userId,
    task_id: task.id,
    type: "task-reminder",
    title: `Reminder: ${task.title}`,
    message: reminderMessage(task, today),
    scheduled_for: scheduledReminderIso(scheduledDate, task.dueTime),
    created_at: new Date().toISOString(),
  };
}

function scheduledReminderIso(dateKey, time) {
  return new Date(`${dateKey}T${normalizeTime(time || "09:00")}${process.env.APP_TIME_ZONE_OFFSET || "+05:00"}`).toISOString();
}

function reminderMessage(task, today) {
  if (task.dueDate === today) return `${task.title} is due today.`;
  if (task.dueDate === shiftDateKey(today, 1)) return `${task.title} is due tomorrow.`;

  return `${task.title} is due on ${task.dueDate}.`;
}

function reminderOffsetDays(reminder) {
  if (reminder === "due-date") return 0;
  if (reminder === "day-before") return 1;
  if (reminder === "two-days-before") return 2;
  if (reminder === "week-before") return 7;

  return null;
}

export async function upsertTaskLink(env, userId, taskId, googleEventId, lastSyncedAt = new Date().toISOString()) {
  const row = {
      user_id: userId,
      task_id: taskId,
      google_event_id: googleEventId,
      last_synced_at: lastSyncedAt,
      updated_at: new Date().toISOString(),
    };
  let response;

  try {
    response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/google_calendar_task_links`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch (error) {
    if (!String(error.message || "").includes("last_synced_at")) {
      throw error;
    }

    const { last_synced_at: _lastSyncedAt, ...fallbackRow } = row;
    response = await serviceFetch(env, `${env.supabaseUrl}/rest/v1/google_calendar_task_links`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(fallbackRow),
    });
  }

  await response.text();
}

export function wasGoogleEventEditedAfterLastSync(link, googleEvent) {
  if (!link?.last_synced_at || !googleEvent?.updated) return false;

  const lastSyncedAt = new Date(link.last_synced_at).getTime();
  const googleUpdatedAt = new Date(googleEvent.updated).getTime();

  if (!Number.isFinite(lastSyncedAt) || !Number.isFinite(googleUpdatedAt)) return false;

  return googleUpdatedAt > lastSyncedAt + 2000;
}

export async function deleteTaskLink(env, userId, taskId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_task_links`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("task_id", `eq.${taskId}`);
  await serviceFetch(env, url, { method: "DELETE" });
}

export async function deleteGoogleConnection(env, userId) {
  const connectionUrl = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_connections`);
  connectionUrl.searchParams.set("user_id", `eq.${userId}`);
  await serviceFetch(env, connectionUrl, { method: "DELETE" });

  const linksUrl = new URL(`${env.supabaseUrl}/rest/v1/google_calendar_task_links`);
  linksUrl.searchParams.set("user_id", `eq.${userId}`);
  await serviceFetch(env, linksUrl, { method: "DELETE" });
}

export async function revokeGoogleToken(token) {
  if (!token) return;

  await fetch(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}

export async function serviceFetch(env, input, options = {}) {
  const response = await fetch(input, {
    ...options,
    headers: {
      apikey: env.supabaseServiceRoleKey,
      authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(response.status, detail || "Supabase service request failed.");
  }

  return response;
}

export function handleApiError(res, error) {
  const status = error instanceof HttpError ? error.status : 500;
  res.status(status).json({ error: error.message || "Unexpected server error." });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function allowedApiOrigins(env) {
  const origins = [
    env.appUrl,
    ...String(env.allowedApiOrigins || "")
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "http://tauri.localhost",
    "tauri://localhost",
  ];

  return new Set(origins.filter(Boolean).map((origin) => origin.replace(/\/$/u, "")));
}

function normalizeOrigin(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.includes("://")) return trimmed.replace(/\/$/u, "");
  return normalizeUrl(trimmed);
}

function encryptGoogleToken(env, token) {
  if (!token) return token;
  if (String(token).startsWith(ENCRYPTED_TOKEN_PREFIX)) return token;

  const key = googleTokenKey(env);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_TOKEN_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptGoogleToken(env, token) {
  if (!token || !String(token).startsWith(ENCRYPTED_TOKEN_PREFIX)) return token || "";

  const [, encoded] = String(token).split(ENCRYPTED_TOKEN_PREFIX);
  const [ivValue, tagValue, encryptedValue] = encoded.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new HttpError(500, "Saved Google token is malformed.");
  }

  const key = googleTokenKey(env);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function decryptGoogleConnection(env, connection) {
  return {
    ...connection,
    access_token: decryptGoogleToken(env, connection.access_token),
    refresh_token: decryptGoogleToken(env, connection.refresh_token),
  };
}

function googleTokenKey(env) {
  const configured = String(env.googleTokenEncryptionKey || "").trim();
  if (!configured) {
    throw new HttpError(500, "Missing server configuration: googleTokenEncryptionKey.");
  }

  if (/^[A-Za-z0-9_-]{43,44}$/u.test(configured)) {
    const decoded = Buffer.from(configured, "base64url");
    if (decoded.length === 32) return decoded;
  }

  if (/^[a-f0-9]{64}$/iu.test(configured)) {
    return Buffer.from(configured, "hex");
  }

  return crypto.createHash("sha256").update(configured).digest();
}

function normalizeTaskPriority(priority) {
  if (priority === "critical") return "urgent";
  return ["high", "low", "medium", "urgent"].includes(priority) ? priority : "medium";
}

function normalizeTaskStatus(status) {
  if (status === "completed") return "done";
  if (status === "backlog" || status === "not-started") return "not_started";
  if (status === "in-progress") return "in_progress";
  if (status === "approval-pending" || status === "under-review") return "review";
  if (status === "blocked" || status === "postponed" || status === "cancelled") return "waiting";
  return [
    "in_progress",
    "not_started",
    "approved",
    "done",
    "delivered",
    "waiting",
    "review",
  ].includes(status)
    ? status
    : "not_started";
}

function normalizeTaskReminder(reminder) {
  return ["none", "due-date", "day-before", "two-days-before", "week-before"].includes(reminder) ? reminder : "none";
}

function normalizeTaskRecurrence(recurrence) {
  return ["none", "daily", "weekly", "monthly", "yearly"].includes(recurrence) ? recurrence : "none";
}

function isTerminalTaskStatus(status) {
  return status === "done" || status === "delivered" || status === "cancelled" || status === "completed";
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(value, offsetDays) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return toDateKey(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function signState(env, encodedPayload) {
  return crypto.createHmac("sha256", env.stateSecret).update(encodedPayload).digest("base64url");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
