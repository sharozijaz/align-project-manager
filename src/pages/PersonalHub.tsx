import { Copy, ExternalLink, FileText, Grid2X2, Link2, Plus, Search, Star, StickyNote, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";
import type { HubNote, HubResource, HubResourceType, HubView } from "../types/studio";

const resourceTypes: Array<{ value: HubResourceType; label: string; tone: "blue" | "amber" | "emerald" | "purple" | "slate" }> = [
  { value: "inspiration", label: "Inspiration", tone: "purple" },
  { value: "tools", label: "Tools", tone: "amber" },
  { value: "assets", label: "Assets", tone: "emerald" },
  { value: "learning", label: "Learning", tone: "blue" },
  { value: "snippets", label: "Snippets", tone: "slate" },
];

type DetailItem = { kind: "resource"; item: HubResource } | { kind: "note"; item: HubNote } | null;

export function PersonalHub() {
  const { resources, notes, addResource, addNote, updateResource, updateNote, deleteResource, deleteNote } = useStudioStore();
  const [view, setView] = useState<HubView>("resources");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<HubResourceType | "all">("all");
  const [showForm, setShowForm] = useState<"resource" | "note" | null>(null);
  const [selected, setSelected] = useState<DetailItem>(null);
  const [resourceForm, setResourceForm] = useState({ title: "", url: "", type: "inspiration" as HubResourceType, collection: "", tags: "", notes: "" });
  const [noteForm, setNoteForm] = useState({ title: "", body: "", tags: "" });

  const filteredResources = useMemo(
    () =>
      resources.filter((item) => {
        const haystack = `${item.title} ${item.url ?? ""} ${item.collection ?? ""} ${item.tags ?? ""} ${item.notes ?? ""}`.toLowerCase();
        return (type === "all" || item.type === type) && haystack.includes(query.toLowerCase());
      }),
    [query, resources, type],
  );
  const filteredNotes = useMemo(
    () => notes.filter((note) => `${note.title} ${note.tags ?? ""} ${note.body}`.toLowerCase().includes(query.toLowerCase())),
    [notes, query],
  );
  const collections = useMemo(() => Array.from(new Set(resources.map((item) => item.collection).filter(Boolean))) as string[], [resources]);

  const submitResource = (event: FormEvent) => {
    event.preventDefault();
    if (!resourceForm.title.trim()) return;
    const payload = { ...resourceForm, title: resourceForm.title.trim(), url: resourceForm.url.trim() || undefined };
    addResource(payload);
    setResourceForm({ title: "", url: "", type: "inspiration", collection: "", tags: "", notes: "" });
    setShowForm(null);
    setView("resources");
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!noteForm.title.trim() || !noteForm.body.trim()) return;
    addNote({ ...noteForm, title: noteForm.title.trim(), body: noteForm.body.trim() });
    setNoteForm({ title: "", body: "", tags: "" });
    setShowForm(null);
    setView("notes");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Hub"
        description="A private resource and notes workspace for inspiration, tools, links, snippets, and working context."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<StickyNote size={16} />} onClick={() => setShowForm("note")}>New Note</Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowForm("resource")}>Add Resource</Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] align-gradient text-white">
                <Grid2X2 size={18} />
              </span>
              <div>
                <h2 className="font-display font-bold text-[var(--text)]">Align Resources</h2>
                <p className="text-xs text-[var(--text-muted)]">Designer resource hub</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <SidebarButton active={view === "resources" && type === "all"} onClick={() => { setView("resources"); setType("all"); }} label="All Resources" count={resources.length} />
              {resourceTypes.map((item) => (
                <SidebarButton key={item.value} active={view === "resources" && type === item.value} onClick={() => { setView("resources"); setType(item.value); }} label={item.label} count={resources.filter((resource) => resource.type === item.value).length} />
              ))}
              <SidebarButton active={view === "notes"} onClick={() => setView("notes")} label="Markdown Notes" count={notes.length} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Collections</h3>
            <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              {collections.length ? collections.map((collection) => <p key={collection}>{collection}</p>) : <p>No collections yet.</p>}
            </div>
          </Card>
        </aside>

        <main className="min-w-0 space-y-4">
          <Card className="p-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={17} />
                <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources, notes, tags, collections..." />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant={view === "resources" ? "primary" : "secondary"} onClick={() => setView("resources")}>Resources</Button>
                <Button variant={view === "notes" ? "primary" : "secondary"} onClick={() => setView("notes")}>Notes</Button>
              </div>
            </div>
            {view === "resources" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <FilterChip active={type === "all"} onClick={() => setType("all")}>All</FilterChip>
                {resourceTypes.map((item) => <FilterChip key={item.value} active={type === item.value} onClick={() => setType(item.value)}>{item.label}</FilterChip>)}
              </div>
            ) : null}
          </Card>

          {showForm === "resource" ? (
            <Card className="p-4">
              <form onSubmit={submitResource} className="grid gap-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
                  <Input value={resourceForm.title} onChange={(event) => setResourceForm({ ...resourceForm, title: event.target.value })} placeholder="Resource title" />
                  <Input value={resourceForm.url} onChange={(event) => setResourceForm({ ...resourceForm, url: event.target.value })} placeholder="https://..." />
                  <Select value={resourceForm.type} onChange={(event) => setResourceForm({ ...resourceForm, type: event.target.value as HubResourceType })}>
                    {resourceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </Select>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Input value={resourceForm.collection} onChange={(event) => setResourceForm({ ...resourceForm, collection: event.target.value })} placeholder="Collection, e.g. SaaS landing pages" />
                  <Input value={resourceForm.tags} onChange={(event) => setResourceForm({ ...resourceForm, tags: event.target.value })} placeholder="Tags, comma separated" />
                </div>
                <StudioTextarea value={resourceForm.notes} onChange={(event) => setResourceForm({ ...resourceForm, notes: event.target.value })} placeholder="Why this is useful..." />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(null)}>Cancel</Button>
                  <Button type="submit">Save Resource</Button>
                </div>
              </form>
            </Card>
          ) : null}

          {showForm === "note" ? (
            <Card className="p-4">
              <form onSubmit={submitNote} className="grid gap-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <Input value={noteForm.title} onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                  <Input value={noteForm.tags} onChange={(event) => setNoteForm({ ...noteForm, tags: event.target.value })} placeholder="Tags" />
                </div>
                <StudioTextarea className="min-h-48 font-mono" value={noteForm.body} onChange={(event) => setNoteForm({ ...noteForm, body: event.target.value })} placeholder={"# Heading\n- Checklist item\nNotes, snippets, prompts, or decisions..."} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(null)}>Cancel</Button>
                  <Button type="submit">Save Note</Button>
                </div>
              </form>
            </Card>
          ) : null}

          {view === "resources" ? (
            filteredResources.length ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredResources.map((item) => <ResourceCard key={item.id} item={item} selected={selected?.kind === "resource" && selected.item.id === item.id} onSelect={() => setSelected({ kind: "resource", item })} onDelete={() => deleteResource(item.id)} onToggleFavorite={() => updateResource(item.id, { favorite: !item.favorite })} />)}
              </div>
            ) : (
              <EmptyState>No matching resources yet.</EmptyState>
            )
          ) : filteredNotes.length ? (
            <div className="grid gap-4">
              {filteredNotes.map((note) => <NoteCard key={note.id} note={note} selected={selected?.kind === "note" && selected.item.id === note.id} onSelect={() => setSelected({ kind: "note", item: note })} onDelete={() => deleteNote(note.id)} onToggleFavorite={() => updateNote(note.id, { favorite: !note.favorite })} />)}
            </div>
          ) : (
            <EmptyState>No matching notes yet.</EmptyState>
          )}
        </main>

        <DetailPanel selected={selected} />
      </div>
    </div>
  );
}

function SidebarButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold transition ${active ? "align-gradient text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"}`}>
      <span>{label}</span>
      <span className="text-xs opacity-80">{count}</span>
    </button>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-transparent align-gradient text-white" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"}`}>{children}</button>;
}

function ResourceCard({ item, selected, onSelect, onDelete, onToggleFavorite }: { item: HubResource; selected: boolean; onSelect: () => void; onDelete: () => void; onToggleFavorite: () => void }) {
  const type = resourceTypes.find((entry) => entry.value === item.type) ?? resourceTypes[0];
  return (
    <Card className={`group overflow-hidden p-0 ${selected ? "border-[var(--brand-primary)]" : ""}`}>
      <button type="button" onClick={onSelect} className="block w-full p-4 text-left">
        <div className="mb-4 grid h-28 place-items-center rounded-[var(--radius-sm)] bg-[radial-gradient(circle_at_top_left,var(--brand-primary),transparent_35%),var(--bg-soft)] text-sm font-semibold text-[var(--text-muted)]">
          {item.url ? new URL(item.url, window.location.origin).hostname.replace("www.", "") : "Resource"}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-display text-lg font-bold text-[var(--text)]">{item.title}</h3>
          <Star size={16} className={item.favorite ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-[var(--text-soft)]"} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{item.notes || item.url || "No notes yet."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={type.tone}>{type.label}</Badge>
          {item.collection ? <Badge>{item.collection}</Badge> : null}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
        <span className="text-xs text-[var(--text-soft)]">{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onToggleFavorite} icon={<Star size={15} />} aria-label="Favorite resource" />
          <Button variant="danger" onClick={onDelete} icon={<Trash2 size={15} />} aria-label="Delete resource" />
        </div>
      </div>
    </Card>
  );
}

function NoteCard({ note, selected, onSelect, onDelete, onToggleFavorite }: { note: HubNote; selected: boolean; onSelect: () => void; onDelete: () => void; onToggleFavorite: () => void }) {
  return (
    <Card className={`p-4 ${selected ? "border-[var(--brand-primary)]" : ""}`}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[var(--text)]">{note.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{note.body}</p>
          </div>
          <Star size={16} className={note.favorite ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-[var(--text-soft)]"} />
        </div>
      </button>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className="text-xs text-[var(--text-soft)]">{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onToggleFavorite} icon={<Star size={15} />} aria-label="Favorite note" />
          <Button variant="danger" onClick={onDelete} icon={<Trash2 size={15} />} aria-label="Delete note" />
        </div>
      </div>
    </Card>
  );
}

function DetailPanel({ selected }: { selected: DetailItem }) {
  if (!selected) {
    return (
      <Card className="p-5 xl:sticky xl:top-4 xl:self-start">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">Select an item</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Pick a resource or note to preview details, copy links, and review context.</p>
      </Card>
    );
  }

  if (selected.kind === "resource") {
    const item = selected.item;
    return (
      <Card className="p-5 xl:sticky xl:top-4 xl:self-start">
        <div className="grid h-36 place-items-center rounded-[var(--radius-sm)] bg-[radial-gradient(circle_at_top_left,var(--brand-primary),transparent_35%),var(--bg-soft)] text-[var(--text-muted)]">
          <Link2 size={24} />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold text-[var(--text)]">{item.title}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{item.notes || "No notes yet."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags?.split(",").filter(Boolean).map((tag) => <Badge key={tag.trim()}>{tag.trim()}</Badge>)}
        </div>
        {item.url ? (
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(item.url!)} icon={<Copy size={15} />}>Copy</Button>
            <Button onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")} icon={<ExternalLink size={15} />}>Open</Button>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="p-5 xl:sticky xl:top-4 xl:self-start">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
          <FileText size={18} />
        </span>
        <h2 className="font-display text-xl font-bold text-[var(--text)]">{selected.item.title}</h2>
      </div>
      <div className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4">
        <MarkdownPreview body={selected.item.body} />
      </div>
    </Card>
  );
}

function MarkdownPreview({ body }: { body: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-[var(--text-muted)]">
      {body.split("\n").map((line, index) => {
        if (line.startsWith("# ")) return <h3 key={index} className="font-display text-lg font-bold text-[var(--text)]">{line.replace("# ", "")}</h3>;
        if (line.startsWith("## ")) return <h4 key={index} className="font-display font-bold text-[var(--text)]">{line.replace("## ", "")}</h4>;
        if (line.startsWith("- ")) return <p key={index} className="pl-3">• {line.replace("- ", "")}</p>;
        return <p key={index}>{line || "\u00A0"}</p>;
      })}
    </div>
  );
}
