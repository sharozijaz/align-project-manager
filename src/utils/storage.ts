import type { CalendarEvent } from "../types/calendar";
import type { Project } from "../types/project";
import type { HubNote, HubNoteSpace, HubResource } from "../types/studio";
import type { Task } from "../types/task";

export interface WorkspaceBackupPreferences {
  theme?: string;
  accentColor?: string;
  heroImage?: string;
  autoCleanTasks?: boolean;
  autoCleanProjects?: boolean;
}

interface WorkspaceBackupV1 {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
}

export interface WorkspaceBackup {
  version: 2;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  preferences: WorkspaceBackupPreferences;
}

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function createWorkspaceBackup({
  tasks,
  projects,
  events,
  resources,
  notes,
  noteSpaces,
  preferences,
}: {
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces?: HubNoteSpace[];
  preferences?: WorkspaceBackupPreferences;
}): WorkspaceBackup {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    events,
    resources,
    notes,
    noteSpaces: noteSpaces ?? [],
    preferences: preferences ?? {},
  };
}

export function saveWorkspaceSafetyBackup(
  reason: string,
  workspace: Omit<WorkspaceBackup, "version" | "exportedAt" | "preferences" | "noteSpaces"> & { noteSpaces?: HubNoteSpace[]; preferences?: WorkspaceBackupPreferences },
) {
  if (typeof window === "undefined") {
    return "";
  }

  const backup = createWorkspaceBackup(workspace);
  window.localStorage.setItem(
    "align-workspace-safety-backup-v2",
    JSON.stringify({
      reason,
      ...backup,
    }),
  );
  return backup.exportedAt;
}

export function parseWorkspaceBackup(raw: string): WorkspaceBackup {
  const parsed = JSON.parse(raw) as Partial<WorkspaceBackup | WorkspaceBackupV1>;

  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.events)) {
    throw new Error("This file is not a valid Align workspace backup.");
  }

  if (parsed.version === 1) {
    return {
      version: 2,
      exportedAt: parsed.exportedAt ?? new Date().toISOString(),
      tasks: parsed.tasks,
      projects: parsed.projects,
      events: parsed.events,
      resources: [],
      notes: [],
      noteSpaces: [],
      preferences: {},
    };
  }

  if (parsed.version !== 2 || !Array.isArray(parsed.resources) || !Array.isArray(parsed.notes)) {
    throw new Error("This file is not a valid Align workspace backup.");
  }

  return {
    version: 2,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    tasks: parsed.tasks,
    projects: parsed.projects,
    events: parsed.events,
    resources: parsed.resources,
    notes: parsed.notes,
    noteSpaces: Array.isArray(parsed.noteSpaces) ? parsed.noteSpaces : [],
    preferences: parsed.preferences ?? {},
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
