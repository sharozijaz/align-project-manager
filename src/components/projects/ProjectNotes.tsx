import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Link2,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ProjectNote, ProjectNoteVisibility } from "../../types/project";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface ProjectNotesProps {
  notes: ProjectNote[];
  onChange: (notes: ProjectNote[]) => void;
}

type VisibilityFilter = "all" | ProjectNoteVisibility;

const emptyDraft = {
  title: "",
  content: "",
  url: "",
  visibility: "private" as ProjectNoteVisibility,
};

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function ProjectNotes({ notes, onChange }: ProjectNotesProps) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [copiedId, setCopiedId] = useState("");

  const privateCount = notes.filter((note) => note.visibility !== "client").length;
  const clientCount = notes.filter((note) => note.visibility === "client").length;
  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notes
      .filter((note) => visibilityFilter === "all" || note.visibility === visibilityFilter)
      .filter((note) => {
        if (!normalizedQuery) return true;
        return `${note.title} ${note.content} ${note.url ?? ""}`.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query, visibilityFilter]);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const saveNote = () => {
    if (!draft.title.trim() && !draft.content.trim() && !draft.url.trim()) return;

    const now = stamp();
    const nextNote: ProjectNote = {
      id: editingId ?? id(),
      title: draft.title.trim() || "Project note",
      content: draft.content.trim(),
      url: draft.url.trim() || undefined,
      visibility: draft.visibility,
      createdAt: notes.find((note) => note.id === editingId)?.createdAt ?? now,
      updatedAt: now,
    };

    onChange(editingId ? notes.map((note) => (note.id === editingId ? nextNote : note)) : [nextNote, ...notes]);
    resetDraft();
  };

  const editNote = (note: ProjectNote) => {
    setEditingId(note.id);
    setDraft({
      title: note.title,
      content: note.content,
      url: note.url ?? "",
      visibility: note.visibility,
    });
  };

  const copyNoteUrl = async (note: ProjectNote) => {
    if (!note.url) return;
    await navigator.clipboard.writeText(note.url);
    setCopiedId(note.id);
    window.setTimeout(() => setCopiedId(""), 1800);
  };

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-raised),var(--bg-soft))] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--brand-primary)]">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text)]">Project Notes</h2>
              <span className="rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                {notes.length} saved
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              Keep Figma links, staging access, handoff notes, and project context here. Private notes stay hidden from public share links.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[var(--text-muted)]">
            <LockKeyhole size={13} />
            {privateCount} private
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-completed-bg)] px-3 py-1 text-[var(--status-completed-text)]">
            <Eye size={13} />
            {clientCount} client-visible
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(360px,0.92fr)_minmax(440px,1.08fr)]">
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                {editingId ? "Edit Note" : "New Note"}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {editingId ? "Update this project note." : "Add a resource, login note, or client handoff detail."}
              </p>
            </div>
            <VisibilityToggle value={draft.visibility} onChange={(visibility) => setDraft((current) => ({ ...current, visibility }))} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Label
              <Input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Figma file or staging login"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Optional link
              <div className="relative">
                <Link2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
                <Input
                  className="pl-9"
                  value={draft.url}
                  onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)] sm:col-span-2">
              Details
              <textarea
                className="min-h-56 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm font-medium leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-focus-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)]"
                value={draft.content}
                onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="Add context, credentials, notes, instructions, next steps..."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Info size={15} />
              {draft.visibility === "client" ? "This note can appear on shared client links." : "Private notes are only visible in your workspace."}
            </p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {editingId ? (
                <Button type="button" variant="secondary" icon={<X size={16} />} onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
              <Button type="button" icon={editingId ? <Save size={16} /> : <Plus size={16} />} onClick={saveNote}>
                {editingId ? "Save Note" : "Add Note"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-bold text-[var(--text)]">Saved Notes</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Search and manage reusable project context.</p>
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
              <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." />
            </label>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <FilterButton active={visibilityFilter === "all"} onClick={() => setVisibilityFilter("all")}>
              All
            </FilterButton>
            <FilterButton active={visibilityFilter === "private"} onClick={() => setVisibilityFilter("private")} icon={<LockKeyhole size={14} />}>
              Private
            </FilterButton>
            <FilterButton active={visibilityFilter === "client"} onClick={() => setVisibilityFilter("client")} icon={<Eye size={14} />}>
              Client-visible
            </FilterButton>
          </div>

          <motion.div className="space-y-3" layout>
            <AnimatePresence initial={false}>
              {visibleNotes.map((note) => (
                <motion.article
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words text-base font-bold text-[var(--text)]">{note.title}</h4>
                        <VisibilityBadge visibility={note.visibility} />
                      </div>
                      {note.url ? (
                        <a
                          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-2 text-sm font-semibold text-[var(--text-brand)] hover:border-[var(--border-strong)]"
                          href={note.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={14} />
                          <span className="truncate">{note.url}</span>
                        </a>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {note.url ? (
                        <IconButton label={`Copy link for ${note.title}`} onClick={() => void copyNoteUrl(note)}>
                          {copiedId === note.id ? <Check size={16} /> : <Copy size={16} />}
                        </IconButton>
                      ) : null}
                      <IconButton label={`Edit ${note.title}`} onClick={() => editNote(note)}>
                        <Edit3 size={16} />
                      </IconButton>
                      <IconButton
                        danger
                        label={`Delete ${note.title}`}
                        onClick={() => {
                          if (window.confirm(`Delete "${note.title}"?`)) onChange(notes.filter((item) => item.id !== note.id));
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                  {note.content ? <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.content}</p> : null}
                  <div className="mt-4 border-t border-[var(--border)] pt-3 text-xs font-semibold text-[var(--text-soft)]">
                    Updated {dateLabel(note.updatedAt.slice(0, 10))}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {!visibleNotes.length ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
              {notes.length ? "No notes match your current filters." : "No notes saved yet."}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function VisibilityToggle({
  value,
  onChange,
}: {
  value: ProjectNoteVisibility;
  onChange: (visibility: ProjectNoteVisibility) => void;
}) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] p-1">
      {[
        { value: "private" as const, label: "Private", icon: <LockKeyhole size={14} /> },
        { value: "client" as const, label: "Client-visible", icon: <Eye size={14} /> },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[calc(var(--radius-sm)-2px)] px-3 text-sm font-bold transition ${
            value === option.value
              ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-[var(--shadow-sm)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: ProjectNoteVisibility }) {
  const isClient = visibility === "client";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
        isClient
          ? "bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]"
          : "bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent-text)]"
      }`}
    >
      {isClient ? <Eye size={12} /> : <LockKeyhole size={12} />}
      {isClient ? "Client-visible" : "Private"}
    </span>
  );
}

function FilterButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-sm)] border px-3 text-sm font-bold transition ${
        active
          ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
          : "border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border transition ${
        danger
          ? "border-transparent bg-[var(--button-danger-bg)] text-[var(--button-danger-text)] hover:bg-[var(--button-danger-hover)]"
          : "border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
      }`}
    >
      {children}
    </button>
  );
}
