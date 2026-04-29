import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProjects } from "./demoData";
import type { Project, ProjectInput } from "../types/project";

interface ProjectState {
  projects: Project[];
  addProject: (input: ProjectInput) => void;
  updateProject: (id: string, updates: Partial<ProjectInput>) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (orderedIds: string[]) => void;
  replaceProjects: (projects: Project[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: demoProjects,
      addProject: (input) =>
        set((state) => ({
          projects: [
            {
              ...input,
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
            project.id === projectId ? { ...project, ...updates, updatedAt: stamp() } : project,
          ),
        })),
      deleteProject: (projectId) =>
        set((state) => ({ projects: state.projects.filter((project) => project.id !== projectId) })),
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
            .map((project, index) => ({ ...project, sortOrder: Number.isFinite(project.sortOrder) ? project.sortOrder : index }))
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
