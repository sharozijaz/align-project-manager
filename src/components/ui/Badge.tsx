import type { ReactNode } from "react";

const toneMap = {
  slate: "border-transparent bg-[var(--status-not-started-bg)] text-[var(--status-not-started-text)]",
  blue: "border-transparent bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress-text)]",
  amber: "border-transparent bg-[var(--priority-medium-bg)] text-[var(--priority-medium-text)]",
  orange: "border-transparent bg-[var(--priority-high-bg)] text-[var(--priority-high-text)]",
  purple: "border-transparent bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent-text)]",
  red: "border-transparent bg-[var(--priority-high-bg)] text-[var(--priority-high-text)]",
  rose: "border-transparent bg-[var(--button-danger-bg)] text-[var(--button-danger-text)]",
  emerald: "border-transparent bg-[var(--priority-low-bg)] text-[var(--priority-low-text)]",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof toneMap }) {
  return (
    <span className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
