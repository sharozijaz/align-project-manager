import { ExternalLink, Eye, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { ProjectNote } from "../../types/project";

interface ProjectNotesProps {
  notes: ProjectNote[];
  onChange: (notes: ProjectNote[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function ProjectNotes({ notes, onChange }: ProjectNotesProps) {
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    url: "",
    visibility: "private" as ProjectNote["visibility"],
  });

  const addNote = () => {
    if (!draft.title.trim() && !draft.content.trim() && !draft.url.trim()) return;

    const now = stamp();
    onChange([
      {
        id: id(),
        title: draft.title.trim() || "Project note",
        content: draft.content.trim(),
        url: draft.url.trim() || undefined,
        visibility: draft.visibility,
        createdAt: now,
        updatedAt: now,
      },
      ...notes,
    ]);
    setDraft({ title: "", content: "", url: "", visibility: "private" });
  };

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
            <LockKeyhole size={17} />
            Project Notes
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Keep Figma links, access details, and handoff notes here. Private notes never appear on public share links.
          </p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {notes.length} saved
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 lg:grid-cols-[1fr_1fr_170px_auto]">
        <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Label, e.g. Figma file or Staging login" />
        <Input value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="Optional link" />
        <Select value={draft.visibility} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as ProjectNote["visibility"] }))}>
          <option value="private">Private</option>
          <option value="client">Client-visible</option>
        </Select>
        <Button type="button" icon={<Plus size={16} />} onClick={addNote}>
          Add Note
        </Button>
        <textarea
          className="min-h-24 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-3 text-sm font-medium text-[var(--text)] outline-none transition placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-focus-border)] focus:ring-2 focus:ring-[var(--input-focus-ring)] lg:col-span-4"
          value={draft.content}
          onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          placeholder="Details, notes, login instructions, next steps..."
        />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words font-bold text-[var(--text)]">{note.title}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${note.visibility === "client" ? "bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]" : "bg-[var(--bg-muted)] text-[var(--text-muted)]"}`}>
                    {note.visibility === "client" ? <Eye size={12} /> : <LockKeyhole size={12} />}
                    {note.visibility === "client" ? "Client-visible" : "Private"}
                  </span>
                </div>
                {note.url ? (
                  <a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-[var(--text-brand)] hover:underline" href={note.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} />
                    <span className="truncate">{note.url}</span>
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] border border-transparent bg-[var(--button-danger-bg)] p-2 text-[var(--button-danger-text)] transition hover:bg-[var(--button-danger-hover)]"
                aria-label={`Delete ${note.title}`}
                onClick={() => {
                  if (window.confirm(`Delete "${note.title}"?`)) onChange(notes.filter((item) => item.id !== note.id));
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            {note.content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.content}</p> : null}
          </article>
        ))}
        {!notes.length ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-8 text-center text-sm text-[var(--text-muted)] xl:col-span-2">
            No notes saved yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}
