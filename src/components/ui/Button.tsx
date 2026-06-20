import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-hover)]",
  secondary:
    "border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]",
  ghost: "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  danger:
    "border border-transparent bg-[var(--button-danger-bg)] text-[var(--button-danger-text)] hover:bg-[var(--button-danger-hover)]",
};

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({ variant = "primary", icon, className = "", children, ...props }: ButtonProps) {
  return (
    <motion.button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold leading-none shadow-[var(--shadow-sm)] transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:shrink-0 ${variants[variant]} ${className}`}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.6 }}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}
