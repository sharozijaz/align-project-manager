import { isOverdue } from "./date";
import type { Task, TaskPriority } from "../types/task";

export function priorityTone(priority: TaskPriority) {
  if (priority === "urgent") return "purple";
  if (priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "emerald";
}

export function taskDateTone(task: Task) {
  return task.status !== "completed" && isOverdue(task.dueDate) ? "red" : "slate";
}

export function taskAccentClass(task: Task) {
  if (task.status !== "completed" && isOverdue(task.dueDate)) {
    return "border-l-4 border-l-red-500";
  }

  const accents: Record<TaskPriority, string> = {
    urgent: "border-l-4 border-l-[var(--priority-urgent-text)]",
    high: "border-l-4 border-l-[var(--priority-high-text)]",
    medium: "border-l-4 border-l-[var(--priority-medium-text)]",
    low: "border-l-4 border-l-[var(--priority-low-text)]",
  };

  return accents[task.priority];
}
