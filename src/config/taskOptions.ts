export const taskPriorityOptions = [
  {
    value: "high",
    label: "High",
    rank: 1,
    bg: "#ffedd5",
    text: "#9a3412",
    border: "#f97316",
  },
  {
    value: "low",
    label: "Low",
    rank: 3,
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
  {
    value: "medium",
    label: "Medium",
    rank: 2,
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  {
    value: "urgent",
    label: "Urgent",
    rank: 0,
    bg: "#f3e8ff",
    text: "#6b21a8",
    border: "#8b5cf6",
  },
] as const;

export const taskStatusOptions = [
  {
    value: "not_started",
    label: "Not Started",
    rank: 0,
    bg: "#eff6ff",
    text: "#1e3a8a",
    border: "#60a5fa",
  },
  {
    value: "in_progress",
    label: "In Progress",
    rank: 1,
    bg: "#e0f2fe",
    text: "#075985",
    border: "#0ea5e9",
  },
  {
    value: "delivered",
    label: "Delivered",
    rank: 2,
    bg: "#ccfbf1",
    text: "#115e59",
    border: "#14b8a6",
  },
  {
    value: "waiting",
    label: "Waiting",
    rank: 3,
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  {
    value: "review",
    label: "Review",
    rank: 4,
    bg: "#ede9fe",
    text: "#5b21b6",
    border: "#8b5cf6",
  },
  {
    value: "approved",
    label: "Approved",
    rank: 5,
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
  {
    value: "done",
    label: "Done",
    rank: 6,
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
] as const;

export const taskCategoryOptions = [
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "project", label: "Project" },
  { value: "meeting", label: "Meeting" },
  { value: "chore", label: "Chore" },
] as const;

export const taskReminderOptions = [
  { value: "none", label: "No reminder", offsetDays: null },
  { value: "due-date", label: "Due date", offsetDays: 0 },
  { value: "day-before", label: "1 day before", offsetDays: 1 },
  { value: "two-days-before", label: "2 days before", offsetDays: 2 },
  { value: "week-before", label: "1 week before", offsetDays: 7 },
] as const;

export const taskRecurrenceOptions = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type TaskPriorityValue = (typeof taskPriorityOptions)[number]["value"];
export type TaskStatusValue = (typeof taskStatusOptions)[number]["value"];
export type TaskCategoryValue = (typeof taskCategoryOptions)[number]["value"];
export type TaskReminderValue = (typeof taskReminderOptions)[number]["value"];
export type TaskRecurrenceValue = (typeof taskRecurrenceOptions)[number]["value"];
export type TaskOption = {
  value: string;
  label: string;
  rank: number;
  bg: string;
  text: string;
  border: string;
};

const unknownPriority: TaskOption = {
  value: "unknown",
  label: "Unknown",
  rank: 99,
  bg: "var(--status-not-started-bg)",
  text: "var(--status-not-started-text)",
  border: "var(--border-strong)",
};

const unknownStatus: TaskOption = {
  value: "unknown",
  label: "Unknown",
  rank: 99,
  bg: "var(--status-not-started-bg)",
  text: "var(--status-not-started-text)",
  border: "var(--border-strong)",
};

export const getTaskPriorityOption = (priority: string): TaskOption =>
  taskPriorityOptions.find((option) => option.value === priority) ?? {
    ...unknownPriority,
    value: priority,
    label: titleizeOption(priority),
  };

export const getTaskStatusOption = (status: string): TaskOption =>
  taskStatusOptions.find((option) => option.value === status) ?? {
    ...unknownStatus,
    value: status,
    label: titleizeOption(status),
  };

export const isKnownTaskPriority = (priority: string) =>
  taskPriorityOptions.some((option) => option.value === priority);

export const isKnownTaskStatus = (status: string) =>
  taskStatusOptions.some((option) => option.value === status);

export const normalizeTaskPriority = (priority: string): TaskPriorityValue =>
  priority === "critical" ? "urgent" : isKnownTaskPriority(priority) ? (priority as TaskPriorityValue) : "medium";

export const normalizeTaskStatus = (status: string): TaskStatusValue => {
  if (status === "not-started" || status === "backlog") return "not_started";
  if (status === "in-progress") return "in_progress";
  if (status === "completed") return "done";
  if (status === "approval-pending" || status === "under-review") return "review";
  if (status === "blocked" || status === "postponed" || status === "cancelled") return "waiting";
  return isKnownTaskStatus(status) ? (status as TaskStatusValue) : "not_started";
};

export const isKnownTaskReminder = (reminder: string) =>
  taskReminderOptions.some((option) => option.value === reminder);

export const normalizeTaskReminder = (reminder?: string): TaskReminderValue =>
  reminder && isKnownTaskReminder(reminder) ? (reminder as TaskReminderValue) : "none";

export const getTaskReminderOption = (reminder?: string) =>
  taskReminderOptions.find((option) => option.value === normalizeTaskReminder(reminder)) ?? taskReminderOptions[0];

export const isKnownTaskRecurrence = (recurrence: string) =>
  taskRecurrenceOptions.some((option) => option.value === recurrence);

export const normalizeTaskRecurrence = (recurrence?: string): TaskRecurrenceValue =>
  recurrence && isKnownTaskRecurrence(recurrence) ? (recurrence as TaskRecurrenceValue) : "none";

export const getTaskRecurrenceOption = (recurrence?: string) =>
  taskRecurrenceOptions.find((option) => option.value === normalizeTaskRecurrence(recurrence)) ?? taskRecurrenceOptions[0];

export const isTerminalTaskStatus = (status: string) => normalizeTaskStatus(status) === "done";

export const titleizeOption = (value: string) =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
