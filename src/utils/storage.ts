import type { CalendarEvent } from "../types/calendar";
import type { Project, ProjectMilestone } from "../types/project";
import type { HubNote, HubNoteSpace, HubPalette, HubResource, HubSnippet } from "../types/studio";
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

interface WorkspaceBackupV2 extends Omit<WorkspaceBackup, "version" | "milestones" | "snippets"> {
  version: 2;
}

export interface WorkspaceBackup {
  version: 3;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  milestones: ProjectMilestone[];
  events: CalendarEvent[];
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  palettes: HubPalette[];
  snippets: HubSnippet[];
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
  milestones,
  resources,
  notes,
  noteSpaces,
  palettes,
  snippets,
  preferences,
}: {
  tasks: Task[];
  projects: Project[];
  milestones?: ProjectMilestone[];
  events: CalendarEvent[];
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces?: HubNoteSpace[];
  palettes?: HubPalette[];
  snippets?: HubSnippet[];
  preferences?: WorkspaceBackupPreferences;
}): WorkspaceBackup {
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    milestones: milestones ?? [],
    events,
    resources,
    notes,
    noteSpaces: noteSpaces ?? [],
    palettes: palettes ?? [],
    snippets: snippets ?? [],
    preferences: preferences ?? {},
  };
}

export function saveWorkspaceSafetyBackup(
  reason: string,
  workspace: Omit<WorkspaceBackup, "version" | "exportedAt" | "preferences" | "milestones" | "noteSpaces" | "palettes" | "snippets"> & {
    milestones?: ProjectMilestone[];
    noteSpaces?: HubNoteSpace[];
    palettes?: HubPalette[];
    snippets?: HubSnippet[];
    preferences?: WorkspaceBackupPreferences;
  },
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
  const parsed = JSON.parse(raw) as Partial<WorkspaceBackup | WorkspaceBackupV2 | WorkspaceBackupV1>;

  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.events)) {
    throw new Error("This file is not a valid Align workspace backup.");
  }

  if (parsed.version === 1) {
    return {
      version: 3,
      exportedAt: parsed.exportedAt ?? new Date().toISOString(),
      tasks: parsed.tasks,
      projects: parsed.projects,
      events: parsed.events,
      milestones: [],
      resources: [],
      notes: [],
      noteSpaces: [],
      palettes: [],
      snippets: [],
      preferences: {},
    };
  }

  if ((parsed.version !== 2 && parsed.version !== 3) || !Array.isArray(parsed.resources) || !Array.isArray(parsed.notes)) {
    throw new Error("This file is not a valid Align workspace backup.");
  }

  return {
    version: 3,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    tasks: parsed.tasks,
    projects: parsed.projects,
    milestones: Array.isArray((parsed as Partial<WorkspaceBackup>).milestones) ? (parsed as Partial<WorkspaceBackup>).milestones ?? [] : [],
    events: parsed.events,
    resources: parsed.resources,
    notes: parsed.notes,
    noteSpaces: Array.isArray(parsed.noteSpaces) ? parsed.noteSpaces : [],
    palettes: Array.isArray(parsed.palettes) ? parsed.palettes : [],
    snippets: Array.isArray((parsed as Partial<WorkspaceBackup>).snippets) ? (parsed as Partial<WorkspaceBackup>).snippets ?? [] : [],
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
