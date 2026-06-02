import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  description?: string;
}

export function Modal({ title, open, onClose, children, className = "", description }: ModalProps) {
  const theme = useThemeStore((state) => state.theme);
  const accentColor = useThemeStore((state) => state.accentColor);
  const titleId = useId();
  const descriptionId = useId();

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <motion.section
            className={`max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--shadow-lg)] ${className}`}
            onPointerDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-start justify-between gap-4 rounded-t-[var(--radius-lg)] border-b border-[var(--border)] bg-[var(--panel-inset)] px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-black text-[var(--text)]">{title}</h2>
                {description ? <p id={descriptionId} className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)]">{description}</p> : null}
              </div>
              <Button aria-label="Close" type="button" variant="ghost" className="min-h-9 px-2" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
            <div className="min-w-0 max-h-[calc(100vh-7.5rem)] overflow-y-auto p-5">{children}</div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return modal;

  return createPortal(<div data-theme={theme} data-accent={accentColor}>{modal}</div>, document.body);
}
