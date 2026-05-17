import {
  CheckSquare,
  Code2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Heading1,
  Heading2,
  Link,
  List,
  Minus,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, StudioTextarea } from "../components/studio/StudioForm";
import { useProjectStore } from "../store/projectStore";
import { useStudioStore } from "../store/studioStore";
import type { Project } from "../types/project";
import type { HubNote, HubResource, HubResourceType, HubView } from "../types/studio";
import {
  downloadTextFile,
  exportHubNotesJson,
  exportHubNotesMarkdown,
  mergeImportedHubNotes,
  parseHubNotesImport,
} from "../utils/hubNotesImportExport";

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

type ResourceFilter = HubResourceType | "all" | "favorites";
type NoteFormState = {
  title: string;
  body: string;
  tags: string;
  projectIds: string[];
};

const emptyResourceForm: ResourceFormState = {
  title: "",
  url: "",
  type: "inspiration",
  collection: "",
  tags: "",
  notes: "",
};

const emptyNoteForm: NoteFormState = {
  title: "",
  body: "",
  tags: "",
  projectIds: [],
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

function slugifyFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "untitled-note"
  );
}

function ExportMenuButton({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--dropdown-hover)]"
    >
      {title}
      <span className="mt-1 block truncate text-xs font-normal text-[var(--text-soft)]">{description}</span>
    </button>
  );
}

export function PersonalHub({ initialView = "resources" }: { initialView?: HubView }) {
  const { resources, notes, importSeedResources, addResource, addNote, updateResource, updateNote, deleteResource, deleteNote, replaceNotes } = useStudioStore();
  const projects = useProjectStore((state) => state.projects);
  const [view, setView] = useState<HubView>(initialView);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceFilter>("all");
  const [showForm, setShowForm] = useState<"resource" | "note" | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteForm, setEditNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(emptyResourceForm);
  const [noteForm, setNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [importMessage, setImportMessage] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [notePreviewOpen, setNotePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    importSeedResources();
  }, [importSeedResources]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const closeExportMenu = (event: PointerEvent) => {
      if (exportMenuRef.current?.contains(event.target as Node)) return;
      setExportMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeExportMenu);
    return () => document.removeEventListener("pointerdown", closeExportMenu);
  }, [exportMenuOpen]);

  const filteredResources = useMemo(
    () =>
      resources.filter((item) => {
        const haystack = `${item.title} ${item.url ?? ""} ${item.collection ?? ""} ${item.tags ?? ""} ${item.notes ?? ""}`.toLowerCase();
        const matchesFilter = type === "all" || (type === "favorites" ? item.favorite : item.type === type);
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [query, resources, type],
  );

  const filteredNotes = useMemo(
    () => notes.filter((note) => `${note.title} ${note.tags ?? ""} ${note.body}`.toLowerCase().includes(query.toLowerCase())),
    [notes, query],
  );

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

  const saveNewNote = () => {
    if (!noteForm.title.trim() || !noteForm.body.trim()) return;
    const nextNote = {
      ...noteForm,
      title: noteForm.title.trim(),
      body: noteForm.body.trim(),
      tags: noteForm.tags.trim() || undefined,
    };
    addNote(nextNote);
    setNoteForm(emptyNoteForm);
    setShowForm(null);
    setView("notes");
  };

  const startEditingNote = (note: HubNote) => {
    setEditingNoteId(note.id);
    setEditNoteForm({ title: note.title, body: note.body, tags: note.tags ?? "", projectIds: note.projectIds ?? [] });
  };

  const saveEditingNote = () => {
    if (!editingNoteId || !editNoteForm.title.trim() || !editNoteForm.body.trim()) return;
    updateNote(editingNoteId, {
      title: editNoteForm.title.trim(),
      body: editNoteForm.body.trim(),
      tags: editNoteForm.tags.trim() || undefined,
      projectIds: editNoteForm.projectIds,
    });
    setEditingNoteId(null);
  };

  const exportNotes = (format: "json" | "markdown", scope: "current" | "all") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const exportNotes = scope === "current" && selectedNote ? [selectedNote] : notes;
    const filenameBase =
      scope === "current" && selectedNote
        ? `align-note-${slugifyFilename(selectedNote.title)}`
        : "align-personal-hub-notes";

    if (format === "json") {
      downloadTextFile(`${filenameBase}-${stamp}.json`, exportHubNotesJson(exportNotes), "application/json");
      setExportMenuOpen(false);
      return;
    }

    downloadTextFile(`${filenameBase}-${stamp}.md`, exportHubNotesMarkdown(exportNotes), "text/markdown");
    setExportMenuOpen(false);
  };

  const importNotes = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      const imported = parseHubNotesImport(content, file.name);
      const { notes: mergedNotes, summary } = mergeImportedHubNotes(notes, imported);
      replaceNotes(mergedNotes);
      setImportMessage(summary.message);
      setView("notes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import notes.";
      setImportMessage(message);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} className="hidden" type="file" accept=".json,.md,.markdown,application/json,text/markdown,text/plain" onChange={(event) => void importNotes(event)} />
            <Button variant="secondary" icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
              Import
            </Button>
            <div ref={exportMenuRef} className="relative">
              <Button variant="secondary" icon={<Download size={16} />} onClick={() => setExportMenuOpen((open) => !open)} disabled={!notes.length}>
                Export
              </Button>
              {exportMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--dropdown-bg)] p-2 shadow-[var(--shadow-md)]">
                  {selectedNote ? (
                    <>
                      <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Current note</p>
                      <ExportMenuButton
                        title="Download Markdown"
                        description={selectedNote.title}
                        onClick={() => exportNotes("markdown", "current")}
                      />
                      <ExportMenuButton
                        title="Download JSON"
                        description="Single-note backup"
                        onClick={() => exportNotes("json", "current")}
                      />
                      <div className="my-2 border-t border-[var(--border)]" />
                    </>
                  ) : null}
                  <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">All notes</p>
                  <ExportMenuButton
                    title="Backup JSON"
                    description="Best for restoring every note later."
                    onClick={() => exportNotes("json", "all")}
                  />
                  <ExportMenuButton
                    title="Markdown Bundle"
                    description="Readable archive containing every note."
                    onClick={() => exportNotes("markdown", "all")}
                  />
                </div>
              ) : null}
            </div>
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
            <Button icon={<Plus size={16} />} onClick={() => {
              setShowForm("resource");
              setView("resources");
            }}>
              Add Resource
            </Button>
          </div>
        }
      />

      {importMessage ? (
        <Card className="flex flex-col gap-2 p-4 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>{importMessage}</span>
          <Button variant="ghost" onClick={() => setImportMessage("")}>
            Dismiss
          </Button>
        </Card>
      ) : null}

      <Card className="p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={17} />
            <Input className="align-field-quiet pl-10 sm:min-h-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes, resources, tags, collections..." />
          </label>
          <div className="align-tab-list">
            <button type="button" className="align-tab" data-active={view === "resources"} onClick={() => setView("resources")}>
              Resources
            </button>
            <button type="button" className="align-tab" data-active={view === "notes"} onClick={() => setView("notes")}>
              Notes
            </button>
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
            <FilterChip active={type === "favorites"} onClick={() => setType("favorites")}>
              Favorites
            </FilterChip>
          </div>
        ) : null}
      </Card>

      <div className={`grid gap-5 ${view === "notes" ? "xl:grid-cols-[260px_minmax(0,1fr)]" : "2xl:grid-cols-[minmax(0,1fr)_400px]"}`}>
        {view === "notes" ? (
          <aside className="space-y-4">
            <NoteListPanel notes={filteredNotes} projects={projects} selectedNote={selectedNote} onSelectNote={(note) => setSelectedNoteId(note.id)} />
          </aside>
        ) : null}

        <main className="min-w-0 space-y-4">
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

          {view === "resources" ? (
            filteredResources.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                {filteredResources.map((item) => {
                  const isSelected = selectedResourceId === item.id;
                  return (
                    <ResourceCard
                      key={item.id}
                      item={item}
                      selected={isSelected}
                      onSelect={() => setSelectedResourceId(item.id)}
                      onEdit={() => startEditingResource(item)}
                      onDelete={() => {
                        deleteResource(item.id);
                        if (selectedResourceId === item.id) setSelectedResourceId(null);
                      }}
                      onToggleFavorite={() => updateResource(item.id, { favorite: !item.favorite })}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState>No matching resources yet.</EmptyState>
            )
          ) : (
            <NotesWorkspace
              notes={filteredNotes}
              projects={projects}
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
              creatingNote={showForm === "note"}
              noteForm={noteForm}
              previewOpen={notePreviewOpen}
              onTogglePreview={() => setNotePreviewOpen((open) => !open)}
              onNoteFormChange={setNoteForm}
              onCancelNewNote={() => {
                setShowForm(null);
                setNoteForm(emptyNoteForm);
              }}
              onSaveNewNote={saveNewNote}
            />
          )}
        </main>

        {view === "resources" ? (
          <aside className="hidden 2xl:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
              {selectedResource ? (
                <ResourceDetailInline
                  compact
                  item={selectedResource}
                  isEditing={editingResourceId === selectedResource.id}
                  form={resourceForm}
                  onFormChange={setResourceForm}
                  onStartEdit={() => startEditingResource(selectedResource)}
                  onCancelEdit={() => {
                    setEditingResourceId(null);
                    setResourceForm(emptyResourceForm);
                  }}
                  onSaveEdit={saveEditingResource}
                  onDelete={() => {
                    deleteResource(selectedResource.id);
                    setSelectedResourceId(null);
                  }}
                  onToggleFavorite={() => updateResource(selectedResource.id, { favorite: !selectedResource.favorite })}
                />
              ) : (
                <Card className="p-5">
                  <div className="grid min-h-72 place-items-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-6 text-center">
                    <div>
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
                        <ExternalLink size={18} />
                      </span>
                      <h2 className="mt-4 font-display text-lg font-bold text-[var(--text)]">Select a resource</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        Click any resource card to preview its link, notes, tags, and actions here while the grid stays in place.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </aside>
        ) : null}

        {view === "resources" && selectedResource ? (
          <div className="2xl:hidden">
            <ResourceDetailInline
              item={selectedResource}
              isEditing={editingResourceId === selectedResource.id}
              form={resourceForm}
              onFormChange={setResourceForm}
              onStartEdit={() => startEditingResource(selectedResource)}
              onCancelEdit={() => {
                setEditingResourceId(null);
                setResourceForm(emptyResourceForm);
              }}
              onSaveEdit={saveEditingResource}
              onDelete={() => {
                deleteResource(selectedResource.id);
                setSelectedResourceId(null);
              }}
              onToggleFavorite={() => updateResource(selectedResource.id, { favorite: !selectedResource.favorite })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isProject(project: Project | undefined): project is Project {
  return Boolean(project);
}

function ProjectPicker({ projects, selectedIds, onChange }: { projects: Project[]; selectedIds: string[]; onChange: (projectIds: string[]) => void }) {
  const selectableProjects = projects.filter((project) => project.status === "active" || project.status === "paused" || selectedIds.includes(project.id));

  if (!selectableProjects.length) return null;

  const toggleProject = (projectId: string) => {
    onChange(selectedIds.includes(projectId) ? selectedIds.filter((id) => id !== projectId) : [...selectedIds, projectId]);
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Linked projects</p>
        <span className="text-xs font-semibold text-[var(--text-soft)]">{selectedIds.length} selected</span>
      </div>
      <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
        {selectableProjects.map((project) => {
          const selected = selectedIds.includes(project.id);
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => toggleProject(project.id)}
              className={`rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MarkdownEditor({
  value,
  onChange,
  compact = false,
  previewOpen = false,
  onTogglePreview,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  previewOpen?: boolean;
  onTogglePreview?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <EditorButton icon={<Heading1 size={15} />} label="Heading" onClick={() => insertSnippet("# Heading\n")} />
        <EditorButton icon={<Heading2 size={15} />} label="Subheading" onClick={() => insertSnippet("## Subheading\n")} />
        <EditorButton icon={<List size={15} />} label="List" onClick={() => insertSnippet("- List item\n")} />
        <EditorButton icon={<CheckSquare size={15} />} label="Checklist" onClick={() => insertSnippet("- [ ] Checklist item\n")} />
        <EditorButton icon={<Code2 size={15} />} label="Code" onClick={() => insertSnippet("```\ncode\n```\n")} />
        <EditorButton icon={<Link size={15} />} label="Link" onClick={() => insertSnippet("[Link title](https://example.com)")} />
        <EditorButton icon={<Minus size={15} />} label="Divider" onClick={() => insertSnippet("\n---\n")} />
        {!compact && onTogglePreview ? (
          <button
            type="button"
            onClick={onTogglePreview}
            className={`ml-auto inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-semibold transition ${
              previewOpen
                ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                : "border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)]"
            }`}
          >
            <FileText size={15} />
            {previewOpen ? "Edit" : "Preview"}
          </button>
        ) : null}
      </div>
      {previewOpen && !compact ? (
        <div className="min-h-[520px] overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-6">
          {value.trim() ? <NoteReader body={value} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? "xl:grid-cols-2" : ""}`}>
          <StudioTextarea
            ref={textareaRef}
            className={`${compact ? "min-h-64" : "min-h-[520px]"} resize-y font-mono text-sm leading-7`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={"# Heading\n- [ ] Checklist item\nNotes, snippets, prompts, or decisions..."}
          />
          {compact ? (
            <div className="min-h-64 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
              {value.trim() ? <NoteReader body={value} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EditorButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-2 text-sm font-semibold text-[var(--button-secondary-text)] transition hover:border-[var(--border-strong)]"
    >
      {icon}
      {label}
    </button>
  );
}

function NoteListPanel({
  notes,
  projects,
  selectedNote,
  onSelectNote,
}: {
  notes: HubNote[];
  projects: Project[];
  selectedNote: HubNote | null;
  onSelectNote: (note: HubNote) => void;
}) {
  const projectLookup = new Map(projects.map((project) => [project.id, project]));

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text)]">Saved Notes</h2>
            <p className="text-sm text-[var(--text-muted)]">{notes.length} private notes</p>
          </div>
          <SlidersHorizontal size={17} className="text-[var(--text-soft)]" />
        </div>
      </div>
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3">
        {!notes.length ? <EmptyState>No matching notes yet.</EmptyState> : null}
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--text-soft)]">{format(new Date(note.updatedAt), "MMM d, yyyy")}</span>
              {(note.projectIds ?? [])
                .map((projectId) => projectLookup.get(projectId))
                .filter(isProject)
                .slice(0, 1)
                .map((project) => (
                  <Badge key={project.id} tone="blue">{project.name}</Badge>
                ))}
              {note.tags
                ?.split(",")
                .filter(Boolean)
                .slice(0, 1)
                .map((tag) => (
                  <Badge key={tag.trim()}>{tag.trim()}</Badge>
                ))}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function NotesWorkspace({
  notes,
  projects,
  selectedNote,
  editingNoteId,
  editNoteForm,
  creatingNote,
  noteForm,
  previewOpen,
  onTogglePreview,
  onSelectNote,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onNoteFormChange,
  onCancelNewNote,
  onSaveNewNote,
  onDelete,
  onToggleFavorite,
}: {
  notes: HubNote[];
  projects: Project[];
  selectedNote: HubNote | null;
  editingNoteId: string | null;
  editNoteForm: NoteFormState;
  creatingNote: boolean;
  noteForm: NoteFormState;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onSelectNote: (note: HubNote) => void;
  onStartEdit: (note: HubNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditFormChange: (form: NoteFormState) => void;
  onNoteFormChange: (form: NoteFormState) => void;
  onCancelNewNote: () => void;
  onSaveNewNote: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (note: HubNote) => void;
}) {
  const isEditing = selectedNote ? editingNoteId === selectedNote.id : false;
  const projectLookup = new Map(projects.map((project) => [project.id, project]));
  const selectedProjects = selectedNote?.projectIds?.map((projectId) => projectLookup.get(projectId)).filter(isProject);

  return (
    <div className="min-h-[720px]">
      <Card className="min-h-[720px] overflow-hidden p-0">
        {creatingNote ? (
          <div className="flex h-full min-h-[720px] flex-col">
            <NotePanelHeader
              label="New private note"
              title={noteForm.title || "Untitled note"}
              actions={
                <>
                  <Button variant="secondary" icon={<X size={15} />} onClick={onCancelNewNote}>
                    Cancel
                  </Button>
                  <Button icon={<Save size={15} />} onClick={onSaveNewNote}>
                    Save Note
                  </Button>
                </>
              }
            />
            <div className="grid flex-1 gap-4 p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                <Input value={noteForm.title} onChange={(event) => onNoteFormChange({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                <Input value={noteForm.tags} onChange={(event) => onNoteFormChange({ ...noteForm, tags: event.target.value })} placeholder="Tags, comma separated" />
              </div>
              <ProjectPicker projects={projects} selectedIds={noteForm.projectIds} onChange={(projectIds) => onNoteFormChange({ ...noteForm, projectIds })} />
              <MarkdownEditor value={noteForm.body} onChange={(body) => onNoteFormChange({ ...noteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
            </div>
          </div>
        ) : selectedNote ? (
          <div className="flex h-full min-h-[720px] flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
                  <FileText size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Note</p>
                  <h2 className="font-display text-xl font-bold text-[var(--text)]">{selectedNote.title}</h2>
                  {selectedProjects?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProjects.map((project) => (
                        <Badge key={project.id} tone="blue">{project.name}</Badge>
                      ))}
                    </div>
                  ) : null}
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
                <ProjectPicker projects={projects} selectedIds={editNoteForm.projectIds} onChange={(projectIds) => onEditFormChange({ ...editNoteForm, projectIds })} />
                <MarkdownEditor value={editNoteForm.body} onChange={(body) => onEditFormChange({ ...editNoteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
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

function NotePanelHeader({ label, title, actions }: { label: string; title: string; actions: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
        <h2 className="mt-1 truncate font-display text-xl font-bold text-[var(--text)]">{title}</h2>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
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
  compact = false,
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
  compact?: boolean;
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
  const editFieldGridClass = compact ? "grid gap-3" : "grid gap-3 lg:grid-cols-[1fr_1fr_180px]";
  const editMetaGridClass = compact ? "grid gap-3" : "grid gap-3 lg:grid-cols-2";
  const detailLayoutClass = compact ? "grid gap-4 p-4" : "grid gap-5 p-5 lg:grid-cols-[280px_minmax(0,1fr)]";
  const previewCardClass = compact
    ? "flex min-h-44 flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(132,103,255,0.38),transparent_42%),linear-gradient(135deg,var(--bg-soft),var(--surface))] p-5"
    : "flex min-h-48 flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(132,103,255,0.38),transparent_42%),linear-gradient(135deg,var(--bg-soft),var(--surface))] p-5";

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
          <div className={editFieldGridClass}>
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
          <div className={editMetaGridClass}>
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
      <div className={detailLayoutClass}>
        <div className={previewCardClass}>
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            {favicon ? <img src={favicon} alt="" className="h-10 w-10" loading="lazy" /> : <span className="font-display text-lg font-bold text-[var(--brand-primary)]">{getResourceInitials(item.title)}</span>}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{host || "Saved resource"}</p>
            {item.url ? <p className="mt-1 break-all text-sm text-[var(--text-muted)]">{item.url}</p> : <p className="mt-1 text-sm text-[var(--text-muted)]">Add a URL when you edit this resource.</p>}
          </div>
        </div>
        <div className="min-w-0">
          <div className={compact ? "grid gap-3" : "flex flex-wrap items-start justify-between gap-3"}>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Resource details</p>
              <h2 className={`mt-1 font-display font-bold text-[var(--text)] ${compact ? "text-xl" : "text-2xl"}`}>{item.title}</h2>
            </div>
            <div className={compact ? "grid grid-cols-1 gap-2 sm:grid-cols-3 2xl:grid-cols-1" : "flex flex-wrap gap-2"}>
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
            <div className={compact ? "mt-6 grid gap-2" : "mt-6 flex flex-wrap gap-2"}>
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
  const nodes: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        nodes.push(
          <pre key={`code-${index}`} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text)]">
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    if (!line) {
      nodes.push(<div key={index} className="h-2" />);
      return;
    }

    if (line === "---") {
      nodes.push(<hr key={index} className="border-[var(--border)]" />);
      return;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h2 key={index} className="pt-2 font-display text-2xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(2))}
        </h2>,
      );
      return;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h3 key={index} className="pt-2 font-display text-xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(3))}
        </h3>,
      );
      return;
    }

    if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
      const checked = line.startsWith("- [x] ");
      nodes.push(
        <p key={index} className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2">
          <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? "border-[var(--status-completed-text)] bg-[var(--status-completed-bg)]" : "border-[var(--border-strong)]"}`}>{checked ? "✓" : ""}</span>
          <span>{renderInlineMarkdown(line.slice(6))}</span>
        </p>,
      );
      return;
    }

    if (line.startsWith("- ")) {
      nodes.push(
        <p key={index} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2">
          {renderInlineMarkdown(line.slice(2))}
        </p>,
      );
      return;
    }

    nodes.push(<p key={index}>{renderInlineMarkdown(line)}</p>);
  });

  if (inCodeBlock && codeLines.length) {
    nodes.push(
      <pre key="code-open" className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text)]">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
  }

  return <article className="space-y-3 text-base leading-8 text-[var(--text-muted)]">{nodes}</article>;
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!match) return <span key={index}>{part}</span>;
    return (
      <a key={index} className="font-semibold text-[var(--text-brand)] hover:underline" href={match[2]} target="_blank" rel="noreferrer">
        {match[1]}
      </a>
    );
  });
}
