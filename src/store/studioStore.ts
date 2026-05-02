import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HubNote, HubResource } from "../types/studio";

type ResourceInput = Omit<HubResource, "id" | "createdAt" | "updatedAt">;
type NoteInput = Omit<HubNote, "id" | "createdAt" | "updatedAt">;

interface StudioState {
  resources: HubResource[];
  notes: HubNote[];
  addResource: (input: ResourceInput) => void;
  updateResource: (id: string, updates: Partial<ResourceInput>) => void;
  deleteResource: (id: string) => void;
  addNote: (input: NoteInput) => void;
  updateNote: (id: string, updates: Partial<NoteInput>) => void;
  deleteNote: (id: string) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function createItem<T extends object>(input: T): T & { id: string; createdAt: string; updatedAt: string } {
  const now = stamp();
  return { ...input, id: id(), createdAt: now, updatedAt: now };
}

function updateItems<T extends { id: string; updatedAt: string }>(items: T[], itemId: string, updates: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>) {
  return items.map((item) => (item.id === itemId ? { ...item, ...updates, updatedAt: stamp() } : item));
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      resources: [],
      notes: [],
      addResource: (input) => set((state) => ({ resources: [createItem(input), ...state.resources] })),
      updateResource: (itemId, updates) => set((state) => ({ resources: updateItems(state.resources, itemId, updates) })),
      deleteResource: (itemId) => set((state) => ({ resources: state.resources.filter((item) => item.id !== itemId) })),
      addNote: (input) => set((state) => ({ notes: [createItem(input), ...state.notes] })),
      updateNote: (itemId, updates) => set((state) => ({ notes: updateItems(state.notes, itemId, updates) })),
      deleteNote: (itemId) => set((state) => ({ notes: state.notes.filter((item) => item.id !== itemId) })),
    }),
    { name: "align-personal-hub-v1" },
  ),
);
