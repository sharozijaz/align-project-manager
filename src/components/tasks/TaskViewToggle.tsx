import { Columns3, Table2 } from "lucide-react";

export type TaskViewMode = "cards" | "table";

export function TaskViewToggle({
  value,
  onChange,
}: {
  value: TaskViewMode;
  onChange: (value: TaskViewMode) => void;
}) {
  return (
    <div className="inline-flex min-h-[68px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:w-auto">
      {[
        { value: "cards" as const, label: "Cards", icon: Columns3 },
        { value: "table" as const, label: "Table", icon: Table2 },
      ].map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-semibold transition sm:flex-none ${
              active
                ? "align-gradient text-white shadow-[var(--shadow-sm)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
            onClick={() => onChange(optionValue)}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
