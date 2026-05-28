import { MailPlus, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AssigneeOption } from "../../types/assignee";
import { Input } from "../ui/Input";
import { ThemedPortal } from "../ui/ThemedPortal";

type PickerSize = "compact" | "normal";

export function TaskAssigneePicker({
  value,
  options,
  disabled,
  size = "normal",
  onChange,
}: {
  value: string;
  options: AssigneeOption[];
  disabled?: boolean;
  size?: PickerSize;
  onChange: (option: AssigneeOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 280 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => normalizeEmail(option.email) === normalizeEmail(value));
  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return options.filter((option) => `${option.label} ${option.email}`.toLowerCase().includes(search));
  }, [options, query]);

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return false;
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
      width: Math.max(rect.width, 280),
    });
    return true;
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const menu = open ? (
    <div
      ref={menuRef}
      className="fixed z-[1000] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-md)]"
      style={{ top: position.top, left: position.left, width: position.width }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <label className="relative block">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
        <Input autoFocus value={query} placeholder="Search or enter email..." onChange={(event) => setQuery(event.target.value)} className="pl-9" />
      </label>
      <div className="mt-3 space-y-1">
        <p className="px-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">Assignees</p>
        <AssigneeOptionButton
          label="Unassigned"
          muted
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        />
        {filteredOptions.map((option) => (
          <AssigneeOptionButton
            key={`${option.email}-${option.userId ?? "email"}`}
            label={option.label}
            detail={option.email}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
          />
        ))}
        {!filteredOptions.length ? (
          <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] px-3 py-4 text-center text-sm text-[var(--text-muted)]">
            No matching collaborator.
          </p>
        ) : null}
      </div>
      <div className="mt-2 border-t border-[var(--border)] pt-2">
        <button type="button" className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm font-bold text-[var(--text-muted)]" disabled>
          <MailPlus size={16} />
          Invite people by email
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-left font-bold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus:border-[var(--brand-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 ${
          size === "compact" ? "min-h-9 text-sm" : "min-h-11 text-sm"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => {
            if (current) return false;
            return updatePosition();
          });
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-raised)] text-xs font-black text-[var(--text-muted)]">
            {selected ? initials(selected.label || selected.email) : <UserRound size={15} />}
          </span>
          <span className="min-w-0 truncate">{selected?.label ?? (value || "Unassigned")}</span>
        </span>
        <span className="text-[var(--text-soft)]">⌄</span>
      </button>
      {menu ? <ThemedPortal>{menu}</ThemedPortal> : null}
    </>
  );
}

function AssigneeOptionButton({ label, detail, muted = false, onClick }: { label: string; detail?: string; muted?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm font-bold text-[var(--text)] transition hover:bg-[var(--surface-hover)]" onClick={onClick}>
      <span className={`grid size-7 place-items-center rounded-full ${muted ? "border border-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--brand-primary)] text-white"} text-xs font-black`}>
        {muted ? <UserRound size={15} /> : initials(label)}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {detail ? <span className="block truncate text-xs font-semibold text-[var(--text-muted)]">{detail}</span> : null}
      </span>
    </button>
  );
}

function normalizeEmail(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
