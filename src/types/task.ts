import type { TaskCategoryValue, TaskPriorityValue, TaskStatusValue } from "../config/taskOptions";

export type TaskCategory = TaskCategoryValue;
export type TaskPriority = TaskPriorityValue;
export type TaskStatus = TaskStatusValue;

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "deletedAt">;
