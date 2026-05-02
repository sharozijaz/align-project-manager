import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PersonalHubItem,
  PipelineItem,
  PromptItem,
  ResourceItem,
  StudioDocumentItem,
} from "../types/studio";

type ResourceInput = Omit<ResourceItem, "id" | "createdAt" | "updatedAt">;
type PromptInput = Omit<PromptItem, "id" | "createdAt" | "updatedAt">;
type PipelineInput = Omit<PipelineItem, "id" | "createdAt" | "updatedAt">;
type DocumentInput = Omit<StudioDocumentItem, "id" | "createdAt" | "updatedAt">;
type PersonalInput = Omit<PersonalHubItem, "id" | "createdAt" | "updatedAt">;

interface StudioState {
  resources: ResourceItem[];
  prompts: PromptItem[];
  pipeline: PipelineItem[];
  documents: StudioDocumentItem[];
  personal: PersonalHubItem[];
  addResource: (input: ResourceInput) => void;
  updateResource: (id: string, updates: Partial<ResourceInput>) => void;
  deleteResource: (id: string) => void;
  addPrompt: (input: PromptInput) => void;
  updatePrompt: (id: string, updates: Partial<PromptInput>) => void;
  deletePrompt: (id: string) => void;
  addPipelineItem: (input: PipelineInput) => void;
  updatePipelineItem: (id: string, updates: Partial<PipelineInput>) => void;
  deletePipelineItem: (id: string) => void;
  addDocument: (input: DocumentInput) => void;
  updateDocument: (id: string, updates: Partial<DocumentInput>) => void;
  deleteDocument: (id: string) => void;
  addPersonalItem: (input: PersonalInput) => void;
  updatePersonalItem: (id: string, updates: Partial<PersonalInput>) => void;
  deletePersonalItem: (id: string) => void;
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
      prompts: [],
      pipeline: [],
      documents: [],
      personal: [],
      addResource: (input) => set((state) => ({ resources: [createItem(input), ...state.resources] })),
      updateResource: (itemId, updates) => set((state) => ({ resources: updateItems(state.resources, itemId, updates) })),
      deleteResource: (itemId) => set((state) => ({ resources: state.resources.filter((item) => item.id !== itemId) })),
      addPrompt: (input) => set((state) => ({ prompts: [createItem(input), ...state.prompts] })),
      updatePrompt: (itemId, updates) => set((state) => ({ prompts: updateItems(state.prompts, itemId, updates) })),
      deletePrompt: (itemId) => set((state) => ({ prompts: state.prompts.filter((item) => item.id !== itemId) })),
      addPipelineItem: (input) => set((state) => ({ pipeline: [createItem(input), ...state.pipeline] })),
      updatePipelineItem: (itemId, updates) => set((state) => ({ pipeline: updateItems(state.pipeline, itemId, updates) })),
      deletePipelineItem: (itemId) => set((state) => ({ pipeline: state.pipeline.filter((item) => item.id !== itemId) })),
      addDocument: (input) => set((state) => ({ documents: [createItem(input), ...state.documents] })),
      updateDocument: (itemId, updates) => set((state) => ({ documents: updateItems(state.documents, itemId, updates) })),
      deleteDocument: (itemId) => set((state) => ({ documents: state.documents.filter((item) => item.id !== itemId) })),
      addPersonalItem: (input) => set((state) => ({ personal: [createItem(input), ...state.personal] })),
      updatePersonalItem: (itemId, updates) => set((state) => ({ personal: updateItems(state.personal, itemId, updates) })),
      deletePersonalItem: (itemId) => set((state) => ({ personal: state.personal.filter((item) => item.id !== itemId) })),
    }),
    { name: "align-studio-modules-v1" },
  ),
);
