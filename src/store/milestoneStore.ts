import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectMilestone, ProjectMilestoneInput, ProjectMilestoneStatus } from "../types/project";

interface MilestoneState {
  milestones: ProjectMilestone[];
  addMilestone: (input: ProjectMilestoneInput) => ProjectMilestone;
  updateMilestone: (id: string, updates: Partial<ProjectMilestoneInput>) => void;
  deleteMilestone: (id: string) => void;
  replaceMilestones: (milestones: ProjectMilestone[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const statuses: ProjectMilestoneStatus[] = ["planned", "active", "done"];

function normalizeMilestone(milestone: ProjectMilestone, index = 0): ProjectMilestone {
  return {
    ...milestone,
    title: milestone.title.trim() || "Untitled milestone",
    status: statuses.includes(milestone.status) ? milestone.status : "planned",
    sortOrder: Number.isFinite(milestone.sortOrder) ? milestone.sortOrder : index,
    startDate: milestone.startDate || undefined,
    dueDate: milestone.dueDate || undefined,
  };
}

export const useMilestoneStore = create<MilestoneState>()(
  persist(
    (set) => ({
      milestones: [],
      addMilestone: (input) => {
        const milestone = normalizeMilestone({ ...input, id: id(), createdAt: stamp(), updatedAt: stamp() });
        set((state) => ({ milestones: [milestone, ...state.milestones] }));
        return milestone;
      },
      updateMilestone: (milestoneId, updates) =>
        set((state) => ({
          milestones: state.milestones.map((milestone, index) =>
            milestone.id === milestoneId ? normalizeMilestone({ ...milestone, ...updates, updatedAt: stamp() }, index) : milestone,
          ),
        })),
      deleteMilestone: (milestoneId) => set((state) => ({ milestones: state.milestones.filter((milestone) => milestone.id !== milestoneId) })),
      replaceMilestones: (milestones) => set({ milestones: milestones.map(normalizeMilestone) }),
    }),
    { name: "align-project-milestones-v1" },
  ),
);
