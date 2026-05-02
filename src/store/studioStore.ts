import { create } from "zustand";
import { persist } from "zustand/middleware";
import { RESOURCE_SEED_VERSION, resourceSeeds } from "../data/resourceSeeds";
import type { HubNote, HubResource } from "../types/studio";

type ResourceInput = Omit<HubResource, "id" | "createdAt" | "updatedAt">;
type NoteInput = Omit<HubNote, "id" | "createdAt" | "updatedAt">;

interface StudioState {
  resources: HubResource[];
  notes: HubNote[];
  resourceSeedVersion?: string;
  importSeedResources: () => void;
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

function resourceKey(resource: Pick<HubResource, "collection" | "title" | "url">) {
  return [resource.collection ?? "", resource.title, resource.url ?? ""].map((value) => value.trim().toLowerCase()).join("|");
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      resources: [],
      notes: [],
      resourceSeedVersion: undefined,
      importSeedResources: () =>
        set((state) => {
          if (state.resourceSeedVersion === RESOURCE_SEED_VERSION) return {};

          const existing = new Set(state.resources.map(resourceKey));
          const seededResources = resourceSeeds
            .filter((resource) => !existing.has(resourceKey(resource)))
            .map((resource) => createItem({ ...resource, favorite: resource.favorite ?? false }));

          return {
            resources: [...seededResources, ...state.resources],
            resourceSeedVersion: RESOURCE_SEED_VERSION,
          };
        }),
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
