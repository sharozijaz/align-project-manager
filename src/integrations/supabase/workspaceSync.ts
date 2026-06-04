import type { CalendarEvent } from "../../types/calendar";
import type { Project } from "../../types/project";
import type { HubNote, HubNoteSpace, HubResource } from "../../types/studio";
import type { Task } from "../../types/task";
import { supabase } from "./client";
import {
  calendarEventToRow,
  hubNoteToRow,
  hubNoteSpaceToRow,
  hubResourceToRow,
  projectToRow,
  rowToCalendarEvent,
  rowToHubNote,
  rowToHubNoteSpace,
  rowToHubResource,
  rowToProject,
  rowToTask,
  taskToRow,
} from "./mappers";
import { errorMessage } from "../../utils/errors";

export interface SyncedWorkspace {
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  noteSpacesUnavailable?: boolean;
}

export interface TaskSyncResult {
  tasks: Task[];
  localCount: number;
  remoteCount: number;
  uploadedCount: number;
  mergedCount: number;
  lastSyncedAt: string;
}

export interface PushWorkspaceResult {
  tasks: Task[];
  taskSync: TaskSyncResult;
}

const requireClient = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
  }

  return supabase;
};

async function requireUserId(client: ReturnType<typeof requireClient>) {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before syncing your workspace.");

  return user.id;
}

export async function pullWorkspaceFromSupabase(): Promise<SyncedWorkspace> {
  const client = requireClient();
  const userId = await requireUserId(client);
  const [
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError },
    { data: events, error: eventsError },
    { data: resources, error: resourcesError },
    { data: notes, error: notesError },
    { data: noteSpaces, error: noteSpacesError },
  ] =
    await Promise.all([
      client.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      client.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      client.from("calendar_events").select("*").eq("user_id", userId).order("start_date", { ascending: true }),
      client.from("hub_resources").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      client.from("hub_notes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      client.from("hub_note_spaces").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    ]);

  const error =
    projectsError ??
    tasksError ??
    eventsError ??
    (isMissingRelation(resourcesError) ? null : resourcesError) ??
    (isMissingRelation(notesError) ? null : notesError) ??
    (isMissingRelation(noteSpacesError) ? null : noteSpacesError);
  if (error) throw new Error(errorMessage(error, "Could not download workspace from Supabase."));

  return {
    projects: (projects ?? []).map(rowToProject),
    tasks: (tasks ?? []).map(rowToTask),
    events: (events ?? []).map(rowToCalendarEvent),
    resources: isMissingRelation(resourcesError) ? [] : (resources ?? []).map(rowToHubResource),
    notes: isMissingRelation(notesError) ? [] : (notes ?? []).map(rowToHubNote),
    noteSpaces: isMissingRelation(noteSpacesError) ? [] : (noteSpaces ?? []).map(rowToHubNoteSpace),
    noteSpacesUnavailable: isMissingRelation(noteSpacesError),
  };
}

export async function pushWorkspaceToSupabase(workspace: SyncedWorkspace): Promise<PushWorkspaceResult> {
  const client = requireClient();
  const userId = await requireUserId(client);
  const projectRows = workspace.projects.map((project) => projectToRow(project, userId));

  await upsertProjects(projectRows);
  const taskSync = await syncTasksWithSupabase(workspace.tasks, workspace.projects, userId);
  await deleteStaleProjects(projectRows, userId);
  await replaceCalendarEvents(workspace.events.map((event) => calendarEventToRow(event, userId)), userId);
  await replaceHubResources(workspace.resources.map((resource) => hubResourceToRow(resource, userId)), userId);
  await replaceHubNotes(workspace.notes.map((note) => hubNoteToRow(note, userId)), userId);
  await replaceHubNoteSpaces(workspace.noteSpaces.map((space) => hubNoteSpaceToRow(space, userId)), userId);

  return {
    tasks: taskSync.tasks,
    taskSync,
  };
}

export async function syncTasksWithSupabase(tasks: Task[], projects: Project[], userId?: string): Promise<TaskSyncResult> {
  const client = requireClient();
  const resolvedUserId = userId ?? (await requireUserId(client));
  const projectIds = new Set(projects.map((project) => project.id));
  const localTasks = tasks.map((task) => normalizeTaskForSync(task, projectIds));
  const { data: remoteRows, error: remoteError } = await client.from("tasks").select("*").eq("user_id", resolvedUserId);

  if (remoteError) throw new Error(errorMessage(remoteError, "Could not read cloud tasks."));

  const remoteTasks = (remoteRows ?? []).map(rowToTask).map((task) => normalizeTaskForSync(task, projectIds));
  const merged = mergeTasks(localTasks, remoteTasks);
  const rows = merged.map((task) => taskToRow(task, resolvedUserId));

  await upsertTasks(rows);

  return {
    tasks: merged,
    localCount: localTasks.length,
    remoteCount: remoteTasks.length,
    uploadedCount: merged.length,
    mergedCount: merged.length,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function clearWorkspaceInSupabase() {
  const client = requireClient();
  const userId = await requireUserId(client);

  await Promise.all([
    deleteOwnedRows("tasks", userId),
    deleteOwnedRows("calendar_events", userId),
    deleteOwnedRows("hub_resources", userId),
    deleteOwnedRows("hub_notes", userId),
    deleteOwnedRows("hub_note_spaces", userId),
    deleteOwnedRows("projects", userId),
  ]);
}

async function deleteOwnedRows(table: "projects" | "tasks" | "calendar_events" | "hub_resources" | "hub_notes" | "hub_note_spaces", userId: string) {
  const client = requireClient();
  const { error } = await client.from(table).delete().eq("user_id", userId);

  if (isMissingRelation(error)) return;
  if (error) throw new Error(errorMessage(error, `Could not clear ${table}.`));
}

async function upsertProjects(rows: ReturnType<typeof projectToRow>[]) {
  const client = requireClient();

  if (rows.length) {
    const { error: upsertError } = await client.from("projects").upsert(rows);
    if (upsertError) {
      if (isMissingColumn(upsertError, "start_date")) {
        const legacyRows = rows.map(({ start_date: _startDate, ...row }) => row);
        const { error: retryError } = await client.from("projects").upsert(legacyRows);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload projects."));
      }

      const optionalColumn = optionalProjectColumns.find((column) => isMissingColumn(upsertError, column));
      if (optionalColumn) {
        const retryRows = stripColumns(rows, optionalProjectColumns);
        const { error: retryError } = await client.from("projects").upsert(retryRows);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload projects."));
      }

      throw new Error(errorMessage(upsertError, "Could not upload projects."));
    }
  }
}

async function deleteStaleProjects(rows: ReturnType<typeof projectToRow>[], userId: string) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("projects").select("id").eq("user_id", userId);

  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing projects."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("projects").delete().eq("user_id", userId).in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale projects."));
  }
}

async function upsertTasks(rows: ReturnType<typeof taskToRow>[]) {
  const client = requireClient();

  if (rows.length) {
    const { error: upsertError } = await client.from("tasks").upsert(rows);
    if (upsertError) {
      if (String(upsertError.message).toLowerCase().includes("reminder")) {
        const rowsWithoutReminder = rows.map(({ reminder: _reminder, ...row }) => row);
        const { error: retryError } = await client.from("tasks").upsert(rowsWithoutReminder);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload tasks."));
      }

      if (String(upsertError.message).toLowerCase().includes("recurrence") || String(upsertError.message).toLowerCase().includes("recurring_parent_id")) {
        const rowsWithoutRecurrence = rows.map(({ recurrence: _recurrence, recurring_parent_id: _recurringParentId, ...row }) => row);
        const { error: retryError } = await client.from("tasks").upsert(rowsWithoutRecurrence);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload tasks."));
      }

      if (isMissingColumn(upsertError, "start_date")) {
        const legacyRows = rows.map(({ start_date: _startDate, ...row }) => row);
        const { error: retryError } = await client.from("tasks").upsert(legacyRows);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload tasks."));
      }

      const optionalColumn = optionalTaskColumns.find((column) => isMissingColumn(upsertError, column));
      if (optionalColumn) {
        const retryRows = stripColumns(rows, optionalTaskColumns);
        const { error: retryError } = await client.from("tasks").upsert(retryRows);
        if (!retryError) return;
        throw new Error(errorMessage(retryError, "Could not upload tasks."));
      }

      throw new Error(errorMessage(upsertError, "Could not upload tasks."));
    }
  }
}

function normalizeTaskForSync(task: Task, projectIds: Set<string>): Task {
  return {
    ...task,
    category: task.category || "personal",
    status: task.status || "not_started",
    priority: task.priority || "medium",
    reminder: task.reminder || "none",
    recurrence: task.recurrence || "none",
    projectId: task.projectId && projectIds.has(task.projectId) ? task.projectId : undefined,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
  };
}

function mergeTasks(localTasks: Task[], remoteTasks: Task[]) {
  const byId = new Map<string, Task>();

  for (const task of [...remoteTasks, ...localTasks]) {
    const existing = byId.get(task.id);
    if (!existing || taskTimestamp(task.updatedAt) >= taskTimestamp(existing.updatedAt)) {
      byId.set(task.id, task);
    }
  }

  return Array.from(byId.values()).sort((a, b) => taskTimestamp(b.updatedAt) - taskTimestamp(a.updatedAt));
}

function taskTimestamp(value?: string) {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isMissingColumn(error: { message?: string; code?: string }, column: string) {
  const message = String(error.message ?? "").toLowerCase();
  const normalizedColumn = column.toLowerCase();
  return message.includes(normalizedColumn) || message.includes(`'${normalizedColumn}'`) || message.includes(`"${normalizedColumn}"`);
}

function isMissingRelation(error?: { message?: string; code?: string } | null) {
  if (!error) return false;

  const message = String(error.message ?? "").toLowerCase();
  return error.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

const optionalProjectColumns = ["start_time", "due_time", "sort_order", "notes"];
const optionalTaskColumns = [
  "start_time",
  "due_time",
  "sort_order",
  "parent_task_id",
  "planned_month",
  "planned_week_start",
];

function stripColumns<Row extends Record<string, unknown>>(rows: Row[], columns: string[]) {
  return rows.map((row) => {
    const next = { ...row };
    columns.forEach((column) => {
      delete next[column];
    });
    return next;
  });
}

async function replaceCalendarEvents(rows: ReturnType<typeof calendarEventToRow>[], userId: string) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("calendar_events").select("id").eq("user_id", userId);

  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing calendar events."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("calendar_events").delete().eq("user_id", userId).in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale calendar events."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("calendar_events").upsert(rows);
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload calendar events."));
  }
}

async function replaceHubResources(rows: ReturnType<typeof hubResourceToRow>[], userId: string) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("hub_resources").select("id").eq("user_id", userId);

  if (isMissingRelation(existingError)) return;
  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing resources."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((itemId) => !nextIds.has(itemId));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("hub_resources").delete().eq("user_id", userId).in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale resources."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("hub_resources").upsert(rows);
    if (isMissingRelation(upsertError)) return;
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload resources."));
  }
}

async function replaceHubNotes(rows: ReturnType<typeof hubNoteToRow>[], userId: string) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("hub_notes").select("id").eq("user_id", userId);

  if (isMissingRelation(existingError)) return;
  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing hub notes."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((itemId) => !nextIds.has(itemId));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("hub_notes").delete().eq("user_id", userId).in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale hub notes."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("hub_notes").upsert(rows);
    if (isMissingRelation(upsertError)) return;
    if (upsertError && ["collection", "project_ids", "related_note_ids"].some((column) => isMissingColumn(upsertError, column))) {
      const retryRows = rows.map(({ collection: _collection, project_ids: _projectIds, related_note_ids: _relatedNoteIds, ...row }) => row);
      const { error: retryError } = await client.from("hub_notes").upsert(retryRows);
      if (!retryError) return;
      throw new Error(errorMessage(retryError, "Could not upload hub notes."));
    }
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload hub notes."));
  }
}

async function replaceHubNoteSpaces(rows: ReturnType<typeof hubNoteSpaceToRow>[], userId: string) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("hub_note_spaces").select("id").eq("user_id", userId);

  if (isMissingRelation(existingError)) return;
  if (existingError) throw new Error(errorMessage(existingError, "Could not read note spaces."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((itemId) => !nextIds.has(itemId));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("hub_note_spaces").delete().eq("user_id", userId).in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale note spaces."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("hub_note_spaces").upsert(rows);
    if (isMissingRelation(upsertError)) return;
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload note spaces."));
  }
}
