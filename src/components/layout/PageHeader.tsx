import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
