import type { TaskPriority } from "./task";

export type ProjectStatus = "active" | "paused" | "completed";
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
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
