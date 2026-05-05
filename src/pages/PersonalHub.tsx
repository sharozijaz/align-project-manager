import {
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Grid2X2,
  Plus,
  Save,
  Search,
  Star,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type ResourceFormState = {
  title: string;
  url: string;
  type: HubResourceType;
  collection: string;
  tags: string;
  notes: string;
};

const emptyResourceForm: ResourceFormState = {
  title: "",
  url: "",
  type: "inspiration",
  collection: "",
  tags: "",
  notes: "",
};

function normalizeResourceUrl(url?: string) {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return trimmed;
  }
}

function getResourceHost(url?: string) {
  const normalized = normalizeResourceUrl(url);
  if (!normalized) return "";
  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return normalized.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

function getResourceFavicon(url?: string) {
  const host = getResourceHost(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : undefined;
}

function getResourceInitials(title: string) {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return initials || "A";
}

export function PersonalHub() {
  const { resources, notes, importSeedResources, addResource, addNote, updateResource, updateNote, deleteResource, deleteNote } = useStudioStore();
  const [view, setView] = useState<HubView>("resources");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<HubResourceType | "all">("all");
  const [showForm, setShowForm] = useState<"resource" | "note" | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteForm, setEditNoteForm] = useState({ title: "", body: "", tags: "" });
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(emptyResourceForm);
  const [noteForm, setNoteForm] = useState({ title: "", body: "", tags: "" });

  useEffect(() => {
    importSeedResources();
  }, [importSeedResources]);

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
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0] ?? null;
  const selectedResource = selectedResourceId ? resources.find((resource) => resource.id === selectedResourceId) ?? null : null;

  useEffect(() => {
    if (view !== "notes") return;
    if (!selectedNoteId && filteredNotes[0]) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId, view]);

  useEffect(() => {
    if (selectedResourceId && !resources.some((resource) => resource.id === selectedResourceId)) {
      setSelectedResourceId(null);
      setEditingResourceId(null);
    }
  }, [resources, selectedResourceId]);

  const submitResource = (event: FormEvent) => {
    event.preventDefault();
    if (!resourceForm.title.trim()) return;
    const payload = {
      ...resourceForm,
      title: resourceForm.title.trim(),
      url: normalizeResourceUrl(resourceForm.url),
      collection: resourceForm.collection.trim() || undefined,
      tags: resourceForm.tags.trim() || undefined,
      notes: resourceForm.notes.trim() || undefined,
    };
    addResource(payload);
    setResourceForm(emptyResourceForm);
    setShowForm(null);
    setView("resources");
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (!noteForm.title.trim() || !noteForm.body.trim()) return;
    const nextNote = { ...noteForm, title: noteForm.title.trim(), body: noteForm.body.trim() };
    addNote(nextNote);
    setNoteForm({ title: "", body: "", tags: "" });
    setShowForm(null);
    setView("notes");
  };

  const startEditingNote = (note: HubNote) => {
    setEditingNoteId(note.id);
    setEditNoteForm({ title: note.title, body: note.body, tags: note.tags ?? "" });
  };

  const saveEditingNote = () => {
    if (!editingNoteId || !editNoteForm.title.trim() || !editNoteForm.body.trim()) return;
    updateNote(editingNoteId, {
      title: editNoteForm.title.trim(),
      body: editNoteForm.body.trim(),
      tags: editNoteForm.tags.trim() || undefined,
    });
    setEditingNoteId(null);
  };

  const startEditingResource = (resource: HubResource) => {
    setSelectedResourceId(resource.id);
    setEditingResourceId(resource.id);
    setResourceForm({
      title: resource.title,
      url: resource.url ?? "",
      type: resource.type,
      collection: resource.collection ?? "",
      tags: resource.tags ?? "",
      notes: resource.notes ?? "",
    });
    setShowForm(null);
    setView("resources");
  };

  const saveEditingResource = () => {
    if (!editingResourceId || !resourceForm.title.trim()) return;
    updateResource(editingResourceId, {
      title: resourceForm.title.trim(),
      url: normalizeResourceUrl(resourceForm.url),
      type: resourceForm.type,
      collection: resourceForm.collection.trim() || undefined,
      tags: resourceForm.tags.trim() || undefined,
      notes: resourceForm.notes.trim() || undefined,
    });
    setEditingResourceId(null);
    setResourceForm(emptyResourceForm);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Hub"
        description="A private resource and notes workspace for inspiration, tools, links, snippets, and working context."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<StickyNote size={16} />}
              onClick={() => {
                setShowForm("note");
                setView("notes");
              }}
            >
              New Note
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setShowForm("resource")}>
              Add Resource
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
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
              <SidebarButton
                active={view === "resources" && type === "all"}
                onClick={() => {
                  setView("resources");
                  setType("all");
                }}
                label="All Resources"
                count={resources.length}
              />
              {resourceTypes.map((item) => (
                <SidebarButton
                  key={item.value}
                  active={view === "resources" && type === item.value}
                  onClick={() => {
                    setView("resources");
                    setType(item.value);
                  }}
                  label={item.label}
                  count={resources.filter((resource) => resource.type === item.value).length}
                />
              ))}
              <SidebarButton active={view === "notes"} onClick={() => setView("notes")} label="Notes" count={notes.length} />
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
                <Button variant={view === "resources" ? "primary" : "secondary"} onClick={() => setView("resources")}>
                  Resources
                </Button>
                <Button variant={view === "notes" ? "primary" : "secondary"} onClick={() => setView("notes")}>
                  Notes
                </Button>
              </div>
            </div>
            {view === "resources" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <FilterChip active={type === "all"} onClick={() => setType("all")}>
                  All
                </FilterChip>
                {resourceTypes.map((item) => (
                  <FilterChip key={item.value} active={type === item.value} onClick={() => setType(item.value)}>
                    {item.label}
                  </FilterChip>
                ))}
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
                    {resourceTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Input value={resourceForm.collection} onChange={(event) => setResourceForm({ ...resourceForm, collection: event.target.value })} placeholder="Collection, e.g. SaaS landing pages" />
                  <Input value={resourceForm.tags} onChange={(event) => setResourceForm({ ...resourceForm, tags: event.target.value })} placeholder="Tags, comma separated" />
                </div>
                <StudioTextarea value={resourceForm.notes} onChange={(event) => setResourceForm({ ...resourceForm, notes: event.target.value })} placeholder="Why this is useful..." />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(null)}>
                    Cancel
                  </Button>
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
                <StudioTextarea className="min-h-48 font-mono" value={noteForm.body} onChange={(event) => setNoteForm({ ...noteForm, body: event.target.value })} placeholder={"Heading\n- Checklist item\nNotes, snippets, prompts, or decisions..."} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowForm(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Note</Button>
                </div>
              </form>
            </Card>
          ) : null}

          {view === "resources" ? (
            filteredResources.length ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredResources.map((item) => {
                  const isSelected = selectedResourceId === item.id;
                  const isEditing = editingResourceId === item.id;
                  return (
                    <div key={item.id} className="contents">
                      <ResourceCard
                        item={item}
                        selected={isSelected}
                        onSelect={() => {
                          setSelectedResourceId(isSelected ? null : item.id);
                          if (isSelected) setEditingResourceId(null);
                        }}
                        onEdit={() => startEditingResource(item)}
                        onDelete={() => {
                          deleteResource(item.id);
                          if (selectedResourceId === item.id) setSelectedResourceId(null);
                        }}
                        onToggleFavorite={() => updateResource(item.id, { favorite: !item.favorite })}
                      />
                      {isSelected ? (
                        <div className="md:col-span-2 2xl:col-span-3">
                          <ResourceDetailInline
                            item={selectedResource ?? item}
                            isEditing={isEditing}
                            form={resourceForm}
                            onFormChange={setResourceForm}
                            onStartEdit={() => startEditingResource(selectedResource ?? item)}
                            onCancelEdit={() => {
                              setEditingResourceId(null);
                              setResourceForm(emptyResourceForm);
                            }}
                            onSaveEdit={saveEditingResource}
                            onDelete={() => {
                              deleteResource(item.id);
                              setSelectedResourceId(null);
                            }}
                            onToggleFavorite={() => updateResource(item.id, { favorite: !item.favorite })}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState>No matching resources yet.</EmptyState>
            )
          ) : (
            <NotesWorkspace
              notes={filteredNotes}
              selectedNote={selectedNote}
              editingNoteId={editingNoteId}
              editNoteForm={editNoteForm}
              onSelectNote={(note) => setSelectedNoteId(note.id)}
              onStartEdit={startEditingNote}
              onCancelEdit={() => setEditingNoteId(null)}
              onSaveEdit={saveEditingNote}
              onEditFormChange={setEditNoteForm}
              onDelete={deleteNote}
              onToggleFavorite={(note) => updateNote(note.id, { favorite: !note.favorite })}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function NotesWorkspace({
  notes,
  selectedNote,
  editingNoteId,
  editNoteForm,
  onSelectNote,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onDelete,
  onToggleFavorite,
}: {
  notes: HubNote[];
  selectedNote: HubNote | null;
  editingNoteId: string | null;
  editNoteForm: { title: string; body: string; tags: string };
  onSelectNote: (note: HubNote) => void;
  onStartEdit: (note: HubNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditFormChange: (form: { title: string; body: string; tags: string }) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (note: HubNote) => void;
}) {
  if (!notes.length) return <EmptyState>No matching notes yet.</EmptyState>;

  const isEditing = selectedNote ? editingNoteId === selectedNote.id : false;

  return (
    <div className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Saved Notes</h2>
          <p className="text-sm text-[var(--text-muted)]">{notes.length} notes in your private workspace</p>
        </div>
        <div className="max-h-[720px] overflow-y-auto p-3">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelectNote(note)}
              className={`mb-2 block w-full rounded-[var(--radius-sm)] border p-4 text-left transition ${
                selectedNote?.id === note.id
                  ? "border-[var(--brand-primary)] bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--brand-primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-1 font-display text-base font-bold text-[var(--text)]">{note.title}</h3>
                <Star size={15} className={note.favorite ? "shrink-0 fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "shrink-0 text-[var(--text-soft)]"} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--text-muted)]">{note.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-soft)]">{format(new Date(note.updatedAt), "MMM d, yyyy")}</span>
                {note.tags
                  ?.split(",")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((tag) => (
                    <Badge key={tag.trim()}>{tag.trim()}</Badge>
                  ))}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="min-h-[620px] p-0">
        {selectedNote ? (
          <div className="flex h-full min-h-[620px] flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
                  <FileText size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Note</p>
                  <h2 className="font-display text-xl font-bold text-[var(--text)]">{selectedNote.title}</h2>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="secondary" icon={<X size={15} />} onClick={onCancelEdit}>
                      Cancel
                    </Button>
                    <Button icon={<Save size={15} />} onClick={onSaveEdit}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" icon={<Star size={15} />} onClick={() => onToggleFavorite(selectedNote)}>
                      {selectedNote.favorite ? "Favorited" : "Favorite"}
                    </Button>
                    <Button icon={<Edit3 size={15} />} onClick={() => onStartEdit(selectedNote)}>
                      Edit
                    </Button>
                    <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => onDelete(selectedNote.id)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="grid flex-1 gap-4 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <Input value={editNoteForm.title} onChange={(event) => onEditFormChange({ ...editNoteForm, title: event.target.value })} placeholder="Note title" />
                  <Input value={editNoteForm.tags} onChange={(event) => onEditFormChange({ ...editNoteForm, tags: event.target.value })} placeholder="Tags" />
                </div>
                <StudioTextarea
                  className="min-h-[480px] resize-y font-mono text-sm leading-7"
                  value={editNoteForm.body}
                  onChange={(event) => onEditFormChange({ ...editNoteForm, body: event.target.value })}
                  placeholder="Write the note..."
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-4xl">
                  <NoteReader body={selectedNote.body} />
                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-soft)]">
                    <span>Created {format(new Date(selectedNote.createdAt), "MMM d, yyyy")}</span>
                    <span>Updated {format(new Date(selectedNote.updatedAt), "MMM d, yyyy")}</span>
                    {selectedNote.tags
                      ?.split(",")
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag.trim()}>{tag.trim()}</Badge>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState>Select a note to read or edit it.</EmptyState>
        )}
      </Card>
    </div>
  );
}

function SidebarButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "align-gradient text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs opacity-80">{count}</span>
    </button>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-transparent align-gradient text-white" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}

function ResourceCard({
  item,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: HubResource;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const type = resourceTypes.find((entry) => entry.value === item.type) ?? resourceTypes[0];
  const host = getResourceHost(item.url);
  const favicon = getResourceFavicon(item.url);
  return (
    <Card className={`group overflow-hidden p-0 ${selected ? "border-[var(--brand-primary)]" : ""}`}>
      <button type="button" onClick={onSelect} className="block w-full p-4 text-left">
        <div className="mb-4 flex h-32 flex-col justify-between overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(132,103,255,0.32),transparent_42%),linear-gradient(135deg,var(--bg-soft),var(--surface-raised))] p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
              {favicon ? <img src={favicon} alt="" className="h-7 w-7" loading="lazy" /> : <span className="font-display text-sm font-bold text-[var(--brand-primary)]">{getResourceInitials(item.title)}</span>}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-soft)]">
              {host ? "Website" : "Saved item"}
            </span>
          </div>
          <div>
            <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{host || item.collection || type.label}</p>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--text-muted)]">{item.collection || item.tags || "Resource reference"}</p>
          </div>
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
          <Button variant="secondary" onClick={onEdit} icon={<Edit3 size={15} />} aria-label="Edit resource" />
          <Button variant="danger" onClick={onDelete} icon={<Trash2 size={15} />} aria-label="Delete resource" />
        </div>
      </div>
    </Card>
  );
}

function ResourceDetailInline({
  item,
  isEditing,
  form,
  onFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleFavorite,
}: {
  item: HubResource;
  isEditing: boolean;
  form: ResourceFormState;
  onFormChange: (form: ResourceFormState) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  if (isEditing) {
    return (
      <Card className="border-[var(--brand-primary)] bg-[var(--surface-raised)] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Editing resource</p>
            <h2 className="font-display text-xl font-bold text-[var(--text)]">{item.title}</h2>
          </div>
          <Button variant="ghost" icon={<X size={16} />} onClick={onCancelEdit} aria-label="Cancel editing" />
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
            <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} placeholder="Resource title" />
            <Input value={form.url} onChange={(event) => onFormChange({ ...form, url: event.target.value })} placeholder="https://..." />
            <Select value={form.type} onChange={(event) => onFormChange({ ...form, type: event.target.value as HubResourceType })}>
              {resourceTypes.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Input value={form.collection} onChange={(event) => onFormChange({ ...form, collection: event.target.value })} placeholder="Collection" />
            <Input value={form.tags} onChange={(event) => onFormChange({ ...form, tags: event.target.value })} placeholder="Tags, comma separated" />
          </div>
          <StudioTextarea value={form.notes} onChange={(event) => onFormChange({ ...form, notes: event.target.value })} placeholder="Why this is useful..." />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button type="button" icon={<Save size={15} />} onClick={onSaveEdit}>
              Save Resource
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const host = getResourceHost(item.url);
  const favicon = getResourceFavicon(item.url);
  return (
    <Card className="overflow-hidden border-[var(--brand-primary)] bg-[var(--surface-raised)] p-0">
      <div className="grid gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex min-h-48 flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(132,103,255,0.38),transparent_42%),linear-gradient(135deg,var(--bg-soft),var(--surface))] p-5">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            {favicon ? <img src={favicon} alt="" className="h-10 w-10" loading="lazy" /> : <span className="font-display text-lg font-bold text-[var(--brand-primary)]">{getResourceInitials(item.title)}</span>}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{host || "Saved resource"}</p>
            {item.url ? <p className="mt-1 break-all text-sm text-[var(--text-muted)]">{item.url}</p> : <p className="mt-1 text-sm text-[var(--text-muted)]">Add a URL when you edit this resource.</p>}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Resource details</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[var(--text)]">{item.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Star size={15} />} onClick={onToggleFavorite}>
                {item.favorite ? "Favorited" : "Favorite"}
              </Button>
              <Button variant="secondary" icon={<Edit3 size={15} />} onClick={onStartEdit}>
                Edit
              </Button>
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--text-muted)]">{item.notes || "No notes yet. Add context, why this is useful, login hints, or when you reach for it."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone={(resourceTypes.find((entry) => entry.value === item.type) ?? resourceTypes[0]).tone}>{(resourceTypes.find((entry) => entry.value === item.type) ?? resourceTypes[0]).label}</Badge>
            {item.collection ? <Badge>{item.collection}</Badge> : null}
            {item.tags
              ?.split(",")
              .filter(Boolean)
              .map((tag) => (
                <Badge key={tag.trim()}>{tag.trim()}</Badge>
              ))}
          </div>
          {item.url ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(item.url!)} icon={<Copy size={15} />}>
                Copy Link
              </Button>
              <Button onClick={() => window.open(normalizeResourceUrl(item.url), "_blank", "noopener,noreferrer")} icon={<ExternalLink size={15} />}>
                Open Website
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function NoteReader({ body }: { body: string }) {
  const lines = body.split("\n");

  return (
    <article className="space-y-3 text-base leading-8 text-[var(--text-muted)]">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={index} className="h-2" />;
        if (line.startsWith("# ")) {
          return (
            <h2 key={index} className="pt-2 font-display text-2xl font-bold leading-tight text-[var(--text)]">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={index} className="pt-2 font-display text-xl font-bold leading-tight text-[var(--text)]">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={index} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2">
              {line.slice(2)}
            </p>
          );
        }
        return <p key={index}>{line}</p>;
      })}
    </article>
  );
}
