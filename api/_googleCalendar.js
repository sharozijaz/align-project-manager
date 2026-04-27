import crypto from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";

export const calendarScopes = ["https://www.googleapis.com/auth/calendar.events.owned"];

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
    `${appUrl}/api/google-calendar/callback`;
  const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || process.env.VITE_GOOGLE_CALENDAR_ID || "primary";
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || supabaseServiceRoleKey || googleClientSecret;

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

export function ensureEnv(res, env, keys) {
  const missing = keys.filter((key) => !env[key]);

  if (!missing.length) return false;

  res.status(500).json({ error: `Missing server configuration: ${missing.join(", ")}.` });
  return true;
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
  url.searchParams.set("scope", calendarScopes.join(" "));
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
    access_token: tokens.access_token,
    ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
    expires_at: expiresAt,
    calendar_id: env.googleCalendarId,
    scopes: calendarScopes,
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
  return rows[0] || null;
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

export function taskToGoogleEvent(task) {
  const endDate = new Date(`${task.dueDate}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

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
    start: { date: task.dueDate },
    end: { date: endDate.toISOString().slice(0, 10) },
    extendedProperties: {
      private: {
        alignTaskId: task.id,
      },
    },
  };
}

export function googleEventToCalendarEvent(event) {
  const startDate = event.start?.date || event.start?.dateTime?.slice(0, 10);
  const endDate = event.end?.date || event.end?.dateTime?.slice(0, 10);

  return {
    id: `google:${event.id}`,
    title: event.summary || "Untitled Google event",
    description: event.description || undefined,
    startDate,
    endDate,
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

function signState(env, encodedPayload) {
  return crypto.createHmac("sha256", env.stateSecret).update(encodedPayload).digest("base64url");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
