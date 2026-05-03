import type { CalendarEvent } from "../../types/calendar";
import type { Project } from "../../types/project";
import type { HubNote, HubResource } from "../../types/studio";
import type { Task } from "../../types/task";
import { supabase } from "./client";
import {
  calendarEventToRow,
  hubNoteToRow,
  hubResourceToRow,
  projectToRow,
  rowToCalendarEvent,
  rowToHubNote,
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
}

const requireClient = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
  }

  return supabase;
};

export async function pullWorkspaceFromSupabase(): Promise<SyncedWorkspace> {
  const client = requireClient();
  const [
    { data: projects, error: projectsError },
    { data: tasks, error: tasksError },
    { data: events, error: eventsError },
    { data: resources, error: resourcesError },
    { data: notes, error: notesError },
  ] =
    await Promise.all([
      client.from("projects").select("*").order("created_at", { ascending: false }),
      client.from("tasks").select("*").order("created_at", { ascending: false }),
      client.from("calendar_events").select("*").order("start_date", { ascending: true }),
      client.from("hub_resources").select("*").order("created_at", { ascending: false }),
      client.from("hub_notes").select("*").order("created_at", { ascending: false }),
    ]);

  const error =
    projectsError ??
    tasksError ??
    eventsError ??
    (isMissingRelation(resourcesError) ? null : resourcesError) ??
    (isMissingRelation(notesError) ? null : notesError);
  if (error) throw new Error(errorMessage(error, "Could not download workspace from Supabase."));

  return {
    projects: (projects ?? []).map(rowToProject),
    tasks: (tasks ?? []).map(rowToTask),
    events: (events ?? []).map(rowToCalendarEvent),
    resources: isMissingRelation(resourcesError) ? [] : (resources ?? []).map(rowToHubResource),
    notes: isMissingRelation(notesError) ? [] : (notes ?? []).map(rowToHubNote),
  };
}

export async function pushWorkspaceToSupabase(workspace: SyncedWorkspace) {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before syncing your workspace.");

  const userId = user.id;
  const projectIds = new Set(workspace.projects.map((project) => project.id));
  const projectRows = workspace.projects.map((project) => projectToRow(project, userId));
  const taskRows = workspace.tasks.map((task) =>
    taskToRow(
      {
        ...task,
        projectId: task.projectId && projectIds.has(task.projectId) ? task.projectId : undefined,
      },
      userId,
    ),
  );

  await upsertProjects(projectRows);
  await replaceTasks(taskRows);
  await deleteStaleProjects(projectRows);
  await replaceCalendarEvents(workspace.events.map((event) => calendarEventToRow(event, userId)));
  await replaceHubResources(workspace.resources.map((resource) => hubResourceToRow(resource, userId)));
  await replaceHubNotes(workspace.notes.map((note) => hubNoteToRow(note, userId)));
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

async function deleteStaleProjects(rows: ReturnType<typeof projectToRow>[]) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("projects").select("id");

  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing projects."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("projects").delete().in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale projects."));
  }
}

async function replaceTasks(rows: ReturnType<typeof taskToRow>[]) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("tasks").select("id");

  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing tasks."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("tasks").delete().in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale tasks."));
  }

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

function isMissingColumn(error: { message?: string; code?: string }, column: string) {
  const message = String(error.message ?? "").toLowerCase();
  return error.code === "PGRST204" || message.includes(column.toLowerCase());
}

function isMissingRelation(error?: { message?: string; code?: string } | null) {
  if (!error) return false;

  const message = String(error.message ?? "").toLowerCase();
  return error.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

const optionalProjectColumns = ["start_time", "due_time", "sort_order", "notes"];
const optionalTaskColumns = ["start_time", "due_time", "sort_order"];

function stripColumns<Row extends Record<string, unknown>>(rows: Row[], columns: string[]) {
  return rows.map((row) => {
    const next = { ...row };
    columns.forEach((column) => {
      delete next[column];
    });
    return next;
  });
}

async function replaceCalendarEvents(rows: ReturnType<typeof calendarEventToRow>[]) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("calendar_events").select("id");

  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing calendar events."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("calendar_events").delete().in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale calendar events."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("calendar_events").upsert(rows);
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload calendar events."));
  }
}

async function replaceHubResources(rows: ReturnType<typeof hubResourceToRow>[]) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("hub_resources").select("id");

  if (isMissingRelation(existingError)) return;
  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing resources."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((itemId) => !nextIds.has(itemId));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("hub_resources").delete().in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale resources."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("hub_resources").upsert(rows);
    if (isMissingRelation(upsertError)) return;
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload resources."));
  }
}

async function replaceHubNotes(rows: ReturnType<typeof hubNoteToRow>[]) {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from("hub_notes").select("id");

  if (isMissingRelation(existingError)) return;
  if (existingError) throw new Error(errorMessage(existingError, "Could not read existing hub notes."));

  const nextIds = new Set(rows.map((row) => row.id));
  const staleIds = (existing ?? []).map((row) => row.id).filter((itemId) => !nextIds.has(itemId));

  if (staleIds.length) {
    const { error: deleteError } = await client.from("hub_notes").delete().in("id", staleIds);
    if (deleteError) throw new Error(errorMessage(deleteError, "Could not delete stale hub notes."));
  }

  if (rows.length) {
    const { error: upsertError } = await client.from("hub_notes").upsert(rows);
    if (isMissingRelation(upsertError)) return;
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload hub notes."));
  }
}
