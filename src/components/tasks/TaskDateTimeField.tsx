import { Input } from "../ui/Input";

export function TaskDateTimeField({
  date,
  time,
  label,
  summary,
  compact = false,
  onDateChange,
  onTimeChange,
}: {
  date?: string;
  time?: string;
  label: string;
  summary?: string;
  compact?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className={`grid gap-2 ${compact ? "grid-cols-[minmax(0,1fr)_96px]" : "grid-cols-[minmax(0,1fr)_112px]"}`}>
        <Input
          type="date"
          value={date ?? ""}
          onChange={(event) => onDateChange(event.target.value)}
          className={`${compact ? "min-h-9 sm:min-h-9" : "min-h-10 sm:min-h-10"} font-bold`}
          aria-label={`${label} date`}
        />
        <Input
          type="time"
          value={time ?? ""}
          onChange={(event) => onTimeChange?.(event.target.value)}
          className={`${compact ? "min-h-9 sm:min-h-9" : "min-h-10 sm:min-h-10"} font-bold`}
          aria-label={`${label} time`}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)]">{summary ?? (date ? label : `No ${label.toLowerCase()}`)}</p>
    </div>
  );
}
