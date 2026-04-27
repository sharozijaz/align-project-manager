import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium text-[var(--text)] placeholder:text-[var(--input-placeholder)] transition focus:border-[var(--brand-primary)] ${className}`}
      {...props}
    />
  );
}
