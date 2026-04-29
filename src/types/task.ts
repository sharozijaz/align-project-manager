import type { TaskCategoryValue, TaskPriorityValue, TaskRecurrenceValue, TaskReminderValue, TaskStatusValue } from "../config/taskOptions";

export type TaskCategory = TaskCategoryValue;
export type TaskPriority = TaskPriorityValue;
export type TaskStatus = TaskStatusValue;
export type TaskReminder = TaskReminderValue;
export type TaskRecurrence = TaskRecurrenceValue;

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  startDate?: string;
  startTime?: string;
  dueDate?: string;
  dueTime?: string;
  reminder: TaskReminder;
  recurrence: TaskRecurrence;
  recurringParentId?: string;
  sortOrder?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "deletedAt" | "recurringParentId">;
