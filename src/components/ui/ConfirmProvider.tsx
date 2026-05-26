import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmTone = "default" | "danger";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type ConfirmRequest = Required<Pick<ConfirmOptions, "title" | "confirmLabel" | "cancelLabel" | "tone">> &
  Pick<ConfirmOptions, "description">;

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest({
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          tone: options.tone ?? "default",
        });
      }),
    [],
  );

  const icon = request?.tone === "danger" ? <Trash2 size={20} /> : <Info size={20} />;
  const accentClass =
    request?.tone === "danger"
      ? "bg-[var(--button-danger-bg)] text-[var(--button-danger-text)]"
      : "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]";

  const contextValue = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <Modal title={request?.title ?? "Confirm action"} open={Boolean(request)} onClose={() => close(false)} className="max-w-lg">
        {request ? (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] ${accentClass}`}>
                  {icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text)]">{request.title}</p>
                  {request.description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{request.description}</p> : null}
                </div>
              </div>
            </div>
            {request.tone === "danger" ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--priority-high-border)] bg-[var(--priority-high-bg)] p-3 text-sm font-semibold text-[var(--priority-high-text)]">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                This action can affect saved workspace data. Make sure this is the item you intended to change.
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {request.cancelLabel}
              </Button>
              <Button type="button" variant={request.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>
                {request.confirmLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}
