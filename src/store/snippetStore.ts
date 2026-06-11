import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HubSnippet, HubSnippetType } from "../types/studio";

type SnippetInput = Omit<HubSnippet, "id" | "createdAt" | "updatedAt">;

interface SnippetState {
  snippets: HubSnippet[];
  addSnippet: (input: SnippetInput) => HubSnippet;
  updateSnippet: (id: string, updates: Partial<SnippetInput>) => void;
  deleteSnippet: (id: string) => void;
  replaceSnippets: (snippets: HubSnippet[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const snippetTypes: HubSnippetType[] = ["prompt", "checklist", "brief-section", "palette-note", "general"];

function normalizeSnippet(snippet: HubSnippet): HubSnippet {
  return {
    ...snippet,
    title: snippet.title.trim() || "Untitled snippet",
    type: snippetTypes.includes(snippet.type) ? snippet.type : "general",
    body: snippet.body ?? "",
    tags: snippet.tags?.trim() || undefined,
  };
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: [],
      addSnippet: (input) => {
        const snippet = normalizeSnippet({ ...input, id: id(), createdAt: stamp(), updatedAt: stamp() });
        set((state) => ({ snippets: [snippet, ...state.snippets] }));
        return snippet;
      },
      updateSnippet: (snippetId, updates) =>
        set((state) => ({
          snippets: state.snippets.map((snippet) => (snippet.id === snippetId ? normalizeSnippet({ ...snippet, ...updates, updatedAt: stamp() }) : snippet)),
        })),
      deleteSnippet: (snippetId) => set((state) => ({ snippets: state.snippets.filter((snippet) => snippet.id !== snippetId) })),
      replaceSnippets: (snippets) => set({ snippets: snippets.map(normalizeSnippet) }),
    }),
    { name: "align-hub-snippets-v1" },
  ),
);
