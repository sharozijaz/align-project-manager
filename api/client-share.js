import crypto from "node:crypto";
import { getEnv, handleApiError, requireMethod, serviceFetch } from "./_googleCalendar.js";
import {
  applyRateLimit,
  readJsonBody,
  rejectOversizedPayload,
  requireJsonPayload,
  sanitizeSharePassword,
} from "./_security.js";

const SHARE_PASSWORD_MAX_BYTES = 4 * 1024;

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    if (requireMethod(req, res, "GET")) return;
  }
  if (applyRateLimit(req, res, { keyPrefix: "client-share", max: 60 })) return;
  if (rejectOversizedPayload(req, res, SHARE_PASSWORD_MAX_BYTES)) return;
  if (requireJsonPayload(req, res)) return;

  const env = getEnv();
  const token = String(req.query.token || "").trim();

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    res.status(500).json({ error: "Missing Supabase server configuration." });
    return;
  }

  if (!/^[a-f0-9]{48}$/iu.test(token)) {
    res.status(404).json({ error: "Client overview not found." });
    return;
  }

  try {
    const link = await findClientLink(env, token);
    if (!link) {
      res.status(404).json({ error: "Client overview not found or disabled." });
      return;
    }

    if (link.password_hash) {
      if (applyRateLimit(req, res, { keyPrefix: `client-share-auth:${token}`, max: 5 })) return;
      const password = await readSharePassword(req);
      if (!verifySharePassword(token, password, link.password_hash)) {
        res.status(401).json({
          error: password ? "Incorrect overview password." : "Password required.",
          passwordRequired: true,
        });
        return;
      }
    }

    const projects = await Promise.all(
      (link.project_tokens || []).map(async (projectToken) => {
        const payload = await fetchProjectShare(env, projectToken);
        return payload;
      }),
    );

    res.status(200).json({
      clientName: link.name || "",
      projects: projects.filter(Boolean),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function findClientLink(env, token) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/client_share_links`);
  url.searchParams.set("token", `eq.${token}`);
  url.searchParams.set("enabled", "eq.true");
  url.searchParams.set("select", "name,project_tokens,password_hash");
  url.searchParams.set("limit", "1");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  return rows[0] || null;
}

async function fetchProjectShare(env, token) {
  const share = await findProjectShare(env, token);
  if (!share) return null;

  const [project, tasks, notes] = await Promise.all([
    findProject(env, share.user_id, share.project_id),
    findProjectTasks(env, share.user_id, share.project_id),
    findLinkedHubNotes(env, share.user_id, share.project_id),
  ]);

  if (!project) return null;

  return {
    project: { ...rowToProject(project), notes: notes.map(rowToHubNote), shareToken: token },
    tasks: tasks.map(rowToTask),
  };
}

async function findProjectShare(env, token) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/project_shares`);
  url.searchParams.set("token", `eq.${token}`);
  url.searchParams.set("enabled", "eq.true");
  url.searchParams.set("select", "user_id,project_id,expires_at");
  url.searchParams.set("limit", "1");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  const share = rows[0];

  if (!share) return null;
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return null;

  return share;
}

async function findProject(env, userId, projectId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/projects`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("id", `eq.${projectId}`);
  url.searchParams.set("select", "id,name,description,status,priority,start_date,due_date,created_at,updated_at");
  url.searchParams.set("limit", "1");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  return rows[0] || null;
}

async function findProjectTasks(env, userId, projectId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/tasks`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("deleted_at", "is.null");
  url.searchParams.set("select", "id,title,description,category,priority,status,start_date,due_date,reminder,recurrence,created_at,updated_at");
  url.searchParams.set("order", "due_date.asc.nullslast");

  const response = await serviceFetch(env, url);
  return response.json();
}

async function findLinkedHubNotes(env, userId, projectId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/hub_notes`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("project_ids", `cs.{${projectId}}`);
  url.searchParams.set("select", "id,title,body,tags,favorite,project_ids,created_at,updated_at");
  url.searchParams.set("order", "updated_at.desc");

  const response = await serviceFetch(env, url);
  return response.json();
}

function rowToProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    status: row.status,
    priority: row.priority,
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    notes: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    priority: row.priority,
    status: row.status,
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    reminder: row.reminder || "none",
    recurrence: row.recurrence || "none",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHubNote(row) {
  return {
    id: String(row.id || ""),
    title: String(row.title || "Project note"),
    content: String(row.body || ""),
    tags: row.tags ? String(row.tags) : "",
    favorite: Boolean(row.favorite),
    updatedAt: String(row.updated_at || ""),
  };
}

async function readSharePassword(req) {
  if (req.headers["x-share-password"]) {
    return sanitizeSharePassword(req.headers["x-share-password"]);
  }

  if (req.method !== "POST") return "";

  const body = await readJsonBody(req, SHARE_PASSWORD_MAX_BYTES);
  return sanitizeSharePassword(body?.password);
}

function verifySharePassword(token, password, expectedHash) {
  if (!password) return false;
  const hash = crypto.createHash("sha256").update(`${token}:${String(password).trim()}`).digest("hex");
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(String(expectedHash), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
