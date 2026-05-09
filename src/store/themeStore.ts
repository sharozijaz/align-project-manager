import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "obsidian" | "medieval" | "space" | "warmblue" | "mountain" | "pixel-village";

export const themeOptions = [
  { value: "dark", label: "Refined Night", description: "Calm dark workspace" },
  { value: "obsidian", label: "Obsidian", description: "Notion-style black workspace" },
  { value: "medieval", label: "Medieval Codex", description: "Candlelit focus mode" },
  { value: "space", label: "Deep Space", description: "Blue-black command deck" },
  { value: "warmblue", label: "Warm Navy", description: "Paper-light navy workspace" },
  { value: "mountain", label: "Ink Mountain", description: "Muted parchment and slate" },
  { value: "pixel-village", label: "Pixel Village", description: "Soft RPG landscape palette" },
] as const satisfies Array<{ value: ThemeMode; label: string; description: string }>;

export const lightThemeModes = ["warmblue", "mountain", "pixel-village"] as const satisfies ThemeMode[];

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

const isThemeMode = (theme: unknown): theme is ThemeMode =>
  themeOptions.some((option) => option.value === theme);

const normalizeTheme = (theme: unknown): ThemeMode => {
  if (theme === "light") return "obsidian";
  return isThemeMode(theme) ? theme : "dark";
};

export const isLightThemeMode = (theme: ThemeMode) => lightThemeModes.includes(theme as (typeof lightThemeModes)[number]);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: getNextTheme(state.theme) })),
    }),
    {
      name: "align-theme-v1",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ThemeState> | undefined;
        return { ...state, theme: normalizeTheme(state?.theme) };
      },
    },
  ),
);
