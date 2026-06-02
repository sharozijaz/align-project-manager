import { Search, X } from "lucide-react";
import { Button } from "./Button";

export function ScopedSearchNotice({
  query,
  scope,
  resultCount,
  onClear,
}: {
  query: string;
  scope: string;
  resultCount: number;
  onClear: () => void;
}) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
          <Search size={16} />
        </span>
        <p className="min-w-0 font-semibold text-[var(--text-muted)]">
          Filtering <span className="font-black text-[var(--text)]">{scope}</span> for{" "}
          <span className="font-black text-[var(--text)]">"{trimmed}"</span>
          <span className="ml-2 text-[var(--text-soft)]">{resultCount} shown</span>
        </p>
      </div>
      <Button type="button" variant="secondary" icon={<X size={15} />} className="min-h-9 justify-center px-3" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
