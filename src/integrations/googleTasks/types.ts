import type { Task } from "../../types/task";

interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTodoSyncSettings {
  enabled: boolean;
  todoListId: string;
  lastSyncedAt?: string;
  lastError?: string;
  updatedAt?: string;
}

export interface GoogleTodoSyncStatus {
  connected: boolean;
  needsReconnect: boolean;
  scopes: string[];
  lists: GoogleTaskList[];
  settings: GoogleTodoSyncSettings;
  accountEmail?: string;
  updatedAt?: string;
}

export interface GoogleTodoSyncResult {
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  imported: number;
  changedTasks: Task[];
  settings: GoogleTodoSyncSettings;
  lists: GoogleTaskList[];
}

export interface GoogleTodoSyncPayload {
  tasks: Task[];
  settings: GoogleTodoSyncSettings;
}
