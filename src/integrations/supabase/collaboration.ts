import type { RealtimeChannel } from "@supabase/supabase-js";
import { rowToHubNote, rowToProject, rowToTask } from "./mappers";
import { supabase } from "./client";
import type { Database } from "./types";
import type { AssigneeOption, ProjectCollaborator } from "../../types/collaboration";
import type { Project } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";

type CollaboratorRow = Database["public"]["Tables"]["project_collaborators"]["Row"];
type TaskUpdate = Pick<
  Partial<TaskInput>,
  | "title"
  | "description"
  | "status"
  | "priority"
  | "startDate"
  | "startTime"
  | "dueDate"
  | "dueTime"
  | "assigneeEmail"
  | "assigneeUserId"
  | "assignedBy"
  | "assignedAt"
>;

export interface SharedProjectBundle {
  collaborators: ProjectCollaborator[];
  projects: Project[];
  tasks: Task[];
  notes: HubNote[];
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const collaboratorRowToModel = (row: CollaboratorRow): ProjectCollaborator => ({
  id: row.id,
  projectId: row.project_id,
  ownerUserId: row.owner_user_id,
  inviteeEmail: row.invitee_email,
  inviteeUserId: row.invitee_user_id ?? undefined,
  role: row.role,
  status: row.status,
  invitedBy: row.invited_by ?? undefined,
  acceptedAt: row.accepted_at ?? undefined,
  removedAt: row.removed_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function collaboratorAssigneeOptions(collaborators: ProjectCollaborator[]): AssigneeOption[] {
  return collaborators
    .filter((collaborator) => collaborator.status !== "removed")
    .map((collaborator) => ({
      email: collaborator.inviteeEmail,
      userId: collaborator.inviteeUserId,
      label: collaborator.inviteeEmail,
    }));
}

export async function hasProjectCollaborations(email: string, userId?: string) {
  if (!supabase) return false;

  let query = supabase
    .from("project_collaborators")
    .select("id")
    .in("status", ["invited", "active"])
    .eq("invitee_email", normalizeEmail(email))
    .limit(1);

  if (userId) {
    query = query.or(`invitee_user_id.eq.${userId},invitee_email.eq.${normalizeEmail(email)}`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Could not check project collaborations.", error);
    return false;
  }

  return Boolean(data?.length);
}

export async function listProjectCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("project_collaborators")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(collaboratorRowToModel);
}

export async function inviteProjectCollaborator(project: Project, inviteeEmail: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const ownerUserId = userData.user?.id;
  if (!ownerUserId) throw new Error("Sign in before inviting collaborators.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_collaborators")
    .upsert(
      {
        project_id: project.id,
        owner_user_id: ownerUserId,
        invitee_email: normalizeEmail(inviteeEmail),
        role: "editor",
        status: "invited",
        invited_by: ownerUserId,
        removed_at: null,
        updated_at: now,
      },
      { onConflict: "project_id,invitee_email" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return collaboratorRowToModel(data);
}

export async function removeProjectCollaborator(collaboratorId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("project_collaborators")
    .update({ status: "removed", removed_at: now, updated_at: now })
    .eq("id", collaboratorId);

  if (error) throw error;
}

export async function listOwnedCollaborationProjectIds() {
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  const ownerUserId = userData.user?.id;
  if (!ownerUserId) return [];

  const { data, error } = await supabase
    .from("project_collaborators")
    .select("project_id")
    .eq("owner_user_id", ownerUserId)
    .in("status", ["invited", "active"]);

  if (error) {
    console.warn("Could not load owned collaboration project ids.", error);
    return [];
  }

  return Array.from(new Set((data ?? []).map((row) => row.project_id)));
}

export async function pullSharedProjects(): Promise<SharedProjectBundle> {
  if (!supabase) return { collaborators: [], projects: [], tasks: [], notes: [] };

  const { data: collaboratorRows, error: collaboratorError } = await supabase
    .from("project_collaborators")
    .select("*")
    .in("status", ["invited", "active"])
    .order("created_at", { ascending: true });

  if (collaboratorError) throw collaboratorError;

  const collaborators = (collaboratorRows ?? []).map(collaboratorRowToModel);
  const projectIds = Array.from(new Set(collaborators.map((collaborator) => collaborator.projectId)));
  if (!projectIds.length) return { collaborators, projects: [], tasks: [], notes: [] };

  const [{ data: projectRows, error: projectError }, { data: taskRows, error: taskError }, { data: noteRows, error: noteError }] = await Promise.all([
    supabase.from("projects").select("*").in("id", projectIds).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("tasks").select("*").in("project_id", projectIds).is("deleted_at", null).order("sort_order", { ascending: true }),
    supabase.from("hub_notes").select("*").eq("team_visible", true).overlaps("project_ids", projectIds).order("updated_at", { ascending: false }),
  ]);

  if (projectError) throw projectError;
  if (taskError) throw taskError;
  if (noteError) throw noteError;

  return {
    collaborators,
    projects: (projectRows ?? []).map(rowToProject),
    tasks: (taskRows ?? []).map(rowToTask),
    notes: (noteRows ?? []).map(rowToHubNote),
  };
}

export async function updateSharedTask(taskId: string, updates: TaskUpdate) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const now = new Date().toISOString();
  const row: Database["public"]["Tables"]["tasks"]["Update"] = {
    updated_at: now,
  };

  if (updates.title !== undefined) row.title = updates.title.trim();
  if (updates.description !== undefined) row.description = updates.description?.trim() || null;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.priority !== undefined) row.priority = updates.priority;
  if (updates.startDate !== undefined) row.start_date = updates.startDate || null;
  if (updates.startTime !== undefined) row.start_time = updates.startTime || null;
  if (updates.dueDate !== undefined) row.due_date = updates.dueDate || null;
  if (updates.dueTime !== undefined) row.due_time = updates.dueTime || null;
  if (updates.assigneeEmail !== undefined) row.assignee_email = updates.assigneeEmail ? normalizeEmail(updates.assigneeEmail) : null;
  if (updates.assigneeUserId !== undefined) row.assignee_user_id = updates.assigneeUserId || null;
  if (updates.assignedBy !== undefined) row.assigned_by = updates.assignedBy || null;
  if (updates.assignedAt !== undefined) row.assigned_at = updates.assignedAt || null;

  const { data, error } = await supabase.from("tasks").update(row).eq("id", taskId).select("*").single();
  if (error) throw error;
  return rowToTask(data);
}

export function subscribeToProjectTaskChanges(projectIds: string[], onChange: (task: Task | null, taskId?: string) => void) {
  if (!supabase || !projectIds.length) return () => undefined;

  const client = supabase;
  const projectIdSet = new Set(projectIds);
  const channel: RealtimeChannel = client
    .channel(`align-project-tasks-${projectIds.join("-").slice(0, 80)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
      const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as Database["public"]["Tables"]["tasks"]["Row"] | undefined;
      if (!row?.project_id || !projectIdSet.has(row.project_id)) return;
      onChange(payload.eventType === "DELETE" ? null : rowToTask(row), row.id);
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
