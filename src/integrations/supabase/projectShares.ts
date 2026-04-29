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

const rowToProjectShare = (row: {
  id: string;
  project_id: string;
  token: string;
  enabled: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}): ProjectShare => ({
  id: row.id,
  projectId: row.project_id,
  token: row.token,
  enabled: row.enabled,
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
  created_at: string;
  updated_at: string;
}): ClientShareLink => ({
  id: row.id,
  name: row.name || undefined,
  token: row.token,
  projectIds: row.project_ids ?? [],
  projectTokens: row.project_tokens ?? [],
  enabled: row.enabled,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getProjectShare(projectId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_shares")
    .select("id,project_id,token,enabled,expires_at,created_at,updated_at")
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

export async function createProjectShare(project: Project) {
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
  if (existing) return existing;

  const { data, error } = await client
    .from("project_shares")
    .insert({
      user_id: user.id,
      project_id: project.id,
      token: createShareToken(),
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .select("id,project_id,token,enabled,expires_at,created_at,updated_at")
    .single();

  if (error) throw new Error(errorMessage(error, "Could not create project share link."));

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

export async function listClientShareLinks() {
  const client = requireClient();
  const { data, error } = await client
    .from("client_share_links")
    .select("id,name,token,project_ids,project_tokens,enabled,created_at,updated_at")
    .eq("enabled", true)
    .order("created_at", { ascending: false });

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
}: {
  name?: string;
  projects: Project[];
}) {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before creating a client overview link.");

  const shares = await Promise.all(projects.map((project) => createProjectShare(project)));
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("client_share_links")
    .insert({
      user_id: user.id,
      name: name?.trim() || null,
      token: createShareToken(),
      project_ids: projects.map((project) => project.id),
      project_tokens: shares.map((share) => share.token),
      enabled: true,
      created_at: now,
      updated_at: now,
    })
    .select("id,name,token,project_ids,project_tokens,enabled,created_at,updated_at")
    .single();

  if (error) throw new Error(errorMessage(error, "Could not save client overview link."));

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

function createShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
