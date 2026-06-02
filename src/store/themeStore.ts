import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type AccentColor = "blue" | "violet" | "emerald" | "amber" | "rose";

export const themeOptions = [
  { value: "light", label: "Light", description: "Clean daytime workspace" },
  { value: "dark", label: "Dark", description: "Focused low-light workspace" },
] as const satisfies Array<{ value: ThemeMode; label: string; description: string }>;

export const accentOptions = [
  { value: "blue", label: "Blue", color: "#2563eb" },
  { value: "violet", label: "Violet", color: "#6d5dfc" },
  { value: "emerald", label: "Emerald", color: "#0f9f6e" },
  { value: "amber", label: "Amber", color: "#b7791f" },
  { value: "rose", label: "Rose", color: "#d63b5c" },
] as const satisfies Array<{ value: AccentColor; label: string; color: string }>;

interface ThemeState {
  theme: ThemeMode;
  accentColor: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (accentColor: AccentColor) => void;
  toggleTheme: () => void;
}

const isThemeMode = (theme: unknown): theme is ThemeMode =>
  themeOptions.some((option) => option.value === theme);

const isAccentColor = (accentColor: unknown): accentColor is AccentColor =>
  accentOptions.some((option) => option.value === accentColor);

const normalizeTheme = (theme: unknown): ThemeMode => {
  if (theme === "warmblue" || theme === "mountain" || theme === "pixel-village" || theme === "light") return "light";
  return isThemeMode(theme) ? theme : "dark";
};

const normalizeAccentColor = (accentColor: unknown): AccentColor =>
  isAccentColor(accentColor) ? accentColor : "blue";

export const isLightThemeMode = (theme: ThemeMode) => theme === "light";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      accentColor: "blue",
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "align-theme-v1",
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ThemeState> | undefined;
        return {
          ...state,
          theme: normalizeTheme(state?.theme),
          accentColor: normalizeAccentColor(state?.accentColor),
        };
      },
    },
  ),
);
