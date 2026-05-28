export type ProjectTaskViewMode = "cards" | "table" | "board" | "kanban";

export type ProjectTaskField =
  | "status"
  | "priority"
  | "start"
  | "due"
  | "notes"
  | "subtasks"
  | "project"
  | "actions";

export type ProjectTaskFieldVisibility = Record<ProjectTaskField, boolean>;

export const PROJECT_TASK_FIELDS: { key: ProjectTaskField; label: string; description: string }[] = [
  { key: "status", label: "Status", description: "Current workflow stage." },
  { key: "priority", label: "Priority", description: "Importance level." },
  { key: "start", label: "Start", description: "Planned start date." },
  { key: "due", label: "Due", description: "Deadline or target date." },
  { key: "notes", label: "Notes", description: "Short task description." },
  { key: "subtasks", label: "Subtasks", description: "Child task count." },
  { key: "project", label: "Project", description: "Project or category badge." },
  { key: "actions", label: "Actions", description: "Edit and delete controls." },
];

const PROJECT_TASK_FIELD_DEFAULTS: Record<ProjectTaskViewMode, ProjectTaskFieldVisibility> = {
  cards: {
    status: true,
    priority: true,
    start: true,
    due: true,
    notes: true,
    subtasks: true,
    project: true,
    actions: true,
  },
  table: {
    status: true,
    priority: true,
    start: false,
    due: true,
    notes: true,
    subtasks: false,
    project: false,
    actions: true,
  },
  board: {
    status: true,
    priority: true,
    start: true,
    due: true,
    notes: true,
    subtasks: true,
    project: false,
    actions: true,
  },
  kanban: {
    status: false,
    priority: true,
    start: false,
    due: true,
    notes: false,
    subtasks: true,
    project: false,
    actions: false,
  },
};

export function mergeProjectTaskFields(
  view: ProjectTaskViewMode,
  visibility?: Partial<ProjectTaskFieldVisibility>,
): ProjectTaskFieldVisibility {
  return { ...PROJECT_TASK_FIELD_DEFAULTS[view], ...visibility };
}
