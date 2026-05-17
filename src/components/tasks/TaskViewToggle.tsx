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
    <div className="align-tab-list min-w-0 xl:shrink-0">
      {[
        { value: "cards" as const, label: "Cards", icon: Columns3 },
        { value: "table" as const, label: "Table", icon: Table2 },
      ].map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            className="align-tab"
            data-active={active}
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
