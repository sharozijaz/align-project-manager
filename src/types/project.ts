import type { TaskPriority } from "./task";

export type ProjectStatus = "active" | "completed" | "archived";
export type ProjectArea = "business" | "personal";
export type ProjectNoteVisibility = "private" | "client";

export interface ProjectNote {
  id: string;
  title: string;
  content: string;
  visibility: ProjectNoteVisibility;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  area: ProjectArea;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  sortOrder?: number;
  notes?: ProjectNote[];
  completedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt" | "completedAt" | "archivedAt" | "deletedAt">;
