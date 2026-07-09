import type { CalendarEvent } from "../types/calendar";
import type { Project } from "../types/project";
import type { HubNote, HubResource } from "../types/studio";
import type { Task } from "../types/task";

export type WorkspaceSearchKind = "action" | "command" | "project" | "task" | "todo" | "note" | "resource" | "event";

export interface WorkspaceSearchResult {
  id: string;
  kind: WorkspaceSearchKind;
  title: string;
  subtitle: string;
  to: string;
  keywords: string;
  score: number;
}

interface WorkspaceSearchInput {
  query: string;
  pathname?: string;
  projects: Project[];
  tasks: Task[];
  notes: HubNote[];
  resources?: HubResource[];
  events?: CalendarEvent[];
  limit?: number;
}

const navigationCommands: Omit<WorkspaceSearchResult, "score">[] = [
  { id: "command-dashboard", kind: "command", title: "Open Dashboard", subtitle: "Project command center", to: "/", keywords: "home dashboard command center overview" },
  { id: "command-today", kind: "command", title: "Open Today", subtitle: "Daily focus workspace", to: "/today", keywords: "today focus daily next actions" },
  { id: "command-projects", kind: "command", title: "Open Projects", subtitle: "Manage client and personal projects", to: "/projects", keywords: "projects clients work pipeline" },
  { id: "command-tasks", kind: "command", title: "Open Tasks", subtitle: "Project work and task views", to: "/tasks", keywords: "tasks work list board table" },
  { id: "command-todos", kind: "command", title: "Open Todos", subtitle: "Personal todos", to: "/todos", keywords: "todos personal checklist" },
  { id: "command-calendar", kind: "command", title: "Open Calendar", subtitle: "Schedule and deadlines", to: "/calendar", keywords: "calendar schedule events deadlines" },
  { id: "command-docs", kind: "command", title: "Open Docs", subtitle: "Project context and private docs", to: "/docs", keywords: "docs notes context writing" },
  { id: "command-resources", kind: "command", title: "Open Resources", subtitle: "Links, assets, inspiration", to: "/resources", keywords: "resources links assets inspiration" },
  { id: "command-reports", kind: "command", title: "Open Reports", subtitle: "Progress and workload reports", to: "/reports", keywords: "reports progress analytics" },
  { id: "command-settings", kind: "command", title: "Open Settings", subtitle: "Theme, sync, data, and preferences", to: "/settings", keywords: "settings theme sync data preferences" },
];

const actionCommands: Omit<WorkspaceSearchResult, "score">[] = [
  { id: "action-create-project", kind: "action", title: "Create Project", subtitle: "Start a client or personal outcome", to: "/projects?new=project", keywords: "new create project client outcome template" },
  { id: "action-create-task", kind: "action", title: "Create Task", subtitle: "Add execution work tied to a project", to: "/tasks?new=task", keywords: "new create task execution project work" },
  { id: "action-create-todo", kind: "action", title: "Create Todo", subtitle: "Capture loose personal work", to: "/todos?new=todo", keywords: "new create todo personal loose work" },
  { id: "action-create-doc", kind: "action", title: "Create Project Doc", subtitle: "Capture a brief, strategy, research, or decision", to: "/docs?new=doc", keywords: "new create doc note brief strategy research decision" },
  { id: "action-create-palette", kind: "action", title: "Create Palette", subtitle: "Save reusable project colors", to: "/docs?new=palette", keywords: "new create palette colors brand swatches" },
];

export function buildWorkspaceSearchResults({
  query,
  pathname = "/",
  projects,
  tasks,
  notes,
  resources = [],
  events = [],
  limit = 12,
}: WorkspaceSearchInput): WorkspaceSearchResult[] {
  const normalizedQuery = normalize(query);
  const scopeProjectId = projectIdFromPath(pathname);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const candidates: Omit<WorkspaceSearchResult, "score">[] = [
    ...navigationCommands,
    ...actionCommands,
    ...projects
      .filter((project) => !project.deletedAt)
      .map((project) => ({
        id: `project-${project.id}`,
        kind: "project" as const,
        title: project.name,
        subtitle: [project.status, project.priority, project.area].filter(Boolean).join(" · "),
        to: `/projects/${project.id}`,
        keywords: `${project.name} ${project.description ?? ""} ${project.area} ${project.status} ${project.priority}`,
      })),
    ...tasks
      .filter((task) => !task.deletedAt)
      .map((task) => {
        const project = task.projectId ? projectById.get(task.projectId) : undefined;
        return {
          id: `task-${task.id}`,
          kind: task.projectId ? ("task" as const) : ("todo" as const),
          title: task.title,
          subtitle: project ? `${project.name} · ${task.status} · ${task.priority}` : `${task.category} · ${task.status} · ${task.priority}`,
          to: task.projectId ? `/projects/${task.projectId}` : "/todos",
          keywords: `${task.title} ${task.description ?? ""} ${task.category} ${task.status} ${task.priority} ${project?.name ?? ""}`,
        };
      }),
    ...notes.map((note) => {
      const linkedProjectNames = note.projectIds.map((projectId) => projectById.get(projectId)?.name ?? "").join(" ");
      return {
        id: `note-${note.id}`,
        kind: "note" as const,
        title: note.title,
        subtitle: note.collection || linkedProjectNames || "Doc",
        to: "/docs",
        keywords: `${note.title} ${note.body} ${note.tags ?? ""} ${note.collection ?? ""} ${linkedProjectNames}`,
      };
    }),
    ...resources.map((resource) => ({
      id: `resource-${resource.id}`,
      kind: "resource" as const,
      title: resource.title,
      subtitle: resource.collection || resource.type,
      to: "/resources",
      keywords: `${resource.title} ${resource.url ?? ""} ${resource.type} ${resource.collection ?? ""} ${resource.tags ?? ""} ${resource.notes ?? ""}`,
    })),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      kind: "event" as const,
      title: event.title,
      subtitle: `${event.startDate}${event.source === "google" ? " · Google Calendar" : " · Calendar"}`,
      to: "/calendar",
      keywords: `${event.title} ${event.description ?? ""} ${event.startDate} ${event.endDate ?? ""} ${event.source}`,
    })),
  ];

  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, normalizedQuery, scopeProjectId),
    }))
    .filter((candidate) => (normalizedQuery ? candidate.score > 0 : candidate.kind === "command" || candidate.kind === "action"))
    .sort((a, b) => b.score - a.score || kindWeight(b.kind) - kindWeight(a.kind) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function scoreCandidate(candidate: Omit<WorkspaceSearchResult, "score">, query: string, scopeProjectId?: string) {
  if (!query) return candidate.kind === "command" ? 10 + kindWeight(candidate.kind) : 0;

  const title = normalize(candidate.title);
  const subtitle = normalize(candidate.subtitle);
  const keywords = normalize(candidate.keywords);
  const words = query.split(/\s+/u).filter(Boolean);
  let score = 0;

  if (title === query) score += 100;
  if (title.startsWith(query)) score += 70;
  if (title.includes(query)) score += 45;
  if (subtitle.includes(query)) score += 18;
  if (keywords.includes(query)) score += 12;

  words.forEach((word) => {
    if (title.includes(word)) score += 18;
    else if (keywords.includes(word)) score += 6;
  });

  if (scopeProjectId && candidate.to === `/projects/${scopeProjectId}`) score += 12;
  return score + kindWeight(candidate.kind);
}

function kindWeight(kind: WorkspaceSearchKind) {
  if (kind === "project") return 8;
  if (kind === "task") return 7;
  if (kind === "todo") return 6;
  if (kind === "action") return 6;
  if (kind === "command") return 5;
  if (kind === "note") return 4;
  if (kind === "resource") return 3;
  return 2;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/?#]+)/u);
  return match?.[1];
}
