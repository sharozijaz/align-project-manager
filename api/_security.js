import crypto from "node:crypto";
import { HttpError } from "./_googleCalendar.js";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const DEFAULT_API_LIMIT = 120;
const MAX_TASK_SYNC_ITEMS = 500;
const store = globalThis.__alignRateLimitStore ?? new Map();
globalThis.__alignRateLimitStore = store;

export function applyRateLimit(req, res, options = {}) {
  const windowMs = options.windowMs ?? FIFTEEN_MINUTES_MS;
  const max = options.max ?? DEFAULT_API_LIMIT;
  const key = buildRateLimitKey(req, options.keyPrefix ?? "api");
  const now = Date.now();
  const current = store.get(key);
  const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

  entry.count += 1;
  store.set(key, entry);
  pruneExpiredEntries(now);

  const remaining = Math.max(0, max - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > max) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many requests. Try again later." });
    return true;
  }

  return false;
}

export function rejectOversizedPayload(req, res, maxBytes) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    res.status(413).json({ error: "Payload too large." });
    return true;
  }
  return false;
}

export function requireJsonPayload(req, res) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return false;
  if (!req.headers["content-type"]) return false;

  const contentType = String(req.headers["content-type"]).toLowerCase();
  if (!contentType.includes("application/json")) {
    res.status(415).json({ error: "Expected an application/json request body." });
    return true;
  }

  return false;
}

export async function readJsonBody(req, maxBytes) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return parseJson(req.body);

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) throw new HttpError(413, "Payload too large.");
    chunks.push(buffer);
  }

  if (!chunks.length) return {};
  return parseJson(Buffer.concat(chunks).toString("utf8"));
}

export function sanitizeSharePassword(value) {
  const password = sanitizeString(value, 256);
  if (password.length !== String(value ?? "").trim().length) {
    throw new HttpError(400, "Password is too long.");
  }
  return password;
}

export function sanitizeQueryString(value, name, options = {}) {
  const maxLength = options.maxLength ?? 512;
  const text = sanitizeString(value, maxLength);
  if (text.length !== String(value ?? "").trim().length) {
    throw new HttpError(400, `${name} is too long.`);
  }
  if (options.pattern && text && !options.pattern.test(text)) {
    throw new HttpError(400, `${name} is malformed.`);
  }
  return text;
}

export function sanitizeGoogleTodoSettings(settings = {}) {
  const sanitized = {};
  if (hasOwn(settings, "enabled")) sanitized.enabled = Boolean(settings.enabled);
  if (hasOwn(settings, "todoListId")) sanitized.todoListId = sanitizeString(settings.todoListId, 256);
  return sanitized;
}

export function sanitizeTaskSyncPayload(tasks, maxItems = MAX_TASK_SYNC_ITEMS) {
  if (tasks === undefined || tasks === null) return [];
  if (!Array.isArray(tasks)) throw new HttpError(400, "Tasks payload must be an array.");
  if (tasks.length > maxItems) throw new HttpError(413, `Tasks payload cannot exceed ${maxItems} items.`);

  return tasks.map((task, index) => {
    if (!task || typeof task !== "object" || Array.isArray(task)) {
      throw new HttpError(400, `Task at index ${index} is malformed.`);
    }

    return {
      ...task,
      id: sanitizeString(task.id, 120),
      title: sanitizeString(task.title, 300),
      description: sanitizeString(task.description, 5000),
      category: sanitizeString(task.category, 120),
      priority: sanitizeString(task.priority, 40),
      status: sanitizeString(task.status, 60),
      startDate: sanitizeDateString(task.startDate),
      dueDate: sanitizeDateString(task.dueDate),
      reminder: sanitizeString(task.reminder, 80),
      recurrence: sanitizeString(task.recurrence, 80),
    };
  });
}

export function sanitizeIdArray(values, maxItems = MAX_TASK_SYNC_ITEMS) {
  if (values === undefined || values === null) return [];
  if (!Array.isArray(values)) throw new HttpError(400, "ID payload must be an array.");
  if (values.length > maxItems) throw new HttpError(413, `ID payload cannot exceed ${maxItems} items.`);
  return values.map((value, index) => {
    const id = sanitizeString(value, 120);
    if (!id) throw new HttpError(400, `ID at index ${index} is malformed.`);
    return id;
  });
}

function buildRateLimitKey(req, keyPrefix) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwardedFor || String(req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown");
  const token = String(req.headers.authorization || req.headers["x-share-password"] || "");
  const identity = token ? hashValue(`${ip}:${token}`) : ip;
  return `${keyPrefix}:${identity}`;
}

function pruneExpiredEntries(now) {
  if (store.size < 1000) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function parseJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    throw new HttpError(400, "Malformed JSON payload.");
  }
}

function sanitizeDateString(value) {
  const text = sanitizeString(value, 80);
  if (!text) return "";
  if (Number.isNaN(new Date(text).getTime())) {
    throw new HttpError(400, "Date value is malformed.");
  }
  return text;
}

function sanitizeString(value, maxLength) {
  const text = String(value ?? "").trim();
  if (text.length > maxLength) {
    throw new HttpError(400, "Input is too long.");
  }
  const stripped = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  return stripped;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}
