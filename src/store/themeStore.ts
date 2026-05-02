import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "medieval";

export const themeOptions = [
  { value: "dark", label: "Refined Night", description: "Calm dark workspace" },
  { value: "light", label: "Warm Linen", description: "Soft light workspace" },
  { value: "medieval", label: "Medieval Codex", description: "Candlelit focus mode" },
] as const satisfies Array<{ value: ThemeMode; label: string; description: string }>;

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const getNextTheme = (theme: ThemeMode): ThemeMode => {
  const currentIndex = themeOptions.findIndex((option) => option.value === theme);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % themeOptions.length : 0;
  return themeOptions[nextIndex].value;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: getNextTheme(state.theme) })),
    }),
    { name: "align-theme-v1" },
  ),
);
