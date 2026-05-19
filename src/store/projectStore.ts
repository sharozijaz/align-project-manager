import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProjects } from "./demoData";
import { isSupabaseConfigured } from "../integrations/supabase/client";
import type { Project, ProjectInput, ProjectStatus } from "../types/project";
import { isDeletedBeyondRetention } from "../utils/trash";

interface ProjectState {
  projects: Project[];
  addProject: (input: ProjectInput) => void;
  updateProject: (id: string, updates: Partial<ProjectInput>) => void;
  completeProject: (id: string, archive?: boolean) => void;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;
  pinProject: (id: string) => void;
  unpinProject: (id: string) => void;
  deleteProject: (id: string) => void;
  permanentlyDeleteProject: (id: string) => void;
  cleanupDeletedProjects: (retentionDays: number) => void;
  reorderProjects: (orderedIds: string[]) => void;
  replaceProjects: (projects: Project[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: isSupabaseConfigured ? [] : demoProjects,
      addProject: (input) =>
        set((state) => ({
          projects: [
            {
              ...input,
              status: normalizeProjectStatus(input.status),
              id: id(),
              sortOrder: nextTopSortOrder(state.projects),
              createdAt: stamp(),
              updatedAt: stamp(),
            },
            ...state.projects,
          ],
        })),
      updateProject: (projectId, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? applyProjectUpdates(project, updates) : project,
          ),
        })),
      completeProject: (projectId, archive = false) =>
        set((state) => {
          const now = stamp();
          return {
            projects: state.projects.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    status: archive ? "archived" : "completed",
                    completedAt: project.completedAt ?? now,
                    archivedAt: archive ? (project.archivedAt ?? now) : project.archivedAt,
                    deletedAt: undefined,
                    updatedAt: now,
                  }
                : project,
            ),
          };
        }),
      archiveProject: (projectId) =>
        set((state) => {
          const now = stamp();
          return {
            projects: state.projects.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    status: "archived",
                    archivedAt: project.archivedAt ?? now,
                    deletedAt: undefined,
                    updatedAt: now,
                  }
                : project,
            ),
          };
        }),
      restoreProject: (projectId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  status: project.deletedAt ? normalizeProjectStatus(project.status) : "active",
                  archivedAt: project.deletedAt ? project.archivedAt : undefined,
                  deletedAt: undefined,
                  updatedAt: stamp(),
                }
              : project,
          ),
        })),
      pinProject: (projectId) =>
        set((state) => {
          const now = stamp();
          return {
            projects: state.projects.map((project) =>
              project.id === projectId ? { ...project, pinnedAt: now, updatedAt: now } : project,
            ),
          };
        }),
      unpinProject: (projectId) =>
        set((state) => {
          const now = stamp();
          return {
            projects: state.projects.map((project) =>
              project.id === projectId ? { ...project, pinnedAt: undefined, updatedAt: now } : project,
            ),
          };
        }),
      deleteProject: (projectId) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, deletedAt: stamp(), updatedAt: stamp() } : project,
          ),
        })),
      permanentlyDeleteProject: (projectId) =>
        set((state) => ({ projects: state.projects.filter((project) => project.id !== projectId) })),
      cleanupDeletedProjects: (retentionDays) =>
        set((state) => ({
          projects: state.projects.filter((project) => !isDeletedBeyondRetention(project.deletedAt, retentionDays)),
        })),
      reorderProjects: (orderedIds) =>
        set((state) => {
          const order = new Map(orderedIds.map((projectId, index) => [projectId, index]));
          return {
            projects: state.projects
              .map((project) => (order.has(project.id) ? { ...project, sortOrder: order.get(project.id), updatedAt: stamp() } : project))
              .sort(compareSortOrder),
          };
        }),
      replaceProjects: (projects) =>
        set({
          projects: projects
            .map((project, index) => ({
              ...project,
              area: project.area ?? "business",
              status: normalizeProjectStatus(project.status),
              sortOrder: Number.isFinite(project.sortOrder) ? project.sortOrder : index,
              pinnedAt: project.pinnedAt,
            }))
            .sort(compareSortOrder),
        }),
    }),
    { name: "priority-projects-v1" },
  ),
);

function compareSortOrder(a: Project, b: Project) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.createdAt.localeCompare(a.createdAt);
}

function nextTopSortOrder(projects: Project[]) {
  const orders = projects.map((project) => project.sortOrder).filter((value): value is number => Number.isFinite(value));
  return orders.length ? Math.min(...orders) - 1 : 0;
}

function normalizeProjectStatus(status?: string): ProjectStatus {
  return status === "paused" || status === "completed" || status === "archived" ? status : "active";
}

function applyProjectUpdates(project: Project, updates: Partial<ProjectInput>): Project {
  const now = stamp();
  const nextStatus = updates.status ? normalizeProjectStatus(updates.status) : normalizeProjectStatus(project.status);
  const next: Project = {
    ...project,
    ...updates,
    status: nextStatus,
    updatedAt: now,
  };

  if (updates.status) {
    if (nextStatus === "completed") {
      next.completedAt = project.completedAt ?? now;
      next.archivedAt = undefined;
      next.deletedAt = undefined;
    }

    if (nextStatus === "archived") {
      next.archivedAt = project.archivedAt ?? now;
      next.deletedAt = undefined;
    }

    if (nextStatus === "active" || nextStatus === "paused") {
      next.completedAt = undefined;
      next.archivedAt = undefined;
      next.deletedAt = undefined;
    }
  }

  return next;
}
