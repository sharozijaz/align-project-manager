export const taskPriorityOptions = [
  {
    value: "low",
    label: "Low",
    rank: 4,
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
  {
    value: "medium",
    label: "Medium",
    rank: 3,
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  {
    value: "high",
    label: "High",
    rank: 2,
    bg: "#ffedd5",
    text: "#9a3412",
    border: "#f97316",
  },
  {
    value: "urgent",
    label: "Urgent",
    rank: 1,
    bg: "#f3e8ff",
    text: "#6b21a8",
    border: "#8b5cf6",
  },
  {
    value: "critical",
    label: "Critical",
    rank: 0,
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#ef4444",
  },
] as const;

export const taskStatusOptions = [
  {
    value: "backlog",
    label: "Backlog",
    rank: 0,
    bg: "#f1f5f9",
    text: "#334155",
    border: "#94a3b8",
  },
  {
    value: "not-started",
    label: "Not Started",
    rank: 1,
    bg: "#eff6ff",
    text: "#1e3a8a",
    border: "#60a5fa",
  },
  {
    value: "in-progress",
    label: "In Progress",
    rank: 2,
    bg: "#e0f2fe",
    text: "#075985",
    border: "#0ea5e9",
  },
  {
    value: "review",
    label: "Review",
    rank: 3,
    bg: "#ede9fe",
    text: "#5b21b6",
    border: "#8b5cf6",
  },
  {
    value: "blocked",
    label: "Blocked",
    rank: 4,
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#ef4444",
  },
  {
    value: "waiting",
    label: "Waiting",
    rank: 5,
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  {
    value: "completed",
    label: "Completed",
    rank: 6,
    bg: "#dcfce7",
    text: "#166534",
    border: "#22c55e",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    rank: 7,
    bg: "#f3f4f6",
    text: "#4b5563",
    border: "#9ca3af",
  },
] as const;

export const taskCategoryOptions = [
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "project", label: "Project" },
  { value: "meeting", label: "Meeting" },
  { value: "chore", label: "Chore" },
] as const;

export type TaskPriorityValue = (typeof taskPriorityOptions)[number]["value"];
export type TaskStatusValue = (typeof taskStatusOptions)[number]["value"];
export type TaskCategoryValue = (typeof taskCategoryOptions)[number]["value"];
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

export const isTerminalTaskStatus = (status: string) => status === "completed" || status === "cancelled";

export const titleizeOption = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
