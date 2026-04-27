import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 text-[var(--text)] shadow-[var(--shadow-md)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>
          <Button aria-label="Close" type="button" variant="ghost" className="px-2" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
