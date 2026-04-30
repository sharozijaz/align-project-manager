import crypto from "node:crypto";
import { getEnv, handleApiError, requireMethod, serviceFetch } from "./_googleCalendar.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    if (requireMethod(req, res, "GET")) return;
  }

  const env = getEnv();
  const token = String(req.query.token || "").trim();

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    res.status(500).json({ error: "Missing Supabase server configuration." });
    return;
  }

  if (!/^[a-f0-9]{48}$/iu.test(token)) {
    res.status(404).json({ error: "Share link not found." });
    return;
  }

  try {
    const share = await findShare(env, token);

    if (!share) {
      res.status(404).json({ error: "Share link not found." });
      return;
    }

    if (share.password_hash) {
      const password = await readSharePassword(req);
      if (!verifySharePassword(token, password, share.password_hash)) {
        res.status(401).json({
          error: password ? "Incorrect share password." : "Password required.",
          passwordRequired: true,
        });
        return;
      }
    }

    const [project, tasks] = await Promise.all([
      findProject(env, share.user_id, share.project_id),
      findProjectTasks(env, share.user_id, share.project_id),
    ]);

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    res.status(200).json({
      project: rowToProject(project),
      tasks: tasks.map(rowToTask),
    });
  } catch (error) {
    handleApiError(res, error);
  }
}

async function findShare(env, token) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/project_shares`);
  url.searchParams.set("token", `eq.${token}`);
  url.searchParams.set("enabled", "eq.true");
  url.searchParams.set("select", "user_id,project_id,expires_at,password_hash");
  url.searchParams.set("limit", "1");

  const response = await serviceFetch(env, url);
  const rows = await response.json();
  const share = rows[0];

  if (!share) return null;
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return null;

  return share;
}

async function readSharePassword(req) {
  if (req.headers["x-share-password"]) {
    return String(req.headers["x-share-password"]);
  }

  if (req.method !== "POST") return "";

  if (req.body) {
    const body = typeof req.body === "string" ? safeJsonParse(req.body) : req.body;
    return String(body?.password || "");
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const bodyText = Buffer.concat(chunks).toString("utf8");
  return String(safeJsonParse(bodyText)?.password || "");
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function verifySharePassword(token, password, expectedHash) {
  if (!password) return false;
  const hash = crypto.createHash("sha256").update(`${token}:${String(password).trim()}`).digest("hex");
  const actual = Buffer.from(hash, "hex");
  const expected = Buffer.from(String(expectedHash), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function findProject(env, userId, projectId) {
  const url = new URL(`${env.supabaseUrl}/rest/v1/projects`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("id", `eq.${projectId}`);
  url.searchParams.set("select", "id,name,description,status,priority,start_date,due_date,notes,created_at,updated_at");
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

function rowToProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    status: row.status,
    priority: row.priority,
    startDate: row.start_date || "",
    dueDate: row.due_date || "",
    notes: safeClientNotes(row.notes),
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

function safeClientNotes(notes) {
  if (!Array.isArray(notes)) return [];

  return notes
    .filter((note) => note && note.visibility === "client")
    .map((note) => ({
      id: String(note.id || ""),
      title: String(note.title || "Project note"),
      content: String(note.content || ""),
      url: note.url ? String(note.url) : "",
      visibility: "client",
      updatedAt: String(note.updatedAt || ""),
    }));
}
