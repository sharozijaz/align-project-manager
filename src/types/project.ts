import type { TaskPriority } from "./task";

export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
