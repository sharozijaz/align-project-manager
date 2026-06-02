import { Check, Moon, Sun } from "lucide-react";
import { accentOptions, themeOptions, useThemeStore } from "../../store/themeStore";

export function ThemeToggle({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 text-sm font-semibold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)] ${className}`}
      title={`Switch theme. Current theme: ${currentTheme.label}`}
      aria-label={`Switch theme. Current theme: ${currentTheme.label}`}
    >
      <Icon size={16} />
      {showLabel ? <span>{currentTheme.label}</span> : null}
    </button>
  );
}

export function AccentColorPicker({ compact = false }: { compact?: boolean }) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const setAccentColor = useThemeStore((state) => state.setAccentColor);

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`} aria-label="Accent color">
      {accentOptions.map((option) => (
        <AccentButton
          key={option.value}
          option={option}
          selected={option.value === accentColor}
          onSelect={() => setAccentColor(option.value)}
          compact={compact}
        />
      ))}
    </div>
  );
}

function AccentButton({
  option,
  selected,
  compact,
  onSelect,
}: {
  option: (typeof accentOptions)[number];
  selected: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid place-items-center rounded-[var(--radius-sm)] border transition hover:border-[var(--border-strong)] ${
        compact ? "h-8 w-8" : "h-10 w-10"
      } ${selected ? "border-[var(--text)] shadow-[var(--shadow-focus)]" : "border-[var(--border)]"}`}
      style={{ backgroundColor: option.color }}
      aria-label={`${option.label} accent`}
      aria-pressed={selected}
      title={`${option.label} accent`}
    >
      {selected ? <Check size={compact ? 14 : 16} className="text-white" /> : null}
    </button>
  );
}
