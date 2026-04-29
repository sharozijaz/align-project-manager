import type { CalendarEvent } from "../../types/calendar";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";
import { supabase } from "./client";
import {
  calendarEventToRow,
  projectToRow,
  rowToCalendarEvent,
  rowToProject,
  rowToTask,
  taskToRow,
} from "./mappers";
import { errorMessage } from "../../utils/errors";

export interface SyncedWorkspace {
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
}

const requireClient = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
  }

  return supabase;
};

export async function pullWorkspaceFromSupabase(): Promise<SyncedWorkspace> {
  const client = requireClient();
  const [{ data: projects, error: projectsError }, { data: tasks, error: tasksError }, { data: events, error: eventsError }] =
    await Promise.all([
      client.from("projects").select("*").order("created_at", { ascending: false }),
      client.from("tasks").select("*").order("created_at", { ascending: false }),
      client.from("calendar_events").select("*").order("start_date", { ascending: true }),
    ]);

  const error = projectsError ?? tasksError ?? eventsError;
  if (error) throw new Error(errorMessage(error, "Could not download workspace from Supabase."));

  return {
    projects: (projects ?? []).map(rowToProject),
    tasks: (tasks ?? []).map(rowToTask),
    events: (events ?? []).map(rowToCalendarEvent),
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
}

async function upsertProjects(rows: ReturnType<typeof projectToRow>[]) {
  const client = requireClient();

  if (rows.length) {
    const { error: upsertError } = await client.from("projects").upsert(rows);
    if (upsertError) throw new Error(errorMessage(upsertError, "Could not upload projects."));
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

      throw new Error(errorMessage(upsertError, "Could not upload tasks."));
    }
  }
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
