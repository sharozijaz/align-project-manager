import { isOverdue } from "./date";
import { getTaskPriorityOption, isTerminalTaskStatus } from "../config/taskOptions";
import type { Task, TaskPriority } from "../types/task";

export function priorityTone(priority: TaskPriority) {
  if (priority === "critical") return "red";
  if (priority === "urgent") return "purple";
  if (priority === "high") return "orange";
  if (priority === "medium") return "amber";
  return "emerald";
}

export function taskDateTone(task: Task) {
  return !isTerminalTaskStatus(task.status) && isOverdue(task.dueDate) ? "red" : "slate";
}

export function taskAccentClass(task: Task) {
  if (!isTerminalTaskStatus(task.status) && isOverdue(task.dueDate)) {
    return "border-l-4 border-l-red-500";
  }

  return "border-l-4";
}

export function taskAccentStyle(task: Task) {
  if (!isTerminalTaskStatus(task.status) && isOverdue(task.dueDate)) {
    return { borderLeftColor: "var(--danger)" };
  }

  return { borderLeftColor: getTaskPriorityOption(task.priority).border };
}
