import type { CalendarEvent } from "../../types/calendar";
import type { Project, ProjectNote } from "../../types/project";
import type { Task } from "../../types/task";
import { normalizeTaskPriority, normalizeTaskRecurrence, normalizeTaskReminder, normalizeTaskStatus } from "../../config/taskOptions";
import type { Database } from "./types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export const projectToRow = (project: Project, userId: string): ProjectRow => ({
  id: project.id,
  user_id: userId,
  name: project.name,
  description: project.description ?? null,
  area: normalizeProjectArea(project.area),
  status: project.status,
  priority: normalizeTaskPriority(project.priority),
  start_date: project.startDate ?? null,
  start_time: project.startTime ?? null,
  due_date: project.dueDate ?? null,
  due_time: project.dueTime ?? null,
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
  start_time: task.startTime ?? null,
  due_date: task.dueDate ?? null,
  due_time: task.dueTime ?? null,
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

function normalizeTimeValue(value?: string | null) {
  return value ? value.slice(0, 5) : undefined;
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
