import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Card } from "../ui/Card";

export const StudioTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function StudioTextarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={`min-h-28 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm font-medium text-[var(--text)] placeholder:text-[var(--input-placeholder)] transition focus:border-[var(--brand-primary)] ${className}`}
      {...props}
    />
  );
});

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card className="grid min-h-40 place-items-center border-dashed p-6 text-center text-sm text-[var(--text-muted)]">
      {children}
    </Card>
  );
}
