import type { CalendarEvent } from "../../types/calendar";
import type { Project, ProjectNote } from "../../types/project";
import type { HubNote, HubResource } from "../../types/studio";
import type { Task } from "../../types/task";
import { normalizeTaskPriority, normalizeTaskRecurrence, normalizeTaskReminder, normalizeTaskStatus } from "../../config/taskOptions";
import type { Database } from "./types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type HubResourceRow = Database["public"]["Tables"]["hub_resources"]["Row"];
type HubNoteRow = Database["public"]["Tables"]["hub_notes"]["Row"];

export const projectToRow = (project: Project, userId: string): ProjectRow => ({
  id: project.id,
  user_id: userId,
  name: project.name,
  description: project.description ?? null,
  area: normalizeProjectArea(project.area),
  status: project.status,
  priority: normalizeTaskPriority(project.priority),
  start_date: project.startDate ?? null,
  start_time: normalizeTimeValue(project.startTime) ?? null,
  due_date: project.dueDate ?? null,
  due_time: normalizeTimeValue(project.dueTime) ?? null,
  sort_order: project.sortOrder ?? null,
  notes: normalizeProjectNotes(project.notes),
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});

export const rowToProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  area: normalizeProjectArea(row.area),
  status: row.status,
  priority: row.priority,
  startDate: row.start_date ?? undefined,
  startTime: normalizeTimeValue(row.start_time),
  dueDate: row.due_date ?? undefined,
  dueTime: normalizeTimeValue(row.due_time),
  sortOrder: row.sort_order ?? undefined,
  notes: normalizeProjectNotes(row.notes),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const taskToRow = (task: Task, userId: string): TaskRow => ({
  id: task.id,
  user_id: userId,
  title: task.title,
  description: task.description ?? null,
  project_id: task.projectId ?? null,
  category: task.category,
  priority: normalizeTaskPriority(task.priority),
  status: normalizeTaskStatus(task.status),
  start_date: task.startDate ?? null,
  start_time: normalizeTimeValue(task.startTime) ?? null,
  due_date: task.dueDate ?? null,
  due_time: normalizeTimeValue(task.dueTime) ?? null,
  reminder: normalizeTaskReminder(task.reminder),
  recurrence: normalizeTaskRecurrence(task.recurrence),
  recurring_parent_id: task.recurringParentId ?? null,
  sort_order: task.sortOrder ?? null,
  deleted_at: task.deletedAt ?? null,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
});

export const rowToTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  projectId: row.project_id ?? undefined,
  category: row.category,
  priority: normalizeTaskPriority(row.priority),
  status: normalizeTaskStatus(row.status),
  startDate: row.start_date ?? undefined,
  startTime: normalizeTimeValue(row.start_time),
  dueDate: row.due_date ?? undefined,
  dueTime: normalizeTimeValue(row.due_time),
  reminder: normalizeTaskReminder(row.reminder),
  recurrence: normalizeTaskRecurrence(row.recurrence),
  recurringParentId: row.recurring_parent_id ?? undefined,
  sortOrder: row.sort_order ?? undefined,
  deletedAt: row.deleted_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const calendarEventToRow = (event: CalendarEvent, userId: string): CalendarEventRow => ({
  id: event.id,
  user_id: userId,
  title: event.title,
  description: event.description ?? null,
  start_date: event.startDate,
  end_date: event.endDate ?? null,
  linked_task_id: event.linkedTaskId ?? null,
  source: event.source,
});

export const rowToCalendarEvent = (row: CalendarEventRow): CalendarEvent => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  startDate: row.start_date,
  endDate: row.end_date ?? undefined,
  linkedTaskId: row.linked_task_id ?? undefined,
  source: row.source,
});

export const hubResourceToRow = (resource: HubResource, userId: string): HubResourceRow => ({
  id: resource.id,
  user_id: userId,
  title: resource.title,
  url: resource.url ?? null,
  type: resource.type,
  collection: resource.collection ?? null,
  tags: resource.tags ?? null,
  notes: resource.notes ?? null,
  favorite: resource.favorite ?? false,
  created_at: resource.createdAt,
  updated_at: resource.updatedAt,
});

export const rowToHubResource = (row: HubResourceRow): HubResource => ({
  id: row.id,
  title: row.title,
  url: row.url ?? undefined,
  type: row.type,
  collection: row.collection ?? undefined,
  tags: row.tags ?? undefined,
  notes: row.notes ?? undefined,
  favorite: row.favorite,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hubNoteToRow = (note: HubNote, userId: string): HubNoteRow => ({
  id: note.id,
  user_id: userId,
  title: note.title,
  body: note.body,
  tags: note.tags ?? null,
  favorite: note.favorite ?? false,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
});

export const rowToHubNote = (row: HubNoteRow): HubNote => ({
  id: row.id,
  title: row.title,
  body: row.body,
  tags: row.tags ?? undefined,
  favorite: row.favorite,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function normalizeTimeValue(value?: string | null) {
  if (!value) return undefined;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeProjectArea(value?: string | null) {
  return value === "personal" ? "personal" : "business";
}

function normalizeProjectNotes(value?: ProjectNote[] | null): ProjectNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((note) => note && typeof note.title === "string" && typeof note.content === "string")
    .map((note) => ({
      id: note.id || crypto.randomUUID(),
      title: note.title,
      content: note.content,
      visibility: note.visibility === "client" ? "client" : "private",
      url: note.url || undefined,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString(),
    }));
}
