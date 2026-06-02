import { describe, expect, it } from "vitest";
import type { Task } from "../../types/task";
import { getProjectTaskProgress } from "../projectProgress";

const baseTask = (overrides: Partial<Task>): Task => ({
  id: "task",
  title: "Task",
  projectId: "project-1",
  category: "project",
  priority: "medium",
  status: "not_started",
  reminder: "none",
  recurrence: "none",
  createdAt: "2026-06-03T00:00:00.000Z",
  updatedAt: "2026-06-03T00:00:00.000Z",
  ...overrides,
});

describe("getProjectTaskProgress", () => {
  it("excludes deleted tasks and derives open/completed/project progress", () => {
    const result = getProjectTaskProgress(
      [
        baseTask({ id: "done", status: "done" }),
        baseTask({ id: "open" }),
        baseTask({ id: "deleted", status: "done", deletedAt: "2026-06-03T00:00:00.000Z" }),
        baseTask({ id: "other-project", projectId: "project-2", status: "done" }),
      ],
      "project-1",
    );

    expect(result).toEqual({ total: 2, completed: 1, open: 1, progress: 50 });
  });

  it("updates immediately when a task status becomes complete", () => {
    const openTask = baseTask({ id: "open" });
    const before = getProjectTaskProgress([openTask], "project-1");
    const after = getProjectTaskProgress([{ ...openTask, status: "done" }], "project-1");

    expect(before.progress).toBe(0);
    expect(after.progress).toBe(100);
  });
});
