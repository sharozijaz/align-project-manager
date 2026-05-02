import type { ReactNode, TextareaHTMLAttributes } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function StudioForm({
  title,
  description,
  children,
  actionLabel,
}: {
  title: string;
  description: string;
  children: ReactNode;
  actionLabel: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
      <Button className="mt-4 w-full sm:w-auto" type="submit">
        {actionLabel}
      </Button>
    </Card>
  );
}

export function StudioTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm font-medium text-[var(--text)] placeholder:text-[var(--input-placeholder)] transition focus:border-[var(--brand-primary)] ${className}`}
      {...props}
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card className="grid min-h-40 place-items-center border-dashed p-6 text-center text-sm text-[var(--text-muted)]">
      {children}
    </Card>
  );
}

export function ItemCard({
  title,
  meta,
  children,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-display text-lg font-bold text-[var(--text)]">{title}</h3>
          {meta ? <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{children}</div> : null}
    </Card>
  );
}
