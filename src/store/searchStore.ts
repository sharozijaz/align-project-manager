import { create } from "zustand";

interface SearchState {
  query: string;
  open: boolean;
  setQuery: (query: string) => void;
  openPalette: (query?: string) => void;
  closePalette: () => void;
  clearQuery: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  open: false,
  setQuery: (query) => set({ query }),
  openPalette: (query) => set((state) => ({ open: true, query: query ?? state.query })),
  closePalette: () => set({ open: false }),
  clearQuery: () => set({ query: "" }),
}));
