import type { TaskPriority } from "./task";

export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type ProjectArea = "business" | "personal";
export type ProjectMood = "focused" | "creative" | "technical" | "client" | "personal";

export interface ProjectNote {
  id: string;
  title: string;
  content: string;
  visibility: "private" | "client";
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
  coverImage?: string;
  accentColor?: string;
  icon?: string;
  mood?: ProjectMood;
  sortOrder?: number;
  pinnedAt?: string;
  notes?: ProjectNote[];
  completedAt?: string;
  archivedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt" | "completedAt" | "archivedAt" | "deletedAt">;
