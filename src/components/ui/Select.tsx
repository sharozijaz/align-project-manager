import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-10 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium text-[var(--text)] transition focus:border-[var(--brand-primary)] sm:min-h-11 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
