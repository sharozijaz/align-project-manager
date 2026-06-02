import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../../types/calendar";
import type { Project } from "../../types/project";
import type { HubNote, HubResource } from "../../types/studio";
import type { Task } from "../../types/task";
import { buildWorkspaceSearchResults } from "../workspaceSearch";

const now = "2026-06-03T00:00:00.000Z";

const project: Project = {
  id: "project-1",
  name: "Providers International",
  area: "business",
  status: "active",
  priority: "high",
  createdAt: now,
  updatedAt: now,
};

const tasks: Task[] = [
  {
    id: "task-1",
    title: "Call Bank Manager",
    projectId: "project-1",
    category: "project",
    priority: "medium",
    status: "not_started",
    reminder: "none",
    recurrence: "none",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "todo-1",
    title: "Buy notebook",
    category: "personal",
    priority: "low",
    status: "not_started",
    reminder: "none",
    recurrence: "none",
    createdAt: now,
    updatedAt: now,
  },
];

const notes: HubNote[] = [
  {
    id: "note-1",
    title: "Launch notes",
    body: "Client launch context",
    projectIds: ["project-1"],
    relatedNoteIds: [],
    createdAt: now,
    updatedAt: now,
  },
];

const resources: HubResource[] = [
  {
    id: "resource-1",
    title: "Design system link",
    type: "tools",
    url: "https://example.com",
    createdAt: now,
    updatedAt: now,
  },
];

const events: CalendarEvent[] = [{ id: "event-1", title: "Client review", startDate: "2026-06-04", source: "local" }];

describe("buildWorkspaceSearchResults", () => {
  it("returns navigation commands when the query is empty", () => {
    const results = buildWorkspaceSearchResults({ query: "", projects: [project], tasks, notes, resources, events });

    expect(results[0]?.kind).toBe("command");
    expect(results.some((result) => result.to === "/projects")).toBe(true);
  });

  it("routes project tasks to their project workspace and personal tasks to todos", () => {
    const projectTask = buildWorkspaceSearchResults({ query: "bank", projects: [project], tasks, notes, resources, events })[0];
    const personalTodo = buildWorkspaceSearchResults({ query: "notebook", projects: [project], tasks, notes, resources, events })[0];

    expect(projectTask).toMatchObject({ kind: "task", to: "/projects/project-1" });
    expect(personalTodo).toMatchObject({ kind: "todo", to: "/todos" });
  });

  it("searches project context across notes, resources, and calendar events", () => {
    const noteResult = buildWorkspaceSearchResults({ query: "launch", projects: [project], tasks, notes, resources, events })[0];
    const resourceResult = buildWorkspaceSearchResults({ query: "design", projects: [project], tasks, notes, resources, events })[0];
    const eventResult = buildWorkspaceSearchResults({ query: "review", projects: [project], tasks, notes, resources, events })[0];

    expect(noteResult?.kind).toBe("note");
    expect(resourceResult?.kind).toBe("resource");
    expect(eventResult?.kind).toBe("event");
  });
});
