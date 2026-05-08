import type { Project } from "../../types/project";
import type { Task } from "../../types/task";

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTasksBridgeSettings {
  enabled: boolean;
  todayListId: string;
  inboxListId: string;
  lastSyncedAt?: string;
  lastError?: string;
  updatedAt?: string;
}

export interface GoogleTasksBridgeStatus {
  connected: boolean;
  needsReconnect: boolean;
  scopes: string[];
  lists: GoogleTaskList[];
  settings: GoogleTasksBridgeSettings;
  accountEmail?: string;
  updatedAt?: string;
}

export interface GoogleTasksImportConflict {
  title: string;
  hint: string;
  matches: string[];
  reason: string;
}

export interface GoogleTasksBridgeSyncResult {
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  imported: number;
  importedTasks: Task[];
  importConflicts: GoogleTasksImportConflict[];
  settings: GoogleTasksBridgeSettings;
  lists: GoogleTaskList[];
}

export interface GoogleTasksBridgeSyncPayload {
  tasks: Task[];
  projects: Project[];
  settings: GoogleTasksBridgeSettings;
}
