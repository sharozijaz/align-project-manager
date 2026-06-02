import { isTerminalTaskStatus } from "../config/taskOptions";
import type { Task } from "../types/task";

export function getProjectTaskProgress(tasks: Task[], projectId: string) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId && !task.deletedAt);
  const completed = projectTasks.filter((task) => isTerminalTaskStatus(task.status)).length;
  const open = projectTasks.length - completed;

  return {
    total: projectTasks.length,
    completed,
    open,
    progress: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
  };
}
