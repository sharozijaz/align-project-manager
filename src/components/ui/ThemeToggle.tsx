import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

export function ThemeToggle({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 text-sm font-semibold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)] ${className}`}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
      {showLabel ? <span>{isDark ? "Dark" : "Light"}</span> : null}
    </button>
  );
}
