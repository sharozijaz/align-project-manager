import type { CSSProperties, ReactNode } from "react";
import type { TaskOption } from "../../config/taskOptions";

export function OptionBadge({ children, option }: { children?: ReactNode; option: TaskOption }) {
  return (
    <span
      className="inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold"
      style={
        {
          backgroundColor: option.bg,
          borderColor: option.border,
          color: option.text,
        } as CSSProperties
      }
    >
      {children ?? option.label}
    </span>
  );
}
