import type { Project } from "../../types/project";
import type { ClientShareLink, ProjectShare } from "../../types/projectShare";
import { errorMessage } from "../../utils/errors";
import { supabase } from "./client";
import { projectToRow } from "./mappers";

const requireClient = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
};

const DEFAULT_SHARE_EXPIRY_DAYS = 30;
const PROJECT_SHARE_SELECT = "id,project_id,token,enabled,password_hash,expires_at,created_at,updated_at";
const PROJECT_SHARE_SELECT_LEGACY = "id,project_id,token,enabled,password_hash,created_at,updated_at";
const CLIENT_SHARE_SELECT = "id,name,token,project_ids,project_tokens,enabled,password_hash,expires_at,created_at,updated_at";
const CLIENT_SHARE_SELECT_LEGACY = "id,name,token,project_ids,project_tokens,enabled,password_hash,created_at,updated_at";

const rowToProjectShare = (row: {
  id: string;
  project_id: string;
  token: string;
  enabled: boolean;
  password_hash?: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}): ProjectShare => ({
  id: row.id,
  projectId: row.project_id,
  token: row.token,
  enabled: row.enabled,
  passwordProtected: Boolean(row.password_hash),
  expiresAt: row.expires_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToClientShareLink = (row: {
  id: string;
  name: string | null;
  token: string;
  project_ids: string[];
  project_tokens: string[];
  enabled: boolean;
  password_hash?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}): ClientShareLink => ({
  id: row.id,
  name: row.name || undefined,
  token: row.token,
  projectIds: row.project_ids ?? [],
  projectTokens: row.project_tokens ?? [],
  enabled: row.enabled,
  passwordProtected: Boolean(row.password_hash),
  expiresAt: row.expires_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getProjectShare(projectId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_shares")
    .select(PROJECT_SHARE_SELECT)
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = errorMessage(error, "Could not load project share link.");
    if (message.includes("project_shares") || message.includes("schema cache")) return null;
    throw new Error(message);
  }

  return data ? rowToProjectShare(data) : null;
}

export async function createProjectShare(project: Project, options: { password?: string; expiresAt?: string } = {}) {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before creating a share link.");

  const { error: projectError } = await client.from("projects").upsert(projectToRow(project, user.id));
  if (projectError) throw new Error(errorMessage(projectError, "Could not prepare project for sharing."));

  const existing = await getProjectShare(project.id);
  if (existing) {
    return options.password?.trim() || options.expiresAt ? updateProjectShareControls(existing, options) : existing;
  }
  const token = createShareToken();
  const passwordHash = options.password?.trim() ? await hashSharePassword(token, options.password) : null;

  const payload = {
    user_id: user.id,
    project_id: project.id,
    token,
    enabled: true,
    password_hash: passwordHash,
    expires_at: options.expiresAt || defaultShareExpiresAt(),
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await client
    .from("project_shares")
    .insert(payload)
    .select(PROJECT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const { expires_at: _expiresAt, ...legacyPayload } = payload;
    const retry = await client.from("project_shares").insert(legacyPayload).select(PROJECT_SHARE_SELECT_LEGACY).single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not create project share link."));
  if (!data) throw new Error("Could not create project share link.");

  return rowToProjectShare(data);
}

export async function revokeProjectShare(shareId: string) {
  const client = requireClient();
  const { error } = await client
    .from("project_shares")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("id", shareId);

  if (error) throw new Error(errorMessage(error, "Could not disable project share link."));
}

export async function updateProjectSharePassword(share: ProjectShare, password: string) {
  const client = requireClient();
  const passwordHash = password.trim() ? await hashSharePassword(share.token, password) : null;
  let { data, error } = await client
    .from("project_shares")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", share.id)
    .select(PROJECT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const retry = await client
      .from("project_shares")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", share.id)
      .select(PROJECT_SHARE_SELECT_LEGACY)
      .single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not update share password."));
  if (!data) throw new Error("Could not update share password.");

  return rowToProjectShare(data);
}

async function updateProjectShareControls(share: ProjectShare, options: { password?: string; expiresAt?: string }) {
  const client = requireClient();
  const updates: { password_hash?: string | null; expires_at?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (options.password?.trim()) updates.password_hash = await hashSharePassword(share.token, options.password);
  if (options.expiresAt) updates.expires_at = options.expiresAt;

  let { data, error } = await client
    .from("project_shares")
    .update(updates)
    .eq("id", share.id)
    .select(PROJECT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const { expires_at: _expiresAt, ...legacyUpdates } = updates;
    const retry = await client.from("project_shares").update(legacyUpdates).eq("id", share.id).select(PROJECT_SHARE_SELECT_LEGACY).single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not update project share protection."));
  if (!data) throw new Error("Could not update project share protection.");

  return rowToProjectShare(data);
}

export async function listClientShareLinks() {
  const client = requireClient();
  let { data, error } = await client
    .from("client_share_links")
    .select(CLIENT_SHARE_SELECT)
    .eq("enabled", true)
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "expires_at")) {
    const retry = await client
      .from("client_share_links")
      .select(CLIENT_SHARE_SELECT_LEGACY)
      .eq("enabled", true)
      .order("created_at", { ascending: false });
    data = retry.data?.map((row) => ({ ...row, expires_at: null })) ?? null;
    error = retry.error;
  }

  if (error) {
    const message = errorMessage(error, "Could not load client overview links.");
    if (message.includes("client_share_links") || message.includes("schema cache")) return [];
    throw new Error(message);
  }

  return (data ?? []).map(rowToClientShareLink);
}

export async function createClientShareLink({
  name,
  projects,
  password,
  expiresAt,
}: {
  name?: string;
  projects: Project[];
  password?: string;
  expiresAt?: string;
}) {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before creating a client overview link.");

  const shareExpiresAt = expiresAt || defaultShareExpiresAt();
  const shares = await Promise.all(projects.map((project) => createProjectShare(project, { password, expiresAt: shareExpiresAt })));
  const now = new Date().toISOString();
  const token = createShareToken();
  const passwordHash = password?.trim() ? await hashSharePassword(token, password) : null;
  const payload = {
    user_id: user.id,
    name: name?.trim() || null,
    token,
    project_ids: projects.map((project) => project.id),
    project_tokens: shares.map((share) => share.token),
    enabled: true,
    password_hash: passwordHash,
    expires_at: shareExpiresAt,
    created_at: now,
    updated_at: now,
  };
  let { data, error } = await client
    .from("client_share_links")
    .insert(payload)
    .select(CLIENT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const { expires_at: _expiresAt, ...legacyPayload } = payload;
    const retry = await client.from("client_share_links").insert(legacyPayload).select(CLIENT_SHARE_SELECT_LEGACY).single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not save client overview link."));
  if (!data) throw new Error("Could not save client overview link.");

  return rowToClientShareLink(data);
}

export async function revokeClientShareLink(linkId: string) {
  const client = requireClient();
  const { error } = await client
    .from("client_share_links")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("id", linkId);

  if (error) throw new Error(errorMessage(error, "Could not delete client overview link."));
}

export async function updateClientShareLinkPassword(link: ClientShareLink, password: string) {
  const client = requireClient();
  const passwordHash = password.trim() ? await hashSharePassword(link.token, password) : null;

  await updateProjectSharePasswordsByToken(client, link.projectTokens, password);

  let { data, error } = await client
    .from("client_share_links")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", link.id)
    .select(CLIENT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const retry = await client
      .from("client_share_links")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", link.id)
      .select(CLIENT_SHARE_SELECT_LEGACY)
      .single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not update client link password."));
  if (!data) throw new Error("Could not update client link password.");

  return rowToClientShareLink(data);
}

export async function updateClientShareLinkProjects({
  link,
  name,
  projects,
  password,
}: {
  link: ClientShareLink;
  name?: string;
  projects: Project[];
  password?: string;
}) {
  const client = requireClient();
  if (!projects.length) throw new Error("Select at least one project for this client overview link.");

  const sharePassword = password?.trim();
  if (link.passwordProtected && !sharePassword) {
    throw new Error("Re-enter the client overview password before changing protected project details.");
  }

  const shareExpiresAt = link.expiresAt || defaultShareExpiresAt();
  const shares = await Promise.all(
    projects.map((project) => createProjectShare(project, { password: sharePassword, expiresAt: shareExpiresAt })),
  );
  const updates: {
    name: string | null;
    project_ids: string[];
    project_tokens: string[];
    password_hash?: string | null;
    updated_at: string;
  } = {
    name: name?.trim() || null,
    project_ids: projects.map((project) => project.id),
    project_tokens: shares.map((share) => share.token),
    updated_at: new Date().toISOString(),
  };

  if (sharePassword) updates.password_hash = await hashSharePassword(link.token, sharePassword);

  let { data, error } = await client
    .from("client_share_links")
    .update(updates)
    .eq("id", link.id)
    .select(CLIENT_SHARE_SELECT)
    .single();

  if (error && isMissingColumnError(error, "expires_at")) {
    const retry = await client.from("client_share_links").update(updates).eq("id", link.id).select(CLIENT_SHARE_SELECT_LEGACY).single();
    data = retry.data ? { ...retry.data, expires_at: null } : null;
    error = retry.error;
  }

  if (error) throw new Error(errorMessage(error, "Could not update client overview projects."));
  if (!data) throw new Error("Could not update client overview projects.");

  return rowToClientShareLink(data);
}

async function updateProjectSharePasswordsByToken(client: ReturnType<typeof requireClient>, tokens: string[], password: string) {
  await Promise.all(
    tokens.map(async (token) => {
      const passwordHash = password.trim() ? await hashSharePassword(token, password) : null;
      const { error } = await client
        .from("project_shares")
        .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
        .eq("token", token);

      if (error) throw new Error(errorMessage(error, "Could not update project detail link password."));
    }),
  );
}

function createShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashSharePassword(token: string, password: string) {
  const data = new TextEncoder().encode(`${token}:${password.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function defaultShareExpiresAt() {
  return new Date(Date.now() + DEFAULT_SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = errorMessage(error, "").toLowerCase();
  const column = columnName.toLowerCase();
  return (
    message.includes(column) &&
    (message.includes("pgrst204") || message.includes("42703") || message.includes("schema cache") || message.includes("does not exist"))
  );
}
