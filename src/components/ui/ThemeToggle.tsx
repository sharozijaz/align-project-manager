import { Flame, Moon, Sun } from "lucide-react";
import { themeOptions, useThemeStore, type ThemeMode } from "../../store/themeStore";

const themeIcons: Record<ThemeMode, typeof Moon> = {
  dark: Moon,
  light: Sun,
  medieval: Flame,
};

export function ThemeToggle({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const Icon = themeIcons[currentTheme.value];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 text-sm font-semibold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)] ${className}`}
      title={`Switch theme. Current theme: ${currentTheme.label}`}
      aria-label={`Switch theme. Current theme: ${currentTheme.label}`}
    >
      <Icon size={16} />
      {showLabel ? <span>{currentTheme.label}</span> : null}
    </button>
  );
}
