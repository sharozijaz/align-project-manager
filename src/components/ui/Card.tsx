import { motion, type HTMLMotionProps } from "motion/react";

export function Card({ className = "", ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={`rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-[border-color,background-color,box-shadow,transform] duration-150 ${className}`}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
      {...props}
    />
  );
}
