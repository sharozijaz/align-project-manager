import {
  Check,
  CheckSquare,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  ExternalLink,
  FileText,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Pin,
  Plus,
  Quote,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  StickyNote,
  Strikethrough,
  Table2,
  Trash2,
  Redo2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
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
type NoteFilter = "all" | "pinned" | "linked";
type NoteFormState = {
  title: string;
  body: string;
  tags: string;
  clientVisible: boolean;
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
  clientVisible: false,
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

function normalizeNoteFormForSave(form: NoteFormState): NoteFormState {
  return {
    title: form.title.trim() || "Untitled note",
    body: form.body,
    tags: form.tags.trim() || "",
    clientVisible: Boolean(form.clientVisible),
    projectIds: form.projectIds,
  };
}

function toggleChecklistLineInMarkdown(body: string, lineIndex: number) {
  const lines = body.split("\n");
  const line = lines[lineIndex];
  if (typeof line !== "string") return body;
  if (!/^\s*- \[[ xX]\]\s+/.test(line)) return body;
  lines[lineIndex] = line.replace(/- \[([ xX])\]/, (_, state: string) => (state.toLowerCase() === "x" ? "- [ ]" : "- [x]"));
  return lines.join("\n");
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

export function ResourcesWorkspace({ initialView = "resources" }: { initialView?: HubView }) {
  const { resources, notes, addResource, addNote, updateResource, updateNote, deleteResource, deleteNote, replaceNotes } = useStudioStore();
  const projects = useProjectStore((state) => state.projects);
  const workspaceView = initialView === "notes" ? "notes" : "resources";
  const isNotesWorkspace = workspaceView === "notes";
  const [view, setView] = useState<HubView>(workspaceView);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResourceFilter>("all");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [showForm, setShowForm] = useState<"resource" | "note" | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNoteId, setDraftNoteId] = useState<string | null>(null);
  const [noteAutosaveStatus, setNoteAutosaveStatus] = useState("");
  const [editNoteForm, setEditNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(emptyResourceForm);
  const [noteForm, setNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [importMessage, setImportMessage] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [notePreviewOpen, setNotePreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setView(workspaceView);
  }, [workspaceView]);

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
    () =>
      notes
        .filter((note) => {
          const matchesQuery = `${note.title} ${note.tags ?? ""} ${note.body}`.toLowerCase().includes(query.toLowerCase());
          const matchesFilter =
            noteFilter === "all" ||
            (noteFilter === "pinned" && Boolean(note.favorite)) ||
            (noteFilter === "linked" && Boolean(note.projectIds?.length));
          return matchesQuery && matchesFilter;
        })
        .sort((left, right) => {
          if (Boolean(left.favorite) !== Boolean(right.favorite)) return left.favorite ? -1 : 1;
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }),
    [notes, noteFilter, query],
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

  useEffect(() => {
    if (showForm !== "note") return;

    const hasDraftContent = Boolean(noteForm.title.trim() || noteForm.body.trim() || noteForm.tags.trim() || noteForm.projectIds.length);
    if (!hasDraftContent) {
      setNoteAutosaveStatus("");
      return;
    }

    setNoteAutosaveStatus("Saving draft...");
    const timeout = window.setTimeout(() => {
      const payload = normalizeNoteFormForSave(noteForm);

      if (draftNoteId) {
        updateNote(draftNoteId, payload);
        setSelectedNoteId(draftNoteId);
      } else {
        const draft = addNote(payload);
        setDraftNoteId(draft.id);
        setSelectedNoteId(draft.id);
      }

      setNoteAutosaveStatus("Draft saved");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [addNote, draftNoteId, noteForm, showForm, updateNote]);

  useEffect(() => {
    if (!editingNoteId) return;

    setNoteAutosaveStatus("Saving changes...");
    const timeout = window.setTimeout(() => {
      updateNote(editingNoteId, normalizeNoteFormForSave(editNoteForm));
      setNoteAutosaveStatus("Changes saved");
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [editNoteForm, editingNoteId, updateNote]);

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
    const hasContent = Boolean(noteForm.title.trim() || noteForm.body.trim() || noteForm.tags.trim() || noteForm.projectIds.length);
    if (!hasContent) return;

    if (draftNoteId) {
      updateNote(draftNoteId, normalizeNoteFormForSave(noteForm));
      setSelectedNoteId(draftNoteId);
    } else {
      const saved = addNote(normalizeNoteFormForSave(noteForm));
      setSelectedNoteId(saved.id);
    }

    setNoteForm(emptyNoteForm);
    setDraftNoteId(null);
    setNoteAutosaveStatus("");
    setShowForm(null);
    setView("notes");
  };

  const handleDeleteNote = (noteId: string) => {
    const nextVisibleNote = filteredNotes.find((note) => note.id !== noteId) ?? null;
    deleteNote(noteId);
    if (selectedNoteId === noteId) setSelectedNoteId(nextVisibleNote?.id ?? null);
    if (editingNoteId === noteId) setEditingNoteId(null);
  };

  const startEditingNote = (note: HubNote) => {
    setEditingNoteId(note.id);
    setNoteAutosaveStatus("");
    setEditNoteForm({
      title: note.title,
      body: note.body,
      tags: note.tags ?? "",
      clientVisible: Boolean(note.clientVisible),
      projectIds: note.projectIds ?? [],
    });
  };

  const saveEditingNote = () => {
    if (!editingNoteId) return;
    updateNote(editingNoteId, normalizeNoteFormForSave(editNoteForm));
    setNoteAutosaveStatus("");
    setEditingNoteId(null);
  };

  const toggleSelectedNoteChecklistLine = (note: HubNote, lineIndex: number) => {
    updateNote(note.id, { body: toggleChecklistLineInMarkdown(note.body, lineIndex) });
  };

  const exportNotes = (format: "json" | "markdown", scope: "current" | "all") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const exportNotes = scope === "current" && selectedNote ? [selectedNote] : notes;
    const filenameBase =
      scope === "current" && selectedNote
        ? `align-note-${slugifyFilename(selectedNote.title)}`
        : "align-notes";

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
        title={isNotesWorkspace ? "Notes" : "Resources"}
        description={
          isNotesWorkspace
            ? "A private writing space for decisions, snippets, project context, and reusable notes."
            : "A private library for inspiration, tools, links, assets, snippets, and working references."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isNotesWorkspace ? (
              <>
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
              </>
            ) : (
              <Button icon={<Plus size={16} />} onClick={() => {
                setShowForm("resource");
                setView("resources");
              }}>
                Add Resource
              </Button>
            )}
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
        <div className="grid gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={17} />
            <Input
              className="align-field-quiet pl-10 sm:min-h-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isNotesWorkspace ? "Search notes, tags, linked projects..." : "Search resources, tags, collections..."}
            />
          </label>
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

      <div className={`grid gap-5 ${view === "notes" ? "xl:grid-cols-[320px_minmax(0,1fr)]" : "2xl:grid-cols-[minmax(0,1fr)_400px]"}`}>
        {view === "notes" ? (
          <aside className="space-y-4">
            <NoteListPanel
              notes={filteredNotes}
              allNotes={notes}
              projects={projects}
              selectedNote={selectedNote}
              filter={noteFilter}
              onFilterChange={setNoteFilter}
              onSelectNote={(note) => setSelectedNoteId(note.id)}
            />
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
              projects={projects}
              selectedNote={selectedNote}
              editingNoteId={editingNoteId}
              editNoteForm={editNoteForm}
              onStartEdit={startEditingNote}
              onCancelEdit={() => setEditingNoteId(null)}
              onSaveEdit={saveEditingNote}
              onEditFormChange={setEditNoteForm}
              onDelete={handleDeleteNote}
              onToggleFavorite={(note) => updateNote(note.id, { favorite: !note.favorite })}
              onToggleChecklistLine={toggleSelectedNoteChecklistLine}
              creatingNote={showForm === "note"}
              noteForm={noteForm}
              autosaveStatus={noteAutosaveStatus}
              previewOpen={notePreviewOpen}
              onTogglePreview={() => setNotePreviewOpen((open) => !open)}
              onNoteFormChange={setNoteForm}
              onCancelNewNote={() => {
                if (draftNoteId) setSelectedNoteId(draftNoteId);
                setShowForm(null);
                setNoteForm(emptyNoteForm);
                setDraftNoteId(null);
                setNoteAutosaveStatus("");
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

function ClientVisibilityToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-left text-sm transition ${
        checked
          ? "border-[var(--brand-primary)] bg-[var(--button-secondary-hover)] text-[var(--text)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-primary)]">
        <Eye size={16} />
      </span>
      <span>
        <span className="block font-bold text-[var(--text)]">{checked ? "Client-visible note" : "Private note"}</span>
        <span className="mt-1 block text-xs">
          {checked
            ? "This note can appear on password-protected client share links for linked projects."
            : "This note stays private even when linked projects are shared."}
        </span>
      </span>
    </button>
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

  const updateValue = (next: string, selectionStart: number, selectionEnd = selectionStart) => {
    onChange(next);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const getSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return { start: value.length, end: value.length };
    }
    return { start: textarea.selectionStart, end: textarea.selectionEnd };
  };

  const insertSnippet = (snippet: string, cursorOffset = snippet.length) => {
    const { start, end } = getSelection();
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    updateValue(next, start + cursorOffset);
  };

  const toggleChecklistLine = (lineIndex: number) => {
    onChange(toggleChecklistLineInMarkdown(value, lineIndex));
  };

  const toggleCurrentChecklistLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return false;
    const cursor = textarea.selectionStart;
    const lineIndex = value.slice(0, cursor).split("\n").length - 1;
    const next = toggleChecklistLineInMarkdown(value, lineIndex);
    if (next === value) return false;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
    return true;
  };

  const wrapSelection = (before: string, after = before, fallback = "text") => {
    const { start, end } = getSelection();
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    updateValue(next, start + before.length, start + before.length + selected.length);
  };

  const replaceSelectedLines = (transform: (line: string, lineIndex: number) => string) => {
    const { start, end } = getSelection();
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split("\n");
    const transformed = lines.map((line, index) => transform(line, index)).join("\n");
    const next = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
    updateValue(next, lineStart, lineStart + transformed.length);
  };

  const applyLinePrefix = (prefix: string) => {
    replaceSelectedLines((line) => {
      const cleaned = line.replace(/^(\s*)(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|- \[[ xX]\]\s+)/, "$1");
      const indentation = cleaned.match(/^\s*/)?.[0] ?? "";
      return `${indentation}${prefix}${cleaned.slice(indentation.length) || "item"}`;
    });
  };

  const insertTable = () => {
    insertSnippet("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n", 2);
  };

  const runNativeEditCommand = (command: "undo" | "redo") => {
    textareaRef.current?.focus();
    document.execCommand(command);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html.trim()) return;

    const markdown = convertHtmlToMarkdown(html);
    if (!markdown.trim()) return;

    event.preventDefault();
    const { start, end } = getSelection();
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsLeadingBreak = Boolean(before && !before.endsWith("\n") && !markdown.startsWith("\n"));
    const needsTrailingBreak = Boolean(after && !after.startsWith("\n") && !markdown.endsWith("\n"));
    const insertion = `${needsLeadingBreak ? "\n" : ""}${markdown}${needsTrailingBreak ? "\n" : ""}`;
    const next = `${before}${insertion}${after}`;
    updateValue(next, start + insertion.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold text");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrapSelection("*", "*", "italic text");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      if (toggleCurrentChecklistLine()) event.preventDefault();
      return;
    }

    if (event.key === "Tab") {
      const { start } = getSelection();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const line = value.slice(lineStart, value.indexOf("\n", start) === -1 ? value.length : value.indexOf("\n", start));
      if (!/^(\s*)([-*+]\s+|\d+\.\s+|- \[[ xX]\]\s+)/.test(line)) return;
      event.preventDefault();
      const prefixChange = event.shiftKey ? -2 : 2;
      replaceSelectedLines((selectedLine) => {
        if (prefixChange > 0) return `  ${selectedLine}`;
        return selectedLine.startsWith("  ") ? selectedLine.slice(2) : selectedLine.trimStart();
      });
      return;
    }

    if (event.key !== "Enter") return;
    const cursor = textarea.selectionStart;
    if (cursor !== textarea.selectionEnd) return;
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const currentLine = value.slice(lineStart, cursor);
    const checklistMatch = currentLine.match(/^(\s*)- \[([ xX])\]\s*(.*)$/);
    const bulletMatch = currentLine.match(/^(\s*)[-*+]\s+(.*)$/);
    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

    const continueList = (prefix: string, lineContent: string) => {
      event.preventDefault();
      if (!lineContent.trim()) {
        const next = `${value.slice(0, lineStart)}${value.slice(cursor)}`;
        updateValue(next, lineStart);
        return;
      }
      insertSnippet(`\n${prefix}`);
    };

    if (checklistMatch) {
      continueList(`${checklistMatch[1]}- [ ] `, checklistMatch[3]);
      return;
    }
    if (orderedMatch) {
      continueList(`${orderedMatch[1]}${Number(orderedMatch[2]) + 1}. `, orderedMatch[3]);
      return;
    }
    if (bulletMatch) {
      continueList(`${bulletMatch[1]}- `, bulletMatch[2]);
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value ? value.split("\n").length : 1;

  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-[var(--bg-soft)]/70 p-2">
        <EditorButton icon={<Undo2 size={15} />} label="Undo" title="Undo" onClick={() => runNativeEditCommand("undo")} />
        <EditorButton icon={<Redo2 size={15} />} label="Redo" title="Redo" onClick={() => runNativeEditCommand("redo")} />
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <EditorButton icon={<Heading1 size={15} />} label="H1" title="Heading 1" onClick={() => applyLinePrefix("# ")} />
        <EditorButton icon={<Heading2 size={15} />} label="H2" title="Heading 2" onClick={() => applyLinePrefix("## ")} />
        <EditorButton icon={<Heading3 size={15} />} label="H3" title="Heading 3" onClick={() => applyLinePrefix("### ")} />
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <EditorButton icon={<Bold size={15} />} label="Bold" title="Bold" onClick={() => wrapSelection("**", "**", "bold text")} />
        <EditorButton icon={<Italic size={15} />} label="Italic" title="Italic" onClick={() => wrapSelection("*", "*", "italic text")} />
        <EditorButton icon={<Strikethrough size={15} />} label="Strike" title="Strikethrough" onClick={() => wrapSelection("~~", "~~", "old text")} />
        <EditorButton icon={<Code2 size={15} />} label="Code" title="Inline code" onClick={() => wrapSelection("`", "`", "code")} />
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <EditorButton icon={<List size={15} />} label="Bullets" title="Bullet list" onClick={() => applyLinePrefix("- ")} />
        <EditorButton icon={<ListOrdered size={15} />} label="Numbered" title="Numbered list" onClick={() => replaceSelectedLines((line, index) => `${index + 1}. ${line.replace(/^(\s*)(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|- \[[ xX]\]\s+)/, "").trim() || "item"}`)} />
        <EditorButton icon={<CheckSquare size={15} />} label="Checklist" title="Checklist" onClick={() => applyLinePrefix("- [ ] ")} />
        <EditorButton icon={<Quote size={15} />} label="Quote" title="Quote" onClick={() => applyLinePrefix("> ")} />
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <EditorButton icon={<Code2 size={15} />} label="Block" title="Code block" onClick={() => insertSnippet("```\ncode\n```\n", 4)} />
        <EditorButton icon={<Link size={15} />} label="Link" title="Link" onClick={() => wrapSelection("[", "](https://example.com)", "Link title")} />
        <EditorButton icon={<Table2 size={15} />} label="Table" title="Table" onClick={insertTable} />
        <EditorButton icon={<Minus size={15} />} label="Divider" title="Divider" onClick={() => insertSnippet("\n---\n")} />
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
        <div className="min-h-[680px] overflow-y-auto bg-[var(--surface)] p-6 lg:p-8">
          <div className="mx-auto max-w-[1180px]">
            {value.trim() ? <NoteReader body={value} onToggleChecklistLine={toggleChecklistLine} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? "xl:grid-cols-2" : ""}`}>
          <StudioTextarea
            ref={textareaRef}
            className={`${compact ? "min-h-64" : "min-h-[680px]"} resize-y rounded-none border-0 bg-transparent px-6 py-5 font-mono text-[15px] leading-8 focus:ring-0 lg:px-8`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={"# Heading\n\nWrite notes, decisions, snippets, prompts, links, tables, and checklists...\n\n- Bullet item\n- [ ] Checklist item"}
          />
          {compact ? (
            <div className="min-h-64 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
              {value.trim() ? <NoteReader body={value} onToggleChecklistLine={toggleChecklistLine} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
            </div>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-soft)]/60 px-3 py-2 text-xs font-semibold text-[var(--text-soft)]">
        <span>Markdown</span>
        <span>{wordCount} words · {lineCount} lines</span>
      </div>
    </div>
  );
}

function EditorButton({ icon, label, title, onClick }: { icon: ReactNode; label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function convertHtmlToMarkdown(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const markdown = Array.from(doc.body.childNodes)
    .map((node) => htmlNodeToMarkdown(node).trimEnd())
    .filter(Boolean)
    .join("\n\n");

  return cleanMarkdown(markdown);
}

function htmlNodeToMarkdown(node: Node, listDepth = 0, orderedIndex = 1): string {
  if (node.nodeType === Node.TEXT_NODE) return normalizeMarkdownText(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = () => inlineChildrenToMarkdown(element, listDepth).trim();
  const blockChildren = () => Array.from(element.childNodes).map((child) => htmlNodeToMarkdown(child, listDepth)).join("").trim();

  if (tag === "br") return "\n";
  if (tag === "h1") return `# ${children()}`;
  if (tag === "h2") return `## ${children()}`;
  if (tag === "h3") return `### ${children()}`;
  if (tag === "h4") return `#### ${children()}`;
  if (tag === "h5") return `##### ${children()}`;
  if (tag === "h6") return `###### ${children()}`;
  if (tag === "p") return children();
  if (tag === "div" || tag === "section" || tag === "article" || tag === "main" || tag === "header" || tag === "footer") return blockChildren();
  if (tag === "strong" || tag === "b") return wrapMarkdown(children(), "**");
  if (tag === "em" || tag === "i") return wrapMarkdown(children(), "*");
  if (tag === "s" || tag === "del") return wrapMarkdown(children(), "~~");
  if (tag === "code") {
    const text = element.textContent ?? "";
    return element.closest("pre") ? text : `\`${text.replace(/`/g, "\\`")}\``;
  }
  if (tag === "pre") return `\`\`\`\n${(element.textContent ?? "").replace(/\n+$/g, "")}\n\`\`\``;
  if (tag === "a") {
    const text = children() || normalizeMarkdownText(element.textContent ?? "");
    const href = sanitizeMarkdownUrl(element.getAttribute("href") ?? "");
    return href ? `[${text}](${href})` : text;
  }
  if (tag === "blockquote") {
    return blockChildren()
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (tag === "hr") return "---";
  if (tag === "ul" || tag === "ol") return listToMarkdown(element, tag === "ol", listDepth);
  if (tag === "li") return listItemToMarkdown(element, false, listDepth, orderedIndex);
  if (tag === "table") return tableToMarkdown(element);
  if (tag === "thead" || tag === "tbody" || tag === "tr" || tag === "th" || tag === "td") return children();

  return blockChildren() || children();
}

function inlineChildrenToMarkdown(element: HTMLElement, listDepth = 0) {
  return Array.from(element.childNodes)
    .map((child) => htmlNodeToMarkdown(child, listDepth))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function listToMarkdown(element: HTMLElement, ordered: boolean, listDepth: number) {
  let index = 1;
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === "li")
    .map((child) => listItemToMarkdown(child as HTMLElement, ordered, listDepth, index++))
    .join("\n");
}

function listItemToMarkdown(element: HTMLElement, ordered: boolean, listDepth: number, orderedIndex: number) {
  const indent = "  ".repeat(listDepth);
  const marker = ordered ? `${orderedIndex}.` : "-";
  const directContent: string[] = [];
  const nestedLists: string[] = [];

  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes((child as HTMLElement).tagName.toLowerCase())) {
      nestedLists.push(htmlNodeToMarkdown(child, listDepth + 1));
      return;
    }
    directContent.push(htmlNodeToMarkdown(child, listDepth));
  });

  const content = cleanInlineMarkdown(directContent.join("").trim()) || "Item";
  const nested = nestedLists.filter(Boolean).join("\n");
  return `${indent}${marker} ${content}${nested ? `\n${nested}` : ""}`;
}

function tableToMarkdown(element: HTMLElement) {
  const rows = Array.from(element.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th, td"))
        .map((cell) => cleanTableCell(inlineChildrenToMarkdown(cell as HTMLElement)))
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);

  if (!rows.length) return "";
  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ""));
  const header = normalizedRows[0];
  const body = normalizedRows.slice(1);
  const divider = Array.from({ length: columnCount }, () => "---");

  return [header, divider, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function cleanMarkdown(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInlineMarkdown(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanTableCell(value: string) {
  return cleanInlineMarkdown(value).replace(/\|/g, "\\|");
}

function normalizeMarkdownText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t\r\n]+/g, " ");
}

function wrapMarkdown(value: string, marker: string) {
  const trimmed = value.trim();
  return trimmed ? `${marker}${trimmed}${marker}` : "";
}

function NoteListPanel({
  notes,
  allNotes,
  projects,
  selectedNote,
  filter,
  onFilterChange,
  onSelectNote,
}: {
  notes: HubNote[];
  allNotes: HubNote[];
  projects: Project[];
  selectedNote: HubNote | null;
  filter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
  onSelectNote: (note: HubNote) => void;
}) {
  const projectLookup = new Map(projects.map((project) => [project.id, project]));
  const pinnedCount = allNotes.filter((note) => note.favorite).length;
  const linkedCount = allNotes.filter((note) => note.projectIds?.length).length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text)]">Saved Notes</h2>
            <p className="text-sm text-[var(--text-muted)]">{allNotes.length} private notes</p>
          </div>
          <SlidersHorizontal size={17} className="text-[var(--text-soft)]" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <NoteFilterButton active={filter === "all"} label="All" count={allNotes.length} onClick={() => onFilterChange("all")} />
          <NoteFilterButton active={filter === "pinned"} label="Pinned" count={pinnedCount} onClick={() => onFilterChange("pinned")} />
          <NoteFilterButton active={filter === "linked"} label="Linked" count={linkedCount} onClick={() => onFilterChange("linked")} />
        </div>
      </div>
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3">
        {!notes.length ? <EmptyState>No matching notes yet.</EmptyState> : null}
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelectNote(note)}
            className={`mb-2 block w-full rounded-[var(--radius-sm)] border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 ${
              selectedNote?.id === note.id
                ? "border-[var(--brand-primary)] bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--brand-primary),var(--shadow-sm)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-1 font-display text-base font-bold text-[var(--text)]">{note.title}</h3>
              <Pin size={15} className={note.favorite ? "shrink-0 fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "shrink-0 text-[var(--text-soft)]"} />
            </div>
            {note.body ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{note.body.replace(/[#>*_`[\]-]/g, " ").replace(/\s+/g, " ").trim()}</p> : null}
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

function NoteFilterButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition ${
        active
          ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-[var(--shadow-sm)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span className="block text-xs font-bold">{label}</span>
      <span className="mt-0.5 block text-[11px] opacity-80">{count}</span>
    </button>
  );
}

function NotesWorkspace({
  projects,
  selectedNote,
  editingNoteId,
  editNoteForm,
  creatingNote,
  noteForm,
  autosaveStatus,
  previewOpen,
  onTogglePreview,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onNoteFormChange,
  onCancelNewNote,
  onSaveNewNote,
  onDelete,
  onToggleFavorite,
  onToggleChecklistLine,
}: {
  projects: Project[];
  selectedNote: HubNote | null;
  editingNoteId: string | null;
  editNoteForm: NoteFormState;
  creatingNote: boolean;
  noteForm: NoteFormState;
  autosaveStatus: string;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onStartEdit: (note: HubNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditFormChange: (form: NoteFormState) => void;
  onNoteFormChange: (form: NoteFormState) => void;
  onCancelNewNote: () => void;
  onSaveNewNote: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (note: HubNote) => void;
  onToggleChecklistLine: (note: HubNote, lineIndex: number) => void;
}) {
  const isEditing = selectedNote ? editingNoteId === selectedNote.id : false;
  const projectLookup = new Map(projects.map((project) => [project.id, project]));
  const selectedProjects = selectedNote?.projectIds?.map((projectId) => projectLookup.get(projectId)).filter(isProject);

  return (
    <div className="min-h-[760px]">
      <Card className="min-h-[760px] overflow-hidden p-0 shadow-[var(--shadow-sm)]">
        {creatingNote ? (
          <div className="flex h-full min-h-[760px] flex-col">
            <NotePanelHeader
              label="New private note"
              title={noteForm.title || "Untitled note"}
              meta={autosaveStatus || "Autosaves while you write"}
              actions={
                <>
                  <Button variant="secondary" icon={<X size={15} />} onClick={onCancelNewNote}>
                    Close
                  </Button>
                  <Button icon={<Save size={15} />} onClick={onSaveNewNote}>
                    Done
                  </Button>
                </>
              }
            />
            <div className="grid flex-1 gap-4 p-5 lg:p-6">
              <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                <Input value={noteForm.title} onChange={(event) => onNoteFormChange({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                <Input value={noteForm.tags} onChange={(event) => onNoteFormChange({ ...noteForm, tags: event.target.value })} placeholder="Tags, comma separated" />
              </div>
              <ProjectPicker projects={projects} selectedIds={noteForm.projectIds} onChange={(projectIds) => onNoteFormChange({ ...noteForm, projectIds })} />
              <ClientVisibilityToggle
                checked={noteForm.clientVisible}
                onChange={(clientVisible) => onNoteFormChange({ ...noteForm, clientVisible })}
              />
              <MarkdownEditor value={noteForm.body} onChange={(body) => onNoteFormChange({ ...noteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
            </div>
          </div>
        ) : selectedNote ? (
          <div className="flex h-full min-h-[760px] flex-col">
            <div className="border-b border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(80,151,255,0.12),transparent_35%),linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 lg:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
                      <FileText size={16} />
                    </span>
                    <span>Note</span>
                    {selectedNote.favorite ? <Badge tone="purple">Pinned</Badge> : null}
                    {selectedNote.clientVisible ? <Badge tone="emerald">Client-visible</Badge> : null}
                  </div>
                  <h2 className="mt-3 max-w-4xl font-display text-2xl font-bold leading-tight text-[var(--text)] lg:text-3xl">{selectedNote.title}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {selectedProjects?.map((project) => (
                      <Badge key={project.id} tone="blue">{project.name}</Badge>
                    ))}
                    {selectedNote.tags
                      ?.split(",")
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag.trim()}>{tag.trim()}</Badge>
                      ))}
                  </div>
                </div>
                <div className="grid gap-3 text-right">
                  <div className="text-xs font-semibold leading-5 text-[var(--text-soft)]">
                    <p>Updated {format(new Date(selectedNote.updatedAt), "MMM d, yyyy h:mm a")}</p>
                    <p>Created {format(new Date(selectedNote.createdAt), "MMM d, yyyy")}</p>
                    {isEditing && autosaveStatus ? <p className="text-[var(--text-brand)]">{autosaveStatus}</p> : null}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button type="button" variant="secondary" icon={<X size={15} />} onClick={onCancelEdit}>
                          Cancel
                        </Button>
                        <Button type="button" icon={<Save size={15} />} onClick={onSaveEdit}>
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" icon={<Pin size={15} />} onClick={() => onToggleFavorite(selectedNote)}>
                          {selectedNote.favorite ? "Pinned" : "Pin"}
                        </Button>
                        <Button type="button" icon={<Edit3 size={15} />} onClick={() => onStartEdit(selectedNote)}>
                          Edit
                        </Button>
                        <Button type="button" variant="danger" icon={<Trash2 size={15} />} onClick={() => onDelete(selectedNote.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="grid flex-1 gap-4 p-5 lg:p-6">
                <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                  <Input value={editNoteForm.title} onChange={(event) => onEditFormChange({ ...editNoteForm, title: event.target.value })} placeholder="Note title" />
                  <Input value={editNoteForm.tags} onChange={(event) => onEditFormChange({ ...editNoteForm, tags: event.target.value })} placeholder="Tags" />
                </div>
                <ProjectPicker projects={projects} selectedIds={editNoteForm.projectIds} onChange={(projectIds) => onEditFormChange({ ...editNoteForm, projectIds })} />
                <ClientVisibilityToggle
                  checked={editNoteForm.clientVisible}
                  onChange={(clientVisible) => onEditFormChange({ ...editNoteForm, clientVisible })}
                />
                <MarkdownEditor value={editNoteForm.body} onChange={(body) => onEditFormChange({ ...editNoteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,var(--surface),var(--bg))] p-6 lg:p-10">
                <div className="mx-auto max-w-[1280px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-sm)] lg:px-14 lg:py-10">
                  <NoteReader body={selectedNote.body} onToggleChecklistLine={(lineIndex) => onToggleChecklistLine(selectedNote, lineIndex)} />
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs font-semibold text-[var(--text-soft)]">
                    <span>{selectedNote.body.trim() ? selectedNote.body.trim().split(/\s+/).length : 0} words</span>
                    <span>Click checklist boxes to update this note.</span>
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

function NotePanelHeader({ label, title, actions, meta }: { label: string; title: string; actions: ReactNode; meta?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
        <h2 className="mt-1 truncate font-display text-xl font-bold text-[var(--text)]">{title}</h2>
        {meta ? <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{meta}</p> : null}
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

function NoteReader({ body, onToggleChecklistLine }: { body: string; onToggleChecklistLine?: (lineIndex: number) => void }) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const pushCodeBlock = (key: string) => {
    nodes.push(
      <pre key={key} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text)]">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
    inCodeBlock = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        pushCodeBlock(`code-${index}`);
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      nodes.push(<div key={index} className="h-2" />);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      nodes.push(<hr key={index} className="border-[var(--border)]" />);
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const tableRows: string[][] = [];
      let rowIndex = index;
      while (rowIndex < lines.length && isMarkdownTableRow(lines[rowIndex])) {
        if (rowIndex !== index + 1) tableRows.push(parseMarkdownTableRow(lines[rowIndex]));
        rowIndex += 1;
      }
      const headerCells = tableRows.shift() ?? [];
      const bodyRows = tableRows;
      nodes.push(
        <div key={`table-${index}`} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--bg-soft)] text-[var(--text)]">
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th key={cellIndex} className="border-b border-[var(--border)] px-3 py-2 font-bold">
                    {renderInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowNumber) => (
                <tr key={rowNumber} className="border-t border-[var(--border)]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-[var(--text-muted)]">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      index = rowIndex - 1;
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={index} className="pt-2 font-display text-3xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(2))}
        </h1>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={index} className="pt-2 font-display text-2xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(3))}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={index} className="pt-2 font-display text-xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(4))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      let quoteIndex = index;
      while (quoteIndex < lines.length && lines[quoteIndex].trim().startsWith(">")) {
        quoteLines.push(lines[quoteIndex].trim().replace(/^>\s?/, ""));
        quoteIndex += 1;
      }
      nodes.push(
        <blockquote key={`quote-${index}`} className="border-l-4 border-[var(--brand-primary)] bg-[var(--bg-soft)] px-4 py-3 text-[var(--text-muted)]">
          {quoteLines.map((quoteLine, quoteLineIndex) => (
            <p key={quoteLineIndex}>{renderInlineMarkdown(quoteLine)}</p>
          ))}
        </blockquote>,
      );
      index = quoteIndex - 1;
      continue;
    }

    const checklistMatch = line.match(/^- \[([ xX])\]\s+(.+)$/);
    if (checklistMatch) {
      const items: Array<{ checked: boolean; text: string; lineIndex: number }> = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^- \[([ xX])\]\s+(.+)$/);
        if (!match) break;
        items.push({ checked: match[1].toLowerCase() === "x", text: match[2], lineIndex: itemIndex });
        itemIndex += 1;
      }
      nodes.push(
        <ul key={`checklist-${index}`} className="space-y-2 pl-1">
          {items.map((item, itemNumber) => (
            <li key={itemNumber} className="flex gap-3 text-[var(--text-muted)]">
              <button
                type="button"
                disabled={!onToggleChecklistLine}
                onClick={() => onToggleChecklistLine?.(item.lineIndex)}
                className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border leading-none transition ${
                  item.checked
                    ? "border-[var(--status-completed-text)] bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]"
                    : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--brand-primary)]"
                } ${onToggleChecklistLine ? "cursor-pointer" : "cursor-default"}`}
                aria-label={item.checked ? "Mark checklist item incomplete" : "Mark checklist item complete"}
              >
                {item.checked ? <Check size={13} strokeWidth={3} /> : ""}
              </button>
              <span>{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ul>,
      );
      index = itemIndex - 1;
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const items: string[] = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^[-*+]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        itemIndex += 1;
      }
      nodes.push(
        <ul key={`list-${index}`} className="list-disc space-y-1 pl-6 text-[var(--text-muted)] marker:text-[var(--brand-primary)]">
          {items.map((item, itemNumber) => (
            <li key={itemNumber}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      index = itemIndex - 1;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items: string[] = [];
      let itemIndex = index;
      while (itemIndex < lines.length) {
        const match = lines[itemIndex].trim().match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        itemIndex += 1;
      }
      nodes.push(
        <ol key={`ordered-${index}`} className="list-decimal space-y-1 pl-6 text-[var(--text-muted)] marker:text-[var(--brand-primary)]">
          {items.map((item, itemNumber) => (
            <li key={itemNumber}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      index = itemIndex - 1;
      continue;
    }

    nodes.push(<p key={index}>{renderInlineMarkdown(line)}</p>);
  }

  if (inCodeBlock && codeLines.length) {
    pushCodeBlock("code-open");
  }

  return <article className="space-y-4 text-base leading-8 text-[var(--text-muted)]">{nodes}</article>;
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = sanitizeMarkdownUrl(linkMatch[2]);
      return href ? (
        <a key={index} className="font-semibold text-[var(--text-brand)] hover:underline" href={href} target="_blank" rel="noreferrer">
          {linkMatch[1]}
        </a>
      ) : (
        <span key={index}>{linkMatch[1]}</span>
      );
    }
    if (/^`[^`]+`$/.test(part)) return <code key={index} className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5 font-mono text-sm text-[var(--text)]">{part.slice(1, -1)}</code>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index} className="font-bold text-[var(--text)]">{part.slice(2, -2)}</strong>;
    if (/^~~[^~]+~~$/.test(part)) return <del key={index}>{part.slice(2, -2)}</del>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    return <span key={index}>{part}</span>;
  });
}

function sanitizeMarkdownUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return parsed.toString();
  } catch {
    return "";
  }
  return "";
}

function isMarkdownTableRow(line: string) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function isMarkdownTableStart(lines: string[], index: number) {
  return isMarkdownTableRow(lines[index] ?? "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "");
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
