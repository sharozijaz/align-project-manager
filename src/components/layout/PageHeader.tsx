import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-4 shadow-none sm:px-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 border-l-2 border-[var(--brand-primary)] pl-4">
          <h1 className="text-[1.7rem] font-bold leading-tight tracking-normal text-[var(--text)]">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{actions}</div> : null}
      </div>
    </div>
  );
}
