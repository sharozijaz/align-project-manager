import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pin,
  Plus,
  Quote,
  Save,
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
import { useConfirm } from "../components/ui/ConfirmProvider";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { ScopedSearchNotice } from "../components/ui/ScopedSearchNotice";
import { Select } from "../components/ui/Select";
import { EmptyState, StudioTextarea } from "../components/studio/StudioForm";
import { useProjectStore } from "../store/projectStore";
import { useSearchStore } from "../store/searchStore";
import { useStudioStore } from "../store/studioStore";
import type { Project } from "../types/project";
import type { HubNote, HubNoteSpace, HubResource, HubResourceType, HubView } from "../types/studio";
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
type NoteFilter = "inbox" | "favorites";
type NoteSpaceSelection = { type: "space" | "project"; id: string };
type NoteSpaceView = {
  key: string;
  type: "space" | "project";
  id: string;
  name: string;
  description?: string;
  projectIds: string[];
  manualNoteIds: string[];
  count: number;
};
type NoteFormState = {
  title: string;
  body: string;
  collection: string;
  tags: string;
  clientVisible: boolean;
  projectIds: string[];
  relatedNoteIds: string[];
  manualSpaceIds: string[];
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
  collection: "",
  tags: "",
  clientVisible: false,
  projectIds: [],
  relatedNoteIds: [],
  manualSpaceIds: [],
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

function normalizeNoteFormForSave(form: NoteFormState) {
  return {
    title: form.title.trim() || "Untitled note",
    body: form.body,
    collection: form.collection.trim(),
    tags: form.tags.trim() || "",
    clientVisible: Boolean(form.clientVisible),
    projectIds: form.projectIds,
    relatedNoteIds: normalizeRelatedNoteIds(form.relatedNoteIds),
  };
}

function normalizeRelatedNoteIds(noteIds: string[]) {
  return [...new Set(noteIds.filter(Boolean))];
}

function getWordCount(body: string) {
  return body.trim() ? body.trim().split(/\s+/).length : 0;
}

function getReadTimeLabel(body: string) {
  const minutes = Math.max(1, Math.ceil(getWordCount(body) / 220));
  return `${minutes} min read`;
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
  const {
    resources,
    notes,
    noteSpaces,
    addResource,
    addNote,
    updateResource,
    updateNote,
    deleteResource,
    deleteNote,
    replaceNotes,
    replaceNoteSpaces,
    addNoteSpace,
    deleteNoteSpace,
    addNoteToSpace,
    removeNoteFromSpace,
  } = useStudioStore();
  const projects = useProjectStore((state) => state.projects);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const confirm = useConfirm();
  const workspaceView = initialView === "notes" ? "notes" : "resources";
  const isNotesWorkspace = workspaceView === "notes";
  const [view, setView] = useState<HubView>(workspaceView);
  const query = useSearchStore((state) => state.query);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const [type, setType] = useState<ResourceFilter>("all");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("inbox");
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<string | null>(null);
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
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [spaceForm, setSpaceForm] = useState({ name: "", description: "" });
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

  const personalSpaces = useMemo(() => buildPersonalSpaceViews(noteSpaces, notes), [noteSpaces, notes]);
  const projectSpaces = useMemo(() => buildProjectSpaceViews(projects, notes), [projects, notes]);
  const selectedSpace = useMemo(
    () => [...personalSpaces, ...projectSpaces].find((space) => space.key === selectedSpaceKey) ?? null,
    [personalSpaces, projectSpaces, selectedSpaceKey],
  );
  const selectedSpaceNoteIds = useMemo(() => (selectedSpace ? getSpaceNoteIds(selectedSpace, notes) : new Set<string>()), [notes, selectedSpace]);

  const filteredNotes = useMemo(
    () =>
      notes
        .filter((note) => {
          const matchesQuery = `${note.title} ${note.collection ?? ""} ${note.tags ?? ""} ${note.body}`.toLowerCase().includes(query.toLowerCase());
          const matchesSpace = !selectedSpace || selectedSpaceNoteIds.has(note.id);
          const matchesFilter = selectedSpace
            ? noteFilter !== "favorites" || Boolean(note.favorite)
            : noteFilter === "favorites"
              ? Boolean(note.favorite)
              : !isFiledInSavedSpaces(note, noteSpaces, projects);
          return matchesQuery && matchesSpace && matchesFilter;
        })
        .sort((left, right) => {
          if (Boolean(left.favorite) !== Boolean(right.favorite)) return left.favorite ? -1 : 1;
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }),
    [noteSpaces, notes, noteFilter, projects, query, selectedSpace, selectedSpaceNoteIds],
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

  const updateNoteWithRelationships = (noteId: string, payload: NoteFormState) => {
    const normalizedPayload = normalizeNoteFormForSave(payload);
    updateNote(noteId, normalizedPayload);
    syncManualSpaceMembership(noteId, payload.manualSpaceIds);
    reconcileRelatedNotes({
      noteId,
      notes,
      relatedNoteIds: normalizedPayload.relatedNoteIds,
      collection: normalizedPayload.collection,
      updateNote,
    });
  };

  const addNoteWithRelationships = (payload: NoteFormState) => {
    const normalizedPayload = normalizeNoteFormForSave(payload);
    const note = addNote(normalizedPayload);
    syncManualSpaceMembership(note.id, payload.manualSpaceIds);
    reconcileRelatedNotes({
      noteId: note.id,
      notes: [note, ...notes],
      relatedNoteIds: normalizedPayload.relatedNoteIds,
      collection: normalizedPayload.collection,
      updateNote,
    });
    return note;
  };

  const syncManualSpaceMembership = (noteId: string, manualSpaceIds: string[]) => {
    const nextSpaceIds = new Set(manualSpaceIds);
    noteSpaces.forEach((space) => {
      const hasNote = space.manualNoteIds.includes(noteId);
      const shouldHaveNote = nextSpaceIds.has(space.id);
      if (shouldHaveNote && !hasNote) addNoteToSpace(space.id, noteId);
      if (!shouldHaveNote && hasNote) removeNoteFromSpace(space.id, noteId);
    });
  };

  const createPersonalSpace = () => {
    setSpaceForm({ name: "", description: "" });
    setSpaceModalOpen(true);
  };

  const savePersonalSpace = (event: FormEvent) => {
    event.preventDefault();
    if (!spaceForm.name.trim()) return;
    const space = addNoteSpace({
      name: spaceForm.name.trim(),
      description: spaceForm.description.trim() || undefined,
      projectIds: [],
      manualNoteIds: [],
    });
    setNoteFilter("inbox");
    setSelectedSpaceKey(spaceKey("space", space.id));
    setSpaceModalOpen(false);
    setSpaceForm({ name: "", description: "" });
  };

  const handleDeleteSpace = async (space: NoteSpaceView) => {
    if (space.type !== "space") return;
    const confirmed = await confirm({
      title: "Delete space?",
      description: `Delete "${space.name}"? Notes stay in your library; only this space grouping is removed.`,
      confirmLabel: "Delete Space",
      tone: "danger",
    });
    if (!confirmed) return;

    deleteNoteSpace(space.id);
    if (selectedSpaceKey === space.key) {
      setSelectedSpaceKey(null);
      setNoteFilter("inbox");
    }
  };

  const handleDeleteProjectDocs = async (space: NoteSpaceView) => {
    if (space.type !== "project") return;
    const confirmed = await confirm({
      title: "Delete project?",
      description: `Move "${space.name}" to Trash? Linked notes stay in your library, but this Project Docs group will disappear.`,
      confirmLabel: "Delete Project",
      tone: "danger",
    });
    if (!confirmed) return;

    deleteProject(space.id);
    if (selectedSpaceKey === space.key) {
      setSelectedSpaceKey(null);
      setNoteFilter("inbox");
    }
  };

  const noteFormForCurrentSpace = () => {
    if (!selectedSpace) return emptyNoteForm;
    return {
      ...emptyNoteForm,
      manualSpaceIds: selectedSpace.type === "space" ? [selectedSpace.id] : [],
      projectIds: selectedSpace.projectIds,
    };
  };

  useEffect(() => {
    if (showForm !== "note") return;

    const hasDraftContent = Boolean(noteForm.title.trim() || noteForm.body.trim() || noteForm.collection.trim() || noteForm.tags.trim() || noteForm.projectIds.length || noteForm.relatedNoteIds.length || noteForm.manualSpaceIds.length);
    if (!hasDraftContent) {
      setNoteAutosaveStatus("");
      return;
    }

    setNoteAutosaveStatus("Saving draft...");
    const timeout = window.setTimeout(() => {
      if (draftNoteId) {
        updateNoteWithRelationships(draftNoteId, noteForm);
        setSelectedNoteId(draftNoteId);
      } else {
        const draft = addNoteWithRelationships(noteForm);
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
      updateNoteWithRelationships(editingNoteId, editNoteForm);
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
    const hasContent = Boolean(noteForm.title.trim() || noteForm.body.trim() || noteForm.collection.trim() || noteForm.tags.trim() || noteForm.projectIds.length || noteForm.relatedNoteIds.length || noteForm.manualSpaceIds.length);
    if (!hasContent) return;

    if (draftNoteId) {
      updateNoteWithRelationships(draftNoteId, noteForm);
      setSelectedNoteId(draftNoteId);
    } else {
      const saved = addNoteWithRelationships(noteForm);
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
    notes.forEach((note) => {
      if (note.relatedNoteIds?.includes(noteId)) {
        updateNote(note.id, { relatedNoteIds: note.relatedNoteIds.filter((relatedNoteId) => relatedNoteId !== noteId) });
      }
    });
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
      collection: note.collection ?? "",
      tags: note.tags ?? "",
      clientVisible: Boolean(note.clientVisible),
      projectIds: note.projectIds ?? [],
      relatedNoteIds: getExplicitRelatedNoteIds(note, notes),
      manualSpaceIds: noteSpaces.filter((space) => space.manualNoteIds.includes(note.id)).map((space) => space.id),
    });
  };

  const saveEditingNote = () => {
    if (!editingNoteId) return;
    updateNoteWithRelationships(editingNoteId, editNoteForm);
    setNoteAutosaveStatus("");
    setEditingNoteId(null);
  };

  const toggleSelectedNoteChecklistLine = (note: HubNote, lineIndex: number) => {
    updateNote(note.id, { body: toggleChecklistLineInMarkdown(note.body, lineIndex) });
  };

  const selectNote = (noteId: string) => {
    if (selectedSpace && !selectedSpaceNoteIds.has(noteId)) setSelectedSpaceKey(null);
    setSelectedNoteId(noteId);
  };

  const exportNotes = (format: "json" | "markdown", scope: "current" | "all") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const exportNotes = scope === "current" && selectedNote ? [selectedNote] : notes;
    const filenameBase =
      scope === "current" && selectedNote
        ? `align-note-${slugifyFilename(selectedNote.title)}`
        : "align-notes";

    if (format === "json") {
      downloadTextFile(`${filenameBase}-${stamp}.json`, exportHubNotesJson(exportNotes, scope === "current" ? [] : noteSpaces), "application/json");
      setExportMenuOpen(false);
      return;
    }

    downloadTextFile(`${filenameBase}-${stamp}.md`, exportHubNotesMarkdown(exportNotes, scope === "current" ? [] : noteSpaces), "text/markdown");
    setExportMenuOpen(false);
  };

  const importNotes = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      const imported = parseHubNotesImport(content, file.name);
      const { notes: mergedNotes, noteSpaces: mergedSpaces, summary } = mergeImportedHubNotes(notes, imported.notes, noteSpaces, imported.noteSpaces);
      replaceNotes(mergedNotes);
      replaceNoteSpaces(mergedSpaces);
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
                    setNoteForm(noteFormForCurrentSpace());
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
      <ScopedSearchNotice
        query={query}
        scope={isNotesWorkspace ? "notes" : "resources"}
        resultCount={isNotesWorkspace ? filteredNotes.length : filteredResources.length}
        onClear={clearQuery}
      />

      <Modal
        title="New space"
        open={spaceModalOpen}
        onClose={() => {
          setSpaceModalOpen(false);
          setSpaceForm({ name: "", description: "" });
        }}
        className="max-w-lg"
      >
        <form onSubmit={savePersonalSpace} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]" htmlFor="note-space-name">
              Name
            </label>
            <Input
              id="note-space-name"
              autoFocus
              value={spaceForm.name}
              onChange={(event) => setSpaceForm((form) => ({ ...form, name: event.target.value }))}
              placeholder="Provider International"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]" htmlFor="note-space-description">
              Description
            </label>
            <StudioTextarea
              id="note-space-description"
              className="min-h-24"
              value={spaceForm.description}
              onChange={(event) => setSpaceForm((form) => ({ ...form, description: event.target.value }))}
              placeholder="Optional context for this documentation space."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSpaceModalOpen(false);
                setSpaceForm({ name: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" icon={<FolderOpen size={15} />} disabled={!spaceForm.name.trim()}>
              Create Space
            </Button>
          </div>
        </form>
      </Modal>

      {view === "resources" ? (
        <Card className="p-2">
          <div className="flex flex-wrap gap-2">
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
        </Card>
      ) : null}

      <div className={`grid gap-5 ${view === "notes" ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "2xl:grid-cols-[minmax(0,1fr)_400px]"}`}>
        {view === "notes" ? (
          <aside className="space-y-4">
            <NoteListPanel
              notes={filteredNotes}
              allNotes={notes}
              personalSpaces={personalSpaces}
              projectSpaces={projectSpaces}
              selectedSpaceKey={selectedSpaceKey}
              projects={projects}
              selectedNote={selectedNote}
              filter={noteFilter}
              onFilterChange={(filter) => {
                setNoteFilter(filter);
                setSelectedSpaceKey(null);
              }}
              onSpaceSelect={(spaceKey) => {
                setNoteFilter("inbox");
                setSelectedSpaceKey(spaceKey);
                const space = [...personalSpaces, ...projectSpaces].find((item) => item.key === spaceKey);
                const firstSpaceNote = space ? sortNotes(notes.filter((note) => getSpaceNoteIds(space, notes).has(note.id)))[0] : null;
                setSelectedNoteId(firstSpaceNote?.id ?? null);
              }}
              onSelectNote={(note) => selectNote(note.id)}
              onCreateSpace={createPersonalSpace}
              onDeleteSpace={handleDeleteSpace}
              onDeleteProjectDocs={handleDeleteProjectDocs}
              onAddNoteToSpace={addNoteToSpace}
              onRemoveNoteFromSpace={removeNoteFromSpace}
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
              allNotes={notes}
              personalSpaces={personalSpaces}
              selectedSpace={selectedSpace}
              selectedNote={selectedNote}
              editingNoteId={editingNoteId}
              editNoteForm={editNoteForm}
              onStartEdit={startEditingNote}
              onCancelEdit={() => setEditingNoteId(null)}
              onSaveEdit={saveEditingNote}
              onEditFormChange={setEditNoteForm}
              onDelete={handleDeleteNote}
              onToggleFavorite={(note) => updateNote(note.id, { favorite: !note.favorite })}
              onAddNoteToSpace={addNoteToSpace}
              onRemoveNoteFromSpace={removeNoteFromSpace}
              onUpdateNoteProjects={(noteId, projectIds) => updateNote(noteId, { projectIds })}
              onToggleChecklistLine={toggleSelectedNoteChecklistLine}
              onSelectNote={selectNote}
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

function sortNotes(notes: HubNote[]) {
  return [...notes].sort((left, right) => {
    if (Boolean(left.favorite) !== Boolean(right.favorite)) return left.favorite ? -1 : 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function spaceKey(type: NoteSpaceSelection["type"], id: string) {
  return `${type}:${id}`;
}

function buildPersonalSpaceViews(spaces: HubNoteSpace[], notes: HubNote[]): NoteSpaceView[] {
  return spaces
    .map((space) => {
      const view: NoteSpaceView = {
        key: spaceKey("space", space.id),
        type: "space",
        id: space.id,
        name: space.name,
        description: space.description,
        projectIds: space.projectIds ?? [],
        manualNoteIds: space.manualNoteIds ?? [],
        count: 0,
      };
      return { ...view, count: getSpaceNoteIds(view, notes).size };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildProjectSpaceViews(projects: Project[], notes: HubNote[]): NoteSpaceView[] {
  return projects
    .filter((project) => !project.deletedAt && project.status !== "archived")
    .map((project) => {
      const view: NoteSpaceView = {
        key: spaceKey("project", project.id),
        type: "project",
        id: project.id,
        name: project.name,
        description: project.description,
        projectIds: [project.id],
        manualNoteIds: [],
        count: 0,
      };
      return { ...view, count: getSpaceNoteIds(view, notes).size };
    })
    .sort((left, right) => Number(right.count > 0) - Number(left.count > 0) || left.name.localeCompare(right.name));
}

function getSpaceNoteIds(space: NoteSpaceView, notes: HubNote[]) {
  const ids = new Set<string>();
  const projectIds = new Set(space.projectIds);

  space.manualNoteIds.forEach((noteId) => ids.add(noteId));
  notes.forEach((note) => {
    if ((note.projectIds ?? []).some((projectId) => projectIds.has(projectId))) ids.add(note.id);
  });

  const seedIds = [...ids];
  seedIds.forEach((noteId) => {
    const note = notes.find((candidate) => candidate.id === noteId);
    if (!note) return;
    getExplicitRelatedNoteIds(note, notes).forEach((relatedNoteId) => ids.add(relatedNoteId));
    getWikiLinkedNoteIds(note.body, notes).forEach((wikiNoteId) => ids.add(wikiNoteId));
    notes.forEach((candidate) => {
      if (candidate.id !== note.id && getWikiLinkedNoteIds(candidate.body, notes).includes(note.id)) ids.add(candidate.id);
    });
  });

  return ids;
}

function isFiledInSavedSpaces(note: HubNote, spaces: HubNoteSpace[], projects: Project[]) {
  if (spaces.some((space) => space.manualNoteIds?.includes(note.id))) return true;
  const activeProjectIds = new Set(projects.filter((project) => !project.deletedAt && project.status !== "archived").map((project) => project.id));
  return (note.projectIds ?? []).some((projectId) => activeProjectIds.has(projectId));
}

function isFiledInSpaceViews(note: HubNote, personalSpaces: NoteSpaceView[], projectSpaces: NoteSpaceView[]) {
  if (personalSpaces.some((space) => space.manualNoteIds.includes(note.id))) return true;
  return projectSpaces.some((space) => (note.projectIds ?? []).some((projectId) => space.projectIds.includes(projectId)));
}

function findNoteByTitle(notes: HubNote[], title: string) {
  const normalizedTitle = title.trim().toLowerCase();
  return notes.find((note) => note.title.trim().toLowerCase() === normalizedTitle) ?? null;
}

function getWikiLinkedNoteIds(body: string, notes: HubNote[]) {
  const ids = new Set<string>();
  const matches = body.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of matches) {
    const note = findNoteByTitle(notes, match[1]);
    if (note) ids.add(note.id);
  }
  return [...ids];
}

function getExplicitRelatedNoteIds(note: HubNote, allNotes: HubNote[]) {
  const relatedIds = new Set(note.relatedNoteIds ?? []);
  allNotes.forEach((candidate) => {
    if (candidate.id !== note.id && candidate.relatedNoteIds?.includes(note.id)) relatedIds.add(candidate.id);
  });
  relatedIds.delete(note.id);
  return [...relatedIds];
}

function getLinkedNoteContext(note: HubNote, allNotes: HubNote[]) {
  const relatedIds = new Set(getExplicitRelatedNoteIds(note, allNotes));
  const wikiIds = new Set(getWikiLinkedNoteIds(note.body, allNotes).filter((noteId) => noteId !== note.id));
  const backlinks = allNotes.filter((candidate) => {
    if (candidate.id === note.id) return false;
    return !relatedIds.has(candidate.id) && getWikiLinkedNoteIds(candidate.body, allNotes).includes(note.id);
  });

  return {
    related: sortNotes(allNotes.filter((candidate) => relatedIds.has(candidate.id) && candidate.id !== note.id)),
    wikiLinks: sortNotes(allNotes.filter((candidate) => wikiIds.has(candidate.id))),
    backlinks: sortNotes(backlinks),
  };
}

function reconcileRelatedNotes({
  noteId,
  notes,
  relatedNoteIds,
  collection,
  updateNote,
}: {
  noteId: string;
  notes: HubNote[];
  relatedNoteIds: string[];
  collection: string;
  updateNote: (id: string, updates: Partial<NoteFormState>) => void;
}) {
  const selectedRelatedIds = new Set(relatedNoteIds.filter((relatedNoteId) => relatedNoteId !== noteId));

  notes.forEach((note) => {
    if (note.id === noteId) return;

    const existingRelatedIds = note.relatedNoteIds ?? [];
    const shouldBeRelated = selectedRelatedIds.has(note.id);
    const hasReciprocalLink = existingRelatedIds.includes(noteId);
    const nextRelatedIds = shouldBeRelated
      ? normalizeRelatedNoteIds([...existingRelatedIds, noteId])
      : existingRelatedIds.filter((relatedNoteId) => relatedNoteId !== noteId);

    const updates: Partial<NoteFormState> = {};
    if (nextRelatedIds.length !== existingRelatedIds.length || nextRelatedIds.some((relatedNoteId, index) => relatedNoteId !== existingRelatedIds[index])) {
      updates.relatedNoteIds = nextRelatedIds;
    }

    if (shouldBeRelated && collection && !note.collection) {
      updates.collection = collection;
    }

    if (!shouldBeRelated && hasReciprocalLink && !updates.relatedNoteIds) {
      updates.relatedNoteIds = nextRelatedIds;
    }

    if (Object.keys(updates).length) updateNote(note.id, updates);
  });
}

function ProjectPicker({ projects, selectedIds, onChange }: { projects: Project[]; selectedIds: string[]; onChange: (projectIds: string[]) => void }) {
  const selectableProjects = projects.filter((project) => project.status === "active" || project.status === "paused" || selectedIds.includes(project.id));

  if (!selectableProjects.length) return null;

  const toggleProject = (projectId: string) => {
    onChange(selectedIds.includes(projectId) ? selectedIds.filter((id) => id !== projectId) : [...selectedIds, projectId]);
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Linked projects</p>
        <span className="text-xs font-semibold text-[var(--text-soft)]">{selectedIds.length} selected</span>
      </div>
      <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
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

function SpacePicker({ spaces, selectedIds, onChange }: { spaces: NoteSpaceView[]; selectedIds: string[]; onChange: (spaceIds: string[]) => void }) {
  if (!spaces.length) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Spaces</p>
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Create a personal space from the left Library panel, then add notes here.</p>
      </div>
    );
  }

  const selectedSet = new Set(selectedIds);
  const toggleSpace = (spaceId: string) => {
    onChange(selectedSet.has(spaceId) ? selectedIds.filter((id) => id !== spaceId) : [...selectedIds, spaceId]);
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Spaces</p>
        <span className="text-xs font-semibold text-[var(--text-soft)]">{selectedIds.length} selected</span>
      </div>
      <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {spaces.map((space) => {
          const selected = selectedSet.has(space.id);
          return (
            <button
              key={space.id}
              type="button"
              onClick={() => toggleSpace(space.id)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
            >
              <FolderOpen size={13} />
              <span className="truncate">{space.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RelatedNotesPicker({
  notes,
  currentNoteId,
  selectedIds,
  onChange,
}: {
  notes: HubNote[];
  currentNoteId?: string;
  selectedIds: string[];
  onChange: (noteIds: string[]) => void;
}) {
  const selectableNotes = notes.filter((note) => note.id !== currentNoteId);
  if (!selectableNotes.length) return null;

  const selectedSet = new Set(selectedIds);
  const toggleNote = (noteId: string) => {
    onChange(selectedSet.has(noteId) ? selectedIds.filter((id) => id !== noteId) : [...selectedIds, noteId]);
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Related notes</p>
        <span className="text-xs font-semibold text-[var(--text-soft)]">{selectedIds.length} selected</span>
      </div>
      <div className="mt-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {selectableNotes.map((note) => {
          const selected = selectedSet.has(note.id);
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => toggleNote(note.id)}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
            >
              <Link2 size={13} />
              <span className="truncate">{note.title}</span>
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
      className={`flex h-full items-start gap-3 rounded-[var(--radius-sm)] border p-3 text-left text-sm transition ${
        checked
          ? "border-[var(--brand-primary)] bg-[var(--button-secondary-hover)] text-[var(--text)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-primary)]">
        <Eye size={16} />
      </span>
      <span>
        <span className="block font-bold text-[var(--text)]">{checked ? "Client-visible" : "Private"}</span>
        <span className="mt-1 block text-xs leading-5">
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
  personalSpaces,
  projectSpaces,
  selectedSpaceKey,
  projects,
  selectedNote,
  filter,
  onFilterChange,
  onSpaceSelect,
  onSelectNote,
  onCreateSpace,
  onDeleteSpace,
  onDeleteProjectDocs,
  onAddNoteToSpace,
  onRemoveNoteFromSpace,
}: {
  notes: HubNote[];
  allNotes: HubNote[];
  personalSpaces: NoteSpaceView[];
  projectSpaces: NoteSpaceView[];
  selectedSpaceKey: string | null;
  projects: Project[];
  selectedNote: HubNote | null;
  filter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
  onSpaceSelect: (spaceKey: string) => void;
  onSelectNote: (note: HubNote) => void;
  onCreateSpace: () => void;
  onDeleteSpace: (space: NoteSpaceView) => void;
  onDeleteProjectDocs: (space: NoteSpaceView) => void;
  onAddNoteToSpace: (spaceId: string, noteId: string) => void;
  onRemoveNoteFromSpace: (spaceId: string, noteId: string) => void;
}) {
  const projectLookup = new Map(projects.map((project) => [project.id, project]));
  const favoriteCount = allNotes.filter((note) => note.favorite).length;
  const unfiledCount = allNotes.filter((note) => !isFiledInSpaceViews(note, personalSpaces, projectSpaces)).length;
  const selectedManualSpace = selectedSpaceKey?.startsWith("space:") ? personalSpaces.find((space) => space.key === selectedSpaceKey) : null;
  const visibleProjectSpaces = projectSpaces.filter((space) => space.count > 0 || space.key === selectedSpaceKey).slice(0, 6);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-[var(--text)]">Library</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{allNotes.length} notes · {personalSpaces.length + projectSpaces.length} spaces</p>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Views</p>
          <div className="grid gap-0.5">
            <NoteTreeButton active={!selectedSpaceKey && filter === "inbox"} icon={<FolderOpen size={15} />} label="Inbox" count={unfiledCount} onClick={() => onFilterChange("inbox")} />
            <NoteTreeButton active={!selectedSpaceKey && filter === "favorites"} icon={<Star size={15} />} label="Favorites" count={favoriteCount} onClick={() => onFilterChange("favorites")} />
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Spaces</p>
            <button type="button" className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] text-[var(--text-soft)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]" onClick={onCreateSpace} title="New space">
              <Plus size={15} />
            </button>
          </div>
          <div className="grid gap-0.5">
            {personalSpaces.length ? personalSpaces.map((space) => (
              <SpaceTreeButton
                key={space.key}
                space={space}
                active={selectedSpaceKey === space.key}
                onClick={() => onSpaceSelect(space.key)}
                onDelete={() => onDeleteSpace(space)}
                deleteLabel={`Delete ${space.name}`}
              />
            )) : (
              <button
                type="button"
                onClick={onCreateSpace}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
              >
                <Plus size={14} className="text-[var(--text-soft)]" />
                New personal space
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Project Docs</p>
          <div className="grid gap-0.5">
            {visibleProjectSpaces.length ? visibleProjectSpaces.map((space) => (
              <SpaceTreeButton
                key={space.key}
                space={space}
                active={selectedSpaceKey === space.key}
                onClick={() => onSpaceSelect(space.key)}
                onDelete={() => onDeleteProjectDocs(space)}
                deleteLabel={`Delete project ${space.name}`}
              />
            )) : (
              <p className="rounded-[var(--radius-sm)] px-2 py-1.5 text-xs leading-5 text-[var(--text-soft)]">Link a note to a project to create project docs.</p>
            )}
          </div>
        </div>
      </div>
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">{selectedSpaceKey ? "Space Notes" : filter === "favorites" ? "Favorites" : "Inbox"}</p>
          <span className="text-xs font-semibold text-[var(--text-soft)]">{notes.length}</span>
        </div>
      </div>
      <div className="max-h-[calc(100vh-28rem)] overflow-y-auto p-2">
        {!notes.length ? <EmptyState>No matching notes yet.</EmptyState> : null}
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelectNote(note)}
            className={`mb-2 block w-full rounded-[var(--radius-sm)] border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 ${
              selectedNote?.id === note.id
                ? "border-[var(--brand-primary)] bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--brand-primary),var(--shadow-sm)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-1 text-sm font-bold text-[var(--text)]">{note.title}</h3>
              <Pin size={15} className={note.favorite ? "shrink-0 fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "shrink-0 text-[var(--text-soft)]"} />
            </div>
            {note.body ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{note.body.replace(/[#>*_`[\]-]/g, " ").replace(/\s+/g, " ").trim()}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
              {note.collection ? <Badge tone="slate">{note.collection}</Badge> : null}
            </div>
            {selectedManualSpace ? (
              <div className="mt-3 border-t border-[var(--border)] pt-2">
                {selectedManualSpace.manualNoteIds.includes(note.id) ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveNoteFromSpace(selectedManualSpace.id, note.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveNoteFromSpace(selectedManualSpace.id, note.id);
                    }}
                    className="inline-flex rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  >
                    Remove from space
                  </span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddNoteToSpace(selectedManualSpace.id, note.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onAddNoteToSpace(selectedManualSpace.id, note.id);
                    }}
                    className="inline-flex rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold text-[var(--text-brand)] transition hover:bg-[var(--button-secondary-hover)]"
                  >
                    Add to space
                  </span>
                )}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </Card>
  );
}

function SpaceTreeButton({
  space,
  active,
  onClick,
  onDelete,
  deleteLabel,
}: {
  space: NoteSpaceView;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div
      className={`group relative flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition ${
        active ? "bg-[var(--surface-hover)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      }`}
    >
      {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-primary)]" /> : null}
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {active ? <ChevronDown size={14} className="text-[var(--brand-primary)]" /> : <ChevronRight size={14} className="text-[var(--text-soft)] group-hover:text-[var(--text-muted)]" />}
        <Folder size={14} className={active ? "text-[var(--brand-primary)]" : "text-[var(--text-soft)] group-hover:text-[var(--text-muted)]"} />
        <span className="min-w-0 flex-1 truncate font-medium" title={space.name}>{space.name}</span>
      </button>
      <span className="shrink-0 text-xs text-[var(--text-soft)]">{space.count}</span>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--text-soft)] transition hover:bg-[var(--priority-high-bg)] hover:text-[var(--priority-high-text)] focus:bg-[var(--priority-high-bg)] focus:text-[var(--priority-high-text)] ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
          aria-label={deleteLabel ?? `Delete ${space.name}`}
          title={deleteLabel ?? `Delete ${space.name}`}
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
}

function NoteTreeButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition ${
        active
          ? "bg-[var(--surface-hover)] text-[var(--text)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      }`}
    >
      {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-primary)]" /> : null}
      <span className={active ? "text-[var(--brand-primary)]" : "text-[var(--text-soft)] group-hover:text-[var(--text-muted)]"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <span className="shrink-0 text-xs text-[var(--text-soft)]">{count}</span>
    </button>
  );
}

function NotesWorkspace({
  projects,
  allNotes,
  personalSpaces,
  selectedSpace,
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
  onAddNoteToSpace,
  onRemoveNoteFromSpace,
  onUpdateNoteProjects,
  onToggleChecklistLine,
  onSelectNote,
}: {
  projects: Project[];
  allNotes: HubNote[];
  personalSpaces: NoteSpaceView[];
  selectedSpace: NoteSpaceView | null;
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
  onAddNoteToSpace: (spaceId: string, noteId: string) => void;
  onRemoveNoteFromSpace: (spaceId: string, noteId: string) => void;
  onUpdateNoteProjects: (noteId: string, projectIds: string[]) => void;
  onToggleChecklistLine: (note: HubNote, lineIndex: number) => void;
  onSelectNote: (noteId: string) => void;
}) {
  const isEditing = selectedNote ? editingNoteId === selectedNote.id : false;
  const projectLookup = new Map(projects.map((project) => [project.id, project]));
  const selectedProjects = selectedNote?.projectIds?.map((projectId) => projectLookup.get(projectId)).filter(isProject);
  const linkedContext = selectedNote ? getLinkedNoteContext(selectedNote, allNotes) : { related: [], backlinks: [], wikiLinks: [] };
  const [quickOrganizeOpen, setQuickOrganizeOpen] = useState(false);
  const selectedNoteSpaceIds = selectedNote ? personalSpaces.filter((space) => space.manualNoteIds.includes(selectedNote.id)).map((space) => space.id) : [];

  useEffect(() => {
    setQuickOrganizeOpen(false);
  }, [selectedNote?.id, isEditing]);

  const updateQuickSpaces = (manualSpaceIds: string[]) => {
    if (!selectedNote) return;
    const nextSpaceIds = new Set(manualSpaceIds);
    personalSpaces.forEach((space) => {
      const hasNote = space.manualNoteIds.includes(selectedNote.id);
      const shouldHaveNote = nextSpaceIds.has(space.id);
      if (shouldHaveNote && !hasNote) onAddNoteToSpace(space.id, selectedNote.id);
      if (!shouldHaveNote && hasNote) onRemoveNoteFromSpace(space.id, selectedNote.id);
    });
  };

  const updateQuickProjects = (projectIds: string[]) => {
    if (!selectedNote) return;
    onUpdateNoteProjects(selectedNote.id, projectIds);
  };

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
            <div className="grid flex-1 gap-5 p-5 lg:p-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <FieldBlock label="Title">
                  <Input value={noteForm.title} onChange={(event) => onNoteFormChange({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                </FieldBlock>
                <FieldBlock label="Tags">
                  <Input value={noteForm.tags} onChange={(event) => onNoteFormChange({ ...noteForm, tags: event.target.value })} placeholder="Services, UX, handoff" />
                </FieldBlock>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <div className="mb-3 flex w-full items-center justify-between gap-3 text-left">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    <FolderOpen size={14} />
                    Organize
                  </p>
                  <span className="text-xs font-semibold text-[var(--text-soft)]">Projects, related notes, visibility</span>
                </div>
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <SpacePicker spaces={personalSpaces} selectedIds={noteForm.manualSpaceIds} onChange={(manualSpaceIds) => onNoteFormChange({ ...noteForm, manualSpaceIds })} />
                  <ClientVisibilityToggle
                    checked={noteForm.clientVisible}
                    onChange={(clientVisible) => onNoteFormChange({ ...noteForm, clientVisible })}
                  />
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  <ProjectPicker projects={projects} selectedIds={noteForm.projectIds} onChange={(projectIds) => onNoteFormChange({ ...noteForm, projectIds })} />
                  <RelatedNotesPicker notes={allNotes} selectedIds={noteForm.relatedNoteIds} onChange={(relatedNoteIds) => onNoteFormChange({ ...noteForm, relatedNoteIds })} />
                </div>
              </div>
              <MarkdownEditor value={noteForm.body} onChange={(body) => onNoteFormChange({ ...noteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
            </div>
          </div>
        ) : selectedNote ? (
          <div className="flex h-full min-h-[760px] flex-col">
            <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4 lg:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-soft)]">
                    <span className="inline-flex items-center gap-1.5"><FolderOpen size={14} />{selectedSpace?.name || selectedNote.collection || "Notes"}</span>
                    <ChevronRight size={13} />
                    <span className="truncate">{selectedNote.title}</span>
                  </div>
                  <h2 className="mt-3 max-w-4xl font-display text-2xl font-bold leading-tight text-[var(--text)]">{selectedNote.title}</h2>
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
                    <p>{getWordCount(selectedNote.body)} words · {getReadTimeLabel(selectedNote.body)}</p>
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
                        <Button type="button" variant="secondary" className="px-3" icon={<Pin size={15} />} onClick={() => onToggleFavorite(selectedNote)}>
                          {selectedNote.favorite ? "Pinned" : "Pin"}
                        </Button>
                        <Button type="button" variant="secondary" className="px-3" icon={<FolderOpen size={15} />} onClick={() => setQuickOrganizeOpen((open) => !open)}>
                          Organize
                        </Button>
                        <Button type="button" className="px-3" icon={<Edit3 size={15} />} onClick={() => onStartEdit(selectedNote)}>
                          Edit
                        </Button>
                        <Button type="button" variant="danger" className="px-3" icon={<Trash2 size={15} />} onClick={() => onDelete(selectedNote.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedNote && quickOrganizeOpen && !isEditing ? (
              <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4 lg:px-8">
                <div className="grid gap-3 xl:grid-cols-2">
                  <SpacePicker spaces={personalSpaces} selectedIds={selectedNoteSpaceIds} onChange={updateQuickSpaces} />
                  <ProjectPicker projects={projects} selectedIds={selectedNote.projectIds ?? []} onChange={updateQuickProjects} />
                </div>
              </div>
            ) : null}

            {isEditing ? (
              <div className="grid flex-1 gap-5 p-5 lg:p-6">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <FieldBlock label="Title">
                    <Input value={editNoteForm.title} onChange={(event) => onEditFormChange({ ...editNoteForm, title: event.target.value })} placeholder="Note title" />
                  </FieldBlock>
                  <FieldBlock label="Tags">
                    <Input value={editNoteForm.tags} onChange={(event) => onEditFormChange({ ...editNoteForm, tags: event.target.value })} placeholder="Services, UX, handoff" />
                  </FieldBlock>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                  <div className="mb-3 flex w-full items-center justify-between gap-3 text-left">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      <FolderOpen size={14} />
                      Organize
                    </p>
                    <span className="text-xs font-semibold text-[var(--text-soft)]">{autosaveStatus || "Projects, related notes, visibility"}</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <SpacePicker spaces={personalSpaces} selectedIds={editNoteForm.manualSpaceIds} onChange={(manualSpaceIds) => onEditFormChange({ ...editNoteForm, manualSpaceIds })} />
                    <ClientVisibilityToggle
                      checked={editNoteForm.clientVisible}
                      onChange={(clientVisible) => onEditFormChange({ ...editNoteForm, clientVisible })}
                    />
                  </div>
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    <ProjectPicker projects={projects} selectedIds={editNoteForm.projectIds} onChange={(projectIds) => onEditFormChange({ ...editNoteForm, projectIds })} />
                    <RelatedNotesPicker notes={allNotes} currentNoteId={selectedNote.id} selectedIds={editNoteForm.relatedNoteIds} onChange={(relatedNoteIds) => onEditFormChange({ ...editNoteForm, relatedNoteIds })} />
                  </div>
                </div>
                <MarkdownEditor value={editNoteForm.body} onChange={(body) => onEditFormChange({ ...editNoteForm, body })} previewOpen={previewOpen} onTogglePreview={onTogglePreview} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-[var(--surface)] p-5 lg:p-8">
                <div className="min-h-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-sm)] lg:px-12 lg:py-10">
                  <NoteReader body={selectedNote.body} allNotes={allNotes} onOpenNote={onSelectNote} onToggleChecklistLine={(lineIndex) => onToggleChecklistLine(selectedNote, lineIndex)} />
                  <CompactLinkedNotes notes={[...linkedContext.related, ...linkedContext.wikiLinks, ...linkedContext.backlinks]} onSelectNote={onSelectNote} />
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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
        <h2 className="mt-1 truncate font-display text-xl font-bold text-[var(--text)]">{title}</h2>
        {meta ? <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{meta}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</span>
      {children}
    </label>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--button-primary-text)] shadow-[var(--shadow-sm)]" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
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
        <div className="mb-4 flex h-32 flex-col justify-between overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
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
    ? "flex min-h-44 flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-5"
    : "flex min-h-48 flex-col justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-5";

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

function CompactLinkedNotes({ notes, onSelectNote }: { notes: HubNote[]; onSelectNote: (noteId: string) => void }) {
  const uniqueNotes = [...new Map(notes.map((note) => [note.id, note])).values()];
  if (!uniqueNotes.length) return null;

  return (
    <section className="mt-8 border-t border-[var(--border)] pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          <Link2 size={14} />
          Connected notes
        </p>
        <Badge tone="slate">{uniqueNotes.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueNotes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelectNote(note.id)}
            className="inline-flex max-w-full items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <FileText size={14} />
            <span className="truncate">{note.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function NoteReader({
  body,
  allNotes = [],
  onOpenNote,
  onToggleChecklistLine,
}: {
  body: string;
  allNotes?: HubNote[];
  onOpenNote?: (noteId: string) => void;
  onToggleChecklistLine?: (lineIndex: number) => void;
}) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;
  const inlineOptions = { notes: allNotes, onOpenNote };

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
                    {renderInlineMarkdown(cell, inlineOptions)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowNumber) => (
                <tr key={rowNumber} className="border-t border-[var(--border)]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-[var(--text-muted)]">
                      {renderInlineMarkdown(cell, inlineOptions)}
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
          {renderInlineMarkdown(line.slice(2), inlineOptions)}
        </h1>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={index} className="pt-2 font-display text-2xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(3), inlineOptions)}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={index} className="pt-2 font-display text-xl font-bold leading-tight text-[var(--text)]">
          {renderInlineMarkdown(line.slice(4), inlineOptions)}
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
            <p key={quoteLineIndex}>{renderInlineMarkdown(quoteLine, inlineOptions)}</p>
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
              <span>{renderInlineMarkdown(item.text, inlineOptions)}</span>
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
            <li key={itemNumber}>{renderInlineMarkdown(item, inlineOptions)}</li>
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
            <li key={itemNumber}>{renderInlineMarkdown(item, inlineOptions)}</li>
          ))}
        </ol>,
      );
      index = itemIndex - 1;
      continue;
    }

    nodes.push(<p key={index}>{renderInlineMarkdown(line, inlineOptions)}</p>);
  }

  if (inCodeBlock && codeLines.length) {
    pushCodeBlock("code-open");
  }

  return <article className="space-y-4 text-base leading-8 text-[var(--text-muted)]">{nodes}</article>;
}

type InlineMarkdownOptions = {
  notes?: HubNote[];
  onOpenNote?: (noteId: string) => void;
};

function renderInlineMarkdown(value: string, options: InlineMarkdownOptions = {}) {
  const parts = value.split(/(\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const wikiMatch = part.match(/^\[\[([^\]]+)\]\]$/);
    if (wikiMatch) {
      const title = wikiMatch[1].trim();
      const linkedNote = findNoteByTitle(options.notes ?? [], title);
      return linkedNote && options.onOpenNote ? (
        <button
          key={index}
          type="button"
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] px-1.5 py-0.5 font-semibold text-[var(--text-brand)] hover:underline"
          onClick={() => options.onOpenNote?.(linkedNote.id)}
        >
          <Link2 size={13} />
          {title}
        </button>
      ) : (
        <span key={index}>{part}</span>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = sanitizeMarkdownUrl(linkMatch[2]);
      return href ? (
        <a key={index} className="font-semibold text-[var(--text-brand)] hover:underline" href={href} target="_blank" rel="noopener noreferrer">
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
