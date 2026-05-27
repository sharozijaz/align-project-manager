import { Copy, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConfirm } from "../ui/ConfirmProvider";
import { ThemedPortal } from "../ui/ThemedPortal";
import type { Task } from "../../types/task";

export function TaskOverflowMenu({
  task,
  onOpen,
  onDelete,
}: {
  task: Task;
  onOpen?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const confirm = useConfirm();

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return false;
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)),
    });
    return true;
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const copyTask = async () => {
    setOpen(false);
    try {
      await navigator.clipboard?.writeText(`${task.title}\n${task.id}`);
    } catch {
      // Clipboard permissions vary in desktop/web contexts; failing silently keeps the menu lightweight.
    }
  };

  const deleteTask = async () => {
    setOpen(false);
    if (!onDelete) return;
    const confirmed = await confirm({
      title: "Delete task?",
      description: `"${task.title}" will move out of the active task view.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (confirmed) onDelete(task.id);
  };

  const menu = open ? (
    <div
      ref={menuRef}
      className="fixed z-[1000] w-48 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-md)]"
      style={{ top: position.top, left: position.left }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <MenuButton
        icon={<ExternalLink size={15} />}
        label="Open task"
        onClick={() => {
          setOpen(false);
          onOpen?.(task);
        }}
      />
      <MenuButton icon={<Copy size={15} />} label="Copy title / ID" onClick={() => void copyTask()} />
      {onDelete ? <div className="my-1 h-px bg-[var(--border)]" /> : null}
      {onDelete ? <MenuButton danger icon={<Trash2 size={15} />} label="Delete" onClick={() => void deleteTask()} /> : null}
    </div>
  ) : null;

  return (
    <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        className="grid min-h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)] hover:text-[var(--text)]"
        aria-label={`Task actions for ${task.title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => {
            if (current) return false;
            return updatePosition();
          });
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {menu ? <ThemedPortal>{menu}</ThemedPortal> : null}
    </div>
  );
}

function MenuButton({ icon, label, danger = false, onClick }: { icon: ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-bold transition hover:bg-[var(--surface-hover)] ${
        danger ? "text-[var(--priority-high-text)]" : "text-[var(--text)]"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {icon}
      {label}
    </button>
  );
}
