import type { CalendarEvent } from "../../types/calendar";
import type { Project, ProjectMilestone, ProjectNote, ProjectStatus } from "../../types/project";
import type { HubNote, HubNoteDocStatus, HubNoteDocType, HubNoteSpace, HubPalette, HubPaletteColor, HubResource, HubSnippet, HubSnippetType } from "../../types/studio";
import type { Task } from "../../types/task";
import { normalizeTaskPriority, normalizeTaskRecurrence, normalizeTaskReminder, normalizeTaskStatus } from "../../config/taskOptions";
import type { Database } from "./types";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type CalendarEventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type HubResourceRow = Database["public"]["Tables"]["hub_resources"]["Row"];
type HubNoteRow = Database["public"]["Tables"]["hub_notes"]["Row"];
type HubNoteSpaceRow = Database["public"]["Tables"]["hub_note_spaces"]["Row"];
type HubPaletteRow = Database["public"]["Tables"]["hub_palettes"]["Row"];
type ProjectMilestoneRow = Database["public"]["Tables"]["project_milestones"]["Row"];
type HubSnippetRow = Database["public"]["Tables"]["hub_snippets"]["Row"];

export const projectToRow = (project: Project, userId: string): ProjectRow => ({
  id: project.id,
  user_id: userId,
  name: project.name,
  description: project.description ?? null,
  area: normalizeProjectArea(project.area),
  status: normalizeProjectStatus(project.status),
  priority: normalizeTaskPriority(project.priority),
  start_date: normalizeDateValue(project.startDate) ?? null,
  start_time: normalizeTimeValue(project.startTime) ?? null,
  due_date: normalizeDateValue(project.dueDate) ?? null,
  due_time: normalizeTimeValue(project.dueTime) ?? null,
  sort_order: project.sortOrder ?? null,
  pinned_at: project.pinnedAt ?? null,
  notes: normalizeProjectNotes(project.notes),
  completed_at: project.completedAt ?? null,
  archived_at: project.archivedAt ?? null,
  deleted_at: project.deletedAt ?? null,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});

export const rowToProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  area: normalizeProjectArea(row.area),
  status: normalizeProjectStatus(row.status),
  priority: row.priority,
  startDate: row.start_date ?? undefined,
  startTime: normalizeTimeValue(row.start_time),
  dueDate: row.due_date ?? undefined,
  dueTime: normalizeTimeValue(row.due_time),
  sortOrder: row.sort_order ?? undefined,
  pinnedAt: row.pinned_at ?? undefined,
  notes: normalizeProjectNotes(row.notes),
  completedAt: row.completed_at ?? undefined,
  archivedAt: row.archived_at ?? undefined,
  deletedAt: row.deleted_at ?? undefined,
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
  start_date: normalizeDateValue(task.startDate) ?? null,
  start_time: normalizeTimeValue(task.startTime) ?? null,
  due_date: normalizeDateValue(task.dueDate) ?? null,
  due_time: normalizeTimeValue(task.dueTime) ?? null,
  reminder: normalizeTaskReminder(task.reminder),
  recurrence: normalizeTaskRecurrence(task.recurrence),
  recurring_parent_id: task.recurringParentId ?? null,
  parent_task_id: task.parentTaskId ?? null,
  linked_note_ids: task.linkedNoteIds ?? [],
  milestone_id: task.milestoneId ?? null,
  planned_month: task.plannedMonth ?? null,
  planned_week_start: normalizeDateValue(task.plannedWeekStart) ?? null,
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
  parentTaskId: row.parent_task_id ?? undefined,
  linkedNoteIds: row.linked_note_ids ?? [],
  milestoneId: row.milestone_id ?? undefined,
  plannedMonth: row.planned_month ?? undefined,
  plannedWeekStart: row.planned_week_start ?? undefined,
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
  collection: note.collection ?? null,
  tags: note.tags ?? null,
  favorite: note.favorite ?? false,
  client_visible: note.clientVisible ?? false,
  doc_type: normalizeHubNoteDocType(note.docType),
  doc_status: normalizeHubNoteDocStatus(note.docStatus),
  project_ids: note.projectIds ?? [],
  related_note_ids: note.relatedNoteIds ?? [],
  milestone_id: note.milestoneId ?? null,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
});

export const rowToHubNote = (row: HubNoteRow): HubNote => ({
  id: row.id,
  title: row.title,
  body: row.body,
  collection: row.collection ?? undefined,
  tags: row.tags ?? undefined,
  favorite: row.favorite,
  clientVisible: Boolean(row.client_visible),
  docType: normalizeHubNoteDocType(row.doc_type),
  docStatus: normalizeHubNoteDocStatus(row.doc_status),
  projectIds: row.project_ids ?? [],
  relatedNoteIds: row.related_note_ids ?? [],
  milestoneId: row.milestone_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hubNoteSpaceToRow = (space: HubNoteSpace, userId: string): HubNoteSpaceRow => ({
  id: space.id,
  user_id: userId,
  name: space.name,
  description: space.description ?? null,
  project_ids: space.projectIds ?? [],
  manual_note_ids: space.manualNoteIds ?? [],
  created_at: space.createdAt,
  updated_at: space.updatedAt,
});

export const rowToHubNoteSpace = (row: HubNoteSpaceRow): HubNoteSpace => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  projectIds: row.project_ids ?? [],
  manualNoteIds: row.manual_note_ids ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hubPaletteToRow = (palette: HubPalette, userId: string): HubPaletteRow => ({
  id: palette.id,
  user_id: userId,
  name: palette.name,
  project_ids: palette.projectIds ?? [],
  note_ids: palette.noteIds ?? [],
  colors: normalizeHubPaletteColors(palette.colors),
  tags: palette.tags ?? null,
  created_at: palette.createdAt,
  updated_at: palette.updatedAt,
});

export const rowToHubPalette = (row: HubPaletteRow): HubPalette => ({
  id: row.id,
  name: row.name,
  projectIds: row.project_ids ?? [],
  noteIds: row.note_ids ?? [],
  colors: normalizeHubPaletteColors(row.colors),
  tags: row.tags ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const projectMilestoneToRow = (milestone: ProjectMilestone, userId: string): ProjectMilestoneRow => ({
  id: milestone.id,
  user_id: userId,
  project_id: milestone.projectId,
  title: milestone.title,
  status: normalizeProjectMilestoneStatus(milestone.status),
  sort_order: milestone.sortOrder ?? null,
  start_date: normalizeDateValue(milestone.startDate) ?? null,
  due_date: normalizeDateValue(milestone.dueDate) ?? null,
  created_at: milestone.createdAt,
  updated_at: milestone.updatedAt,
});

export const rowToProjectMilestone = (row: ProjectMilestoneRow): ProjectMilestone => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  status: normalizeProjectMilestoneStatus(row.status),
  sortOrder: row.sort_order ?? undefined,
  startDate: row.start_date ?? undefined,
  dueDate: row.due_date ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const hubSnippetToRow = (snippet: HubSnippet, userId: string): HubSnippetRow => ({
  id: snippet.id,
  user_id: userId,
  title: snippet.title,
  type: normalizeHubSnippetType(snippet.type),
  body: snippet.body,
  tags: snippet.tags ?? null,
  created_at: snippet.createdAt,
  updated_at: snippet.updatedAt,
});

export const rowToHubSnippet = (row: HubSnippetRow): HubSnippet => ({
  id: row.id,
  title: row.title,
  type: normalizeHubSnippetType(row.type),
  body: row.body,
  tags: row.tags ?? undefined,
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

function normalizeDateValue(value?: string | null) {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return undefined;

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return undefined;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : undefined;
}

function normalizeProjectArea(value?: string | null) {
  return value === "personal" ? "personal" : "business";
}

function normalizeProjectStatus(value?: string | null): ProjectStatus {
  return value === "paused" || value === "completed" || value === "archived" ? value : "active";
}

function normalizeHubNoteDocType(value?: string | null): HubNoteDocType {
  return value === "brief" ||
    value === "strategy" ||
    value === "research" ||
    value === "palette" ||
    value === "meeting" ||
    value === "prompt" ||
    value === "checklist" ||
    value === "reference" ||
    value === "general"
    ? value
    : "general";
}

function normalizeHubNoteDocStatus(value?: string | null): HubNoteDocStatus {
  return value === "draft" || value === "active" || value === "review" || value === "archived" ? value : "active";
}

function normalizeProjectMilestoneStatus(value?: string | null): ProjectMilestone["status"] {
  return value === "active" || value === "done" ? value : "planned";
}

function normalizeHubSnippetType(value?: string | null): HubSnippetType {
  return value === "prompt" || value === "checklist" || value === "brief-section" || value === "palette-note" || value === "general" ? value : "general";
}

function normalizeHubPaletteColors(value?: HubPaletteColor[] | null): HubPaletteColor[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((color) => color && typeof color.hex === "string")
    .map((color) => {
      const hex = normalizeHexColor(color.hex);

      return {
        id: typeof color.id === "string" && color.id ? color.id : crypto.randomUUID(),
        name: typeof color.name === "string" && color.name.trim() ? color.name.trim() : hex,
        hex,
        role: typeof color.role === "string" && color.role.trim() ? color.role.trim() : undefined,
      };
    });
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9a-f]{6}$/iu.test(withHash) ? withHash.toUpperCase() : "#111827";
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
