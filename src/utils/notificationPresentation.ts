import type { AppNotification } from "../types/notification";
import type { Project } from "../types/project";
import type { Task } from "../types/task";

export function groupNotifications(items: AppNotification[]) {
  return {
    unread: items.filter((item) => !item.readAt),
    read: items.filter((item) => item.readAt),
  };
}

export function notificationContext(
  item: AppNotification,
  taskById: Map<string, Pick<Task, "projectId" | "title">>,
  projectById: Map<string, Pick<Project, "name">>,
) {
  const task = item.taskId ? taskById.get(item.taskId) : undefined;
  const project = task?.projectId ? projectById.get(task.projectId) : undefined;
  const fallbackLabels: Record<AppNotification["type"], string> = {
    "task-reminder": "",
    "project-due": "Project deadline",
    "weekly-summary": "Weekly summary",
    "monthly-summary": "Monthly summary",
  };

  return {
    task,
    project,
    label: project ? project.name : task ? "Personal task" : fallbackLabels[item.type],
  };
}
