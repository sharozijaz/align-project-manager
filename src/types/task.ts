export type TaskCategory = "personal" | "work" | "project" | "meeting" | "chore";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "not-started" | "in-progress" | "completed";

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
