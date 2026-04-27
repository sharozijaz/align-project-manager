import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProjects } from "./demoData";
import type { Project, ProjectInput } from "../types/project";

interface ProjectState {
  projects: Project[];
  addProject: (input: ProjectInput) => void;
  updateProject: (id: string, updates: Partial<ProjectInput>) => void;
  deleteProject: (id: string) => void;
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
      replaceProjects: (projects) => set({ projects }),
    }),
    { name: "priority-projects-v1" },
  ),
);
