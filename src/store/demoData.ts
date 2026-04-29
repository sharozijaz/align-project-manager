import { todayKey } from "../utils/date";
import type { Project } from "../types/project";
import type { Task } from "../types/task";

const now = new Date().toISOString();

export const demoProjects: Project[] = [
  {
    id: "project-launch-site",
    name: "Launch Product Website",
    description: "Finalize the public launch surface and conversion flow.",
    status: "active",
    priority: "high",
    dueDate: todayKey(),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "project-client-ops",
    name: "Client Ops System",
    description: "Simplify recurring client delivery and reporting.",
    status: "active",
    priority: "medium",
    createdAt: now,
    updatedAt: now,
  },
];

export const demoTasks: Task[] = [
  {
    id: "task-homepage-copy",
    title: "Review homepage messaging",
    description: "Tighten the hero copy and feature order before design pass.",
    projectId: "project-launch-site",
    category: "project",
    priority: "high",
    status: "in-progress",
    dueDate: todayKey(),
    reminder: "due-date",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-calendar-sync-plan",
    title: "Draft calendar sync notes",
    projectId: "project-client-ops",
    category: "meeting",
    priority: "medium",
    status: "not-started",
    dueDate: todayKey(),
    reminder: "day-before",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-desk-reset",
    title: "Clean the desk",
    category: "chore",
    priority: "low",
    status: "not-started",
    reminder: "none",
    createdAt: now,
    updatedAt: now,
  },
];
