import type { CalendarEvent } from "../../types/calendar";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";
import type { Database } from "./types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];

export const projectToRow = (project: Project, userId: string): ProjectRow => ({
  id: project.id,
  user_id: userId,
  name: project.name,
  description: project.description ?? null,
  status: project.status,
  priority: project.priority,
  due_date: project.dueDate ?? null,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});

export const rowToProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date ?? undefined,
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
  priority: task.priority,
  status: task.status,
  due_date: task.dueDate ?? null,
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
  priority: row.priority,
  status: row.status,
  dueDate: row.due_date ?? undefined,
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
