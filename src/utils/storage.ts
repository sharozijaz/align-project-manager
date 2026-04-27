import type { CalendarEvent } from "../types/calendar";
import type { Project } from "../types/project";
import type { Task } from "../types/task";

export interface WorkspaceBackup {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
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
}: {
  tasks: Task[];
  projects: Project[];
  events: CalendarEvent[];
}): WorkspaceBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    events,
  };
}

export function parseWorkspaceBackup(raw: string): WorkspaceBackup {
  const parsed = JSON.parse(raw) as Partial<WorkspaceBackup>;

  if (
    parsed.version !== 1 ||
    !Array.isArray(parsed.tasks) ||
    !Array.isArray(parsed.projects) ||
    !Array.isArray(parsed.events)
  ) {
    throw new Error("This file is not a valid Align workspace backup.");
  }

  return parsed as WorkspaceBackup;
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
