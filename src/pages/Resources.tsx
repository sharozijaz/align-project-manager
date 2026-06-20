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
  Palette,
  Pin,
  Plus,
  Quote,
  Save,
  Search,
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
import { useSnippetStore } from "../store/snippetStore";
import { useStudioStore } from "../store/studioStore";
import type { Project } from "../types/project";
import type { HubNote, HubNoteDocStatus, HubNoteDocType, HubNoteSpace, HubPalette, HubResource, HubResourceType, HubSnippet, HubSnippetType, HubView } from "../types/studio";
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
type ResourceSort = "newest" | "title" | "favorites" | "collection";
type MetadataStatus = "idle" | "loading" | "success" | "fallback" | "error";
type NoteFilter = "all" | "inbox" | "favorites" | "review" | "archived";
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
  docType: HubNoteDocType;
  docStatus: HubNoteDocStatus;
  projectIds: string[];
  relatedNoteIds: string[];
  manualSpaceIds: string[];
};

type PaletteFormState = {
  name: string;
  tags: string;
  projectIds: string[];
  noteIds: string[];
  colors: Array<{ id: string; name: string; hex: string; role: string }>;
};

type SnippetFormState = {
  title: string;
  type: HubSnippetType;
  body: string;
  tags: string;
};

const emptyResourceForm: ResourceFormState = {
  title: "",
  url: "",
  type: "inspiration",
  collection: "",
  tags: "",
  notes: "",
};

const emptySnippetForm: SnippetFormState = {
  title: "",
  type: "general",
  body: "",
  tags: "",
};

const emptyNoteForm: NoteFormState = {
  title: "",
  body: "",
  collection: "",
  tags: "",
  clientVisible: false,
  docType: "general",
  docStatus: "active",
  projectIds: [],
  relatedNoteIds: [],
  manualSpaceIds: [],
};

const noteDocTypeOptions: Array<{ value: HubNoteDocType; label: string; templateTitle: string }> = [
  { value: "general", label: "General", templateTitle: "General Note" },
  { value: "brief", label: "Brief", templateTitle: "Project Brief" },
  { value: "strategy", label: "Strategy", templateTitle: "Strategy Plan" },
  { value: "research", label: "Research", templateTitle: "Research Notes" },
  { value: "palette", label: "Palette", templateTitle: "Color Palette" },
  { value: "meeting", label: "Meeting", templateTitle: "Meeting Notes" },
  { value: "prompt", label: "Prompt", templateTitle: "Prompt Library" },
  { value: "checklist", label: "Checklist", templateTitle: "Checklist" },
  { value: "reference", label: "Reference", templateTitle: "Reference" },
];

const noteDocStatusOptions: Array<{ value: HubNoteDocStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "review", label: "Needs Review" },
  { value: "archived", label: "Archived" },
];

const emptyPaletteForm: PaletteFormState = {
  name: "",
  tags: "",
  projectIds: [],
  noteIds: [],
  colors: [
    { id: "color-1", name: "Primary", hex: "#1C1C1C", role: "Base" },
    { id: "color-2", name: "Text", hex: "#E5E5E5", role: "Foreground" },
    { id: "color-3", name: "Subtle", hex: "#A1A1A1", role: "Muted" },
  ],
};

function docTypeLabel(value?: HubNoteDocType) {
  return noteDocTypeOptions.find((option) => option.value === (value ?? "general"))?.label ?? "General";
}

function docStatusLabel(value?: HubNoteDocStatus) {
  return noteDocStatusOptions.find((option) => option.value === (value ?? "active"))?.label ?? "Active";
}

function noteFilterLabel(value: NoteFilter) {
  if (value === "favorites") return "Pinned Docs";
  if (value === "review") return "Needs Review";
  if (value === "archived") return "Archived Docs";
  if (value === "inbox") return "Unfiled Docs";
  return "All Docs";
}

function normalizeResourceUrl(url?: string) {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
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

function getDirectFavicon(url?: string) {
  const normalized = normalizeResourceUrl(url);
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    return `${parsed.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

function titleFromUrl(url?: string) {
  const host = getResourceHost(url);
  if (!host) return "";
  return host
    .split(".")[0]
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ResourceMetadata = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  faviconUrl?: string;
};

function buildFallbackResourceMetadata(url: string, form: ResourceFormState): ResourceMetadata {
  const host = getResourceHost(url);
  return {
    title: form.title.trim() || titleFromUrl(url),
    description: form.notes.trim() || (host ? `Saved reference from ${host}.` : ""),
    canonicalUrl: url,
    faviconUrl: getDirectFavicon(url),
  };
}

async function fetchResourceMetadata(url: string): Promise<ResourceMetadata> {
  const response = await fetch(url, { method: "GET", mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error("Could not fetch page metadata.");
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html.slice(0, 250_000), "text/html");
  const title =
    getMetaContent(doc, "meta[property='og:title']") ||
    getMetaContent(doc, "meta[name='twitter:title']") ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";
  const description =
    getMetaContent(doc, "meta[property='og:description']") ||
    getMetaContent(doc, "meta[name='description']") ||
    getMetaContent(doc, "meta[name='twitter:description']") ||
    "";
  const canonicalUrl = (doc.querySelector("link[rel='canonical']") as HTMLLinkElement | null)?.href || url;
  const faviconUrl =
    (doc.querySelector("link[rel='icon']") as HTMLLinkElement | null)?.href ||
    (doc.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null)?.href ||
    getDirectFavicon(url);

  return { title, description, canonicalUrl, faviconUrl };
}

function getMetaContent(doc: Document, selector: string) {
  return (doc.querySelector(selector) as HTMLMetaElement | null)?.content?.trim() ?? "";
}

function mergeResourceMetadata(form: ResourceFormState, fallback: ResourceMetadata, metadata: ResourceMetadata | null): ResourceFormState {
  const next = metadata ?? fallback;
  const nextTitle = form.title.trim() || next.title || fallback.title || "";
  const nextUrl = normalizeResourceUrl(next.canonicalUrl) || normalizeResourceUrl(form.url) || form.url;
  const nextNotes = form.notes.trim() || next.description || fallback.description || "";
  const inferredType = form.type === emptyResourceForm.type ? inferResourceType(`${nextTitle} ${nextUrl} ${nextNotes}`) : form.type;

  return {
    ...form,
    title: nextTitle,
    url: nextUrl ?? form.url,
    type: inferredType,
    notes: nextNotes,
    tags: form.tags || buildSuggestedTags({ ...form, title: nextTitle, url: nextUrl ?? form.url, notes: nextNotes }).slice(0, 3).join(", "),
  };
}

function inferResourceType(value: string): HubResourceType {
  const text = value.toLowerCase();
  if (/(inspiration|gallery|showcase|example|pattern|design)/.test(text)) return "inspiration";
  if (/(tool|generator|app|utility|checker|audit|remove|compress)/.test(text)) return "tools";
  if (/(asset|icon|font|photo|image|mockup|illustration)/.test(text)) return "assets";
  if (/(snippet|code|css|react|tailwind|component)/.test(text)) return "snippets";
  return "learning";
}

function buildSuggestedTags(form: ResourceFormState) {
  const text = `${form.title} ${form.url} ${form.notes}`.toLowerCase();
  const tags = new Set<string>();
  const rules: Array<[RegExp, string]> = [
    [/color|palette|hue|gradient/, "color"],
    [/type|font|typography/, "typography"],
    [/landing|saas|homepage/, "landing-page"],
    [/seo|keyword|search/, "seo"],
    [/ai|generator|prompt/, "ai"],
    [/image|photo|background|remove/, "image"],
    [/icon|svg/, "icons"],
    [/component|react|tailwind|css/, "frontend"],
    [/checklist|audit/, "checklist"],
    [/copy|writing|headline/, "copywriting"],
  ];
  rules.forEach(([pattern, tag]) => {
    if (pattern.test(text)) tags.add(tag);
  });
  return [...tags].filter((tag) => !form.tags.toLowerCase().split(",").map((item) => item.trim()).includes(tag));
}

function appendTag(tags: string, tag: string) {
  const existing = tags.split(",").map((item) => item.trim()).filter(Boolean);
  if (existing.map((item) => item.toLowerCase()).includes(tag.toLowerCase())) return tags;
  return [...existing, tag].join(", ");
}

function sortResources(resources: HubResource[], sort: ResourceSort) {
  return [...resources].sort((left, right) => {
    if (sort === "favorites" && Boolean(left.favorite) !== Boolean(right.favorite)) return left.favorite ? -1 : 1;
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "collection") return (left.collection ?? "zzzz").localeCompare(right.collection ?? "zzzz") || left.title.localeCompare(right.title);
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
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
    docType: form.docType,
    docStatus: form.docStatus,
    projectIds: form.projectIds,
    relatedNoteIds: normalizeRelatedNoteIds(form.relatedNoteIds),
  };
}

function normalizeRelatedNoteIds(noteIds: string[]) {
  return [...new Set(noteIds.filter(Boolean))];
}

function normalizeHexInput(value: string) {
  const raw = value.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return withHash.toUpperCase();
}

function getWordCount(body: string) {
  return body.trim() ? body.trim().split(/\s+/).length : 0;
}

function getReadTimeLabel(body: string) {
  const minutes = Math.max(1, Math.ceil(getWordCount(body) / 220));
  return `${minutes} min read`;
}

function getDocumentTemplate(type: HubNoteDocType) {
  if (type === "brief") return "# Project Brief\n\n## Goal\n\n## Audience\n\n## Scope\n\n## Success Criteria\n\n## Open Questions\n";
  if (type === "strategy") return "# Strategy Plan\n\n## Objective\n\n## Positioning\n\n## Priorities\n\n## Risks\n\n## Next Moves\n";
  if (type === "research") return "# Research Notes\n\n## Sources\n\n## Findings\n\n## Patterns\n\n## Decisions\n";
  if (type === "palette") return "# Color Palette\n\n## Direction\n\n```align-palette\nPalette Name\nPrimary | #1C1C1C | Base\nText | #E5E5E5 | Foreground\nSubtle | #A1A1A1 | Muted\n```\n";
  if (type === "meeting") return "# Meeting Notes\n\n## Agenda\n\n## Decisions\n\n## Actions\n\n- [ ] \n";
  if (type === "prompt") return "# Prompt\n\n## Context\n\n## Prompt\n\n## Expected Output\n\n## Notes\n";
  if (type === "checklist") return "# Checklist\n\n- [ ] First item\n- [ ] Second item\n";
  if (type === "reference") return "# Reference\n\n## Link\n\n## Summary\n\n## Useful Details\n";
  return "# Note\n\n";
}

function getMarkdownHeadings(body: string) {
  return body
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      return match ? { level: match[1].length, title: match[2].trim(), line: index + 1 } : null;
    })
    .filter((heading): heading is { level: number; title: string; line: number } => Boolean(heading));
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
    palettes,
    addResource,
    addNote,
    addPalette,
    updateResource,
    updateNote,
    deleteResource,
    deleteNote,
    deletePalette,
    replaceNotes,
    replaceNoteSpaces,
    replacePalettes,
    addNoteSpace,
    deleteNoteSpace,
    addNoteToSpace,
    removeNoteFromSpace,
  } = useStudioStore();
  const { snippets, addSnippet, updateSnippet, deleteSnippet } = useSnippetStore();
  const projects = useProjectStore((state) => state.projects);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const confirm = useConfirm();
  const workspaceView = initialView === "notes" ? "notes" : "resources";
  const isNotesWorkspace = workspaceView === "notes";
  const [view, setView] = useState<HubView>(workspaceView);
  const query = useSearchStore((state) => state.query);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const [type, setType] = useState<ResourceFilter>("all");
  const [resourceSort, setResourceSort] = useState<ResourceSort>("newest");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [docTypeFilter, setDocTypeFilter] = useState<HubNoteDocType | "all">("all");
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
  const [resourceCaptureExpanded, setResourceCaptureExpanded] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState<MetadataStatus>("idle");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [noteForm, setNoteForm] = useState<NoteFormState>(emptyNoteForm);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [spaceForm, setSpaceForm] = useState({ name: "", description: "" });
  const [importMessage, setImportMessage] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [notePreviewOpen, setNotePreviewOpen] = useState(false);
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);
  const [paletteForm, setPaletteForm] = useState<PaletteFormState>(emptyPaletteForm);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [snippetForm, setSnippetForm] = useState<SnippetFormState>(emptySnippetForm);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
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
      sortResources(
        resources.filter((item) => {
          const haystack = `${item.title} ${item.url ?? ""} ${item.collection ?? ""} ${item.tags ?? ""} ${item.notes ?? ""}`.toLowerCase();
          const matchesFilter = type === "all" || (type === "favorites" ? item.favorite : item.type === type);
          const matchesCollection = collectionFilter === "all" || (item.collection ?? "") === collectionFilter;
          return matchesFilter && matchesCollection && haystack.includes(query.toLowerCase());
        }),
        resourceSort,
      ),
    [collectionFilter, query, resourceSort, resources, type],
  );

  const resourceCollections = useMemo(
    () =>
      [...new Set(resources.map((item) => item.collection?.trim()).filter((collection): collection is string => Boolean(collection)))]
        .sort((left, right) => left.localeCompare(right)),
    [resources],
  );

  const duplicateResource = useMemo(() => {
    const normalizedUrl = normalizeResourceUrl(resourceForm.url);
    if (!normalizedUrl) return null;
    return resources.find((item) => item.url && normalizeResourceUrl(item.url) === normalizedUrl) ?? null;
  }, [resourceForm.url, resources]);

  const suggestedTags = useMemo(() => buildSuggestedTags(resourceForm), [resourceForm]);

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
          const matchesQuery = `${note.title} ${note.collection ?? ""} ${note.tags ?? ""} ${note.body} ${note.docType ?? ""} ${note.docStatus ?? ""}`.toLowerCase().includes(query.toLowerCase());
          const matchesSpace = !selectedSpace || selectedSpaceNoteIds.has(note.id);
          const matchesType = docTypeFilter === "all" || (note.docType ?? "general") === docTypeFilter;
          const matchesFilter =
            noteFilter === "all"
              ? true
              : noteFilter === "favorites"
                ? Boolean(note.favorite)
                : noteFilter === "review"
                  ? (note.docStatus ?? "active") === "review"
                  : noteFilter === "archived"
                    ? (note.docStatus ?? "active") === "archived"
                    : selectedSpace
                      ? true
                      : !isFiledInSavedSpaces(note, noteSpaces, projects);
          return matchesQuery && matchesSpace && matchesType && matchesFilter;
        })
        .sort((left, right) => {
          if (Boolean(left.favorite) !== Boolean(right.favorite)) return left.favorite ? -1 : 1;
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }),
    [docTypeFilter, noteSpaces, notes, noteFilter, projects, query, selectedSpace, selectedSpaceNoteIds],
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
    setNoteFilter("all");
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
      setNoteFilter("all");
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
      setNoteFilter("all");
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
    const normalizedUrl = normalizeResourceUrl(resourceForm.url);
    const title = resourceForm.title.trim() || titleFromUrl(normalizedUrl) || "Saved resource";
    if (!normalizedUrl && !title.trim()) return;
    const payload = {
      ...resourceForm,
      title,
      url: normalizedUrl,
      collection: resourceForm.collection.trim() || undefined,
      tags: resourceForm.tags.trim() || undefined,
      notes: resourceForm.notes.trim() || undefined,
    };
    addResource(payload);
    setSelectedResourceId(null);
    setResourceForm(emptyResourceForm);
    setResourceCaptureExpanded(false);
    setMetadataStatus("idle");
    setMetadataMessage("");
    setView("resources");
  };

  const autofillResource = async () => {
    const normalizedUrl = normalizeResourceUrl(resourceForm.url);
    if (!normalizedUrl) {
      setMetadataStatus("error");
      setMetadataMessage("Enter a domain or URL first.");
      return;
    }

    setMetadataStatus("loading");
    setMetadataMessage("Looking for public page details...");

    const fallback = buildFallbackResourceMetadata(normalizedUrl, resourceForm);
    try {
      const metadata = await fetchResourceMetadata(normalizedUrl);
      const nextForm = mergeResourceMetadata(resourceForm, fallback, metadata);
      setResourceForm(nextForm);
      setResourceCaptureExpanded(true);
      setMetadataStatus(metadata.title || metadata.description ? "success" : "fallback");
      setMetadataMessage(metadata.title || metadata.description ? "Details filled from page metadata." : "Page loaded, but metadata was limited.");
    } catch {
      setResourceForm(mergeResourceMetadata(resourceForm, fallback, null));
      setResourceCaptureExpanded(true);
      setMetadataStatus("fallback");
      setMetadataMessage("Public metadata was blocked, so Align used the domain as a smart fallback.");
    }
  };

  const updateDuplicateResource = () => {
    if (!duplicateResource) return;
    const normalizedUrl = normalizeResourceUrl(resourceForm.url);
    updateResource(duplicateResource.id, {
      title: resourceForm.title.trim() || duplicateResource.title,
      url: normalizedUrl,
      type: resourceForm.type,
      collection: resourceForm.collection.trim() || undefined,
      tags: resourceForm.tags.trim() || undefined,
      notes: resourceForm.notes.trim() || undefined,
    });
    setSelectedResourceId(duplicateResource.id);
    setResourceForm(emptyResourceForm);
    setResourceCaptureExpanded(false);
    setMetadataStatus("idle");
    setMetadataMessage("");
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
      docType: note.docType ?? "general",
      docStatus: note.docStatus ?? "active",
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
      const exportPalettes = scope === "current" && selectedNote ? palettes.filter((palette) => palette.noteIds.includes(selectedNote.id)) : palettes;
      downloadTextFile(`${filenameBase}-${stamp}.json`, exportHubNotesJson(exportNotes, scope === "current" ? [] : noteSpaces, exportPalettes), "application/json");
      setExportMenuOpen(false);
      return;
    }

    const exportPalettes = scope === "current" && selectedNote ? palettes.filter((palette) => palette.noteIds.includes(selectedNote.id)) : palettes;
    downloadTextFile(`${filenameBase}-${stamp}.md`, exportHubNotesMarkdown(exportNotes, scope === "current" ? [] : noteSpaces, exportPalettes), "text/markdown");
    setExportMenuOpen(false);
  };

  const importNotes = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const content = await file.text();
      const imported = parseHubNotesImport(content, file.name);
      const { notes: mergedNotes, noteSpaces: mergedSpaces, palettes: mergedPalettes, summary } = mergeImportedHubNotes(notes, imported.notes, noteSpaces, imported.noteSpaces, palettes, imported.palettes);
      replaceNotes(mergedNotes);
      replaceNoteSpaces(mergedSpaces);
      replacePalettes(mergedPalettes);
      setImportMessage(summary.message);
      setView("notes");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import notes.";
      setImportMessage(message);
    }
  };

  const openPaletteManager = (note?: HubNote | null) => {
    setPaletteForm({
      ...emptyPaletteForm,
      noteIds: note ? [note.id] : [],
      projectIds: note?.projectIds ?? [],
    });
    setPaletteModalOpen(true);
  };

  const openSnippetManager = (snippet?: HubSnippet) => {
    setEditingSnippetId(snippet?.id ?? null);
    setSnippetForm(
      snippet
        ? { title: snippet.title, type: snippet.type, body: snippet.body, tags: snippet.tags ?? "" }
        : emptySnippetForm,
    );
    setSnippetModalOpen(true);
  };

  const saveSnippet = (event: FormEvent) => {
    event.preventDefault();
    const title = snippetForm.title.trim();
    const body = snippetForm.body.trim();
    if (!title || !body) return;
    const payload = {
      title,
      type: snippetForm.type,
      body,
      tags: snippetForm.tags.trim() || undefined,
    };
    if (editingSnippetId) updateSnippet(editingSnippetId, payload);
    else addSnippet(payload);
    setSnippetForm(emptySnippetForm);
    setEditingSnippetId(null);
  };

  const insertSnippetIntoDraft = (snippet: HubSnippet) => {
    const nextBody = `${noteForm.body.trimEnd()}\n\n${snippet.body}\n`.trimStart();
    setNoteForm({ ...noteForm, body: nextBody });
  };

  const savePalette = (event: FormEvent) => {
    event.preventDefault();
    const colors = paletteForm.colors
      .map((color) => ({
        id: color.id,
        name: color.name.trim() || "Color",
        hex: normalizeHexInput(color.hex),
        role: color.role.trim(),
      }))
      .filter((color) => /^#[0-9a-f]{6}$/i.test(color.hex));

    if (!paletteForm.name.trim() || !colors.length) return;

    addPalette({
      name: paletteForm.name.trim(),
      tags: paletteForm.tags.trim() || undefined,
      projectIds: paletteForm.projectIds,
      noteIds: paletteForm.noteIds,
      colors,
    });
    setPaletteForm(emptyPaletteForm);
    setPaletteModalOpen(false);
  };

  const removePalette = async (palette: HubPalette) => {
    const confirmed = await confirm({
      title: "Delete palette?",
      description: `Delete "${palette.name}" from your palette library? Notes keep their written content.`,
      confirmLabel: "Delete Palette",
      tone: "danger",
    });
    if (!confirmed) return;
    deletePalette(palette.id);
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
                  icon={<Palette size={16} />}
                  onClick={() => openPaletteManager(selectedNote)}
                >
                  New Palette
                </Button>
                <Button variant="secondary" icon={<Code2 size={16} />} onClick={() => openSnippetManager()}>
                  Snippets
                </Button>
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
                setResourceCaptureExpanded(true);
                setView("resources");
                window.setTimeout(() => document.getElementById("resource-capture-url")?.focus(), 0);
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

      <PaletteManagerModal
        open={paletteModalOpen}
        form={paletteForm}
        projects={projects}
        notes={notes}
        palettes={palettes}
        onFormChange={setPaletteForm}
        onSubmit={savePalette}
        onClose={() => {
          setPaletteModalOpen(false);
          setPaletteForm(emptyPaletteForm);
        }}
        onDelete={removePalette}
      />

      <SnippetManagerModal
        open={snippetModalOpen}
        form={snippetForm}
        snippets={snippets}
        editingSnippetId={editingSnippetId}
        onFormChange={setSnippetForm}
        onEdit={openSnippetManager}
        onDelete={deleteSnippet}
        onInsert={insertSnippetIntoDraft}
        onSubmit={saveSnippet}
        onClose={() => {
          setSnippetModalOpen(false);
          setSnippetForm(emptySnippetForm);
          setEditingSnippetId(null);
        }}
      />

      {view === "resources" ? (
        <>
          <ResourceCaptureBar
            form={resourceForm}
            expanded={resourceCaptureExpanded}
            metadataStatus={metadataStatus}
            metadataMessage={metadataMessage}
            duplicate={duplicateResource}
            suggestedTags={suggestedTags}
            onFormChange={setResourceForm}
            onToggleExpanded={() => setResourceCaptureExpanded((expanded) => !expanded)}
            onAutofill={() => void autofillResource()}
            onSubmit={submitResource}
            onUpdateDuplicate={updateDuplicateResource}
            onCancel={() => {
              setResourceForm(emptyResourceForm);
              setResourceCaptureExpanded(false);
              setMetadataStatus("idle");
              setMetadataMessage("");
            }}
          />
          <ResourceLibraryToolbar
            type={type}
            collectionFilter={collectionFilter}
            collections={resourceCollections}
            sort={resourceSort}
            resultCount={filteredResources.length}
            totalCount={resources.length}
            onTypeChange={setType}
            onCollectionChange={setCollectionFilter}
            onSortChange={setResourceSort}
          />
        </>
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
              docTypeFilter={docTypeFilter}
              onFilterChange={(filter) => {
                setNoteFilter(filter);
                setSelectedSpaceKey(null);
              }}
              onDocTypeFilterChange={setDocTypeFilter}
              onSpaceSelect={(spaceKey) => {
                setNoteFilter("all");
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
              palettes={palettes}
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
              onOpenPaletteManager={() => openPaletteManager(selectedNote)}
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
  projects = [],
  currentNoteId,
  selectedIds,
  onChange,
}: {
  notes: HubNote[];
  projects?: Project[];
  currentNoteId?: string;
  selectedIds: string[];
  onChange: (noteIds: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selectableNotes = notes.filter((note) => note.id !== currentNoteId);
  if (!selectableNotes.length) return null;

  const selectedSet = new Set(selectedIds);
  const projectLookup = new Map(projects.map((project) => [project.id, project.name]));
  const selectedNotes = selectableNotes.filter((note) => selectedSet.has(note.id));
  const searchTerm = search.trim().toLowerCase();
  const candidateNotes = selectableNotes
    .filter((note) => !selectedSet.has(note.id))
    .filter((note) => {
      if (!searchTerm) return true;
      const projectNames = (note.projectIds ?? []).map((projectId) => projectLookup.get(projectId)).filter(Boolean).join(" ");
      return `${note.title} ${note.tags ?? ""} ${note.collection ?? ""} ${note.body} ${projectNames}`.toLowerCase().includes(searchTerm);
    })
    .slice(0, 40);
  const toggleNote = (noteId: string) => {
    onChange(selectedSet.has(noteId) ? selectedIds.filter((id) => id !== noteId) : [...selectedIds, noteId]);
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Related notes</p>
        <span className="text-xs font-semibold text-[var(--text-soft)]">{selectedIds.length} selected</span>
      </div>
      <label className="mt-3 flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-muted)]">
        <Search size={15} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes, tags, projects..."
          className="min-w-0 flex-1 bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-soft)]"
        />
      </label>
      {selectedNotes.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => toggleNote(note.id)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-primary)] bg-[var(--button-primary-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--button-primary-text)] transition"
            >
              <Link2 size={13} />
              <span className="truncate">{note.title}</span>
              <X size={12} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto pr-1">
        {candidateNotes.map((note) => {
          const selected = selectedSet.has(note.id);
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => toggleNote(note.id)}
              className={`flex max-w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left text-xs font-semibold transition ${
                selected
                  ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              }`}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Link2 size={13} className="shrink-0" />
                <span className="truncate">{note.title}</span>
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-[var(--text-soft)]">{docTypeLabel(note.docType)}</span>
            </button>
          );
        })}
        {!candidateNotes.length ? <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] px-3 py-3 text-xs text-[var(--text-soft)]">No notes match this search.</p> : null}
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

function PaletteManagerModal({
  open,
  form,
  projects,
  notes,
  palettes,
  onFormChange,
  onSubmit,
  onClose,
  onDelete,
}: {
  open: boolean;
  form: PaletteFormState;
  projects: Project[];
  notes: HubNote[];
  palettes: HubPalette[];
  onFormChange: (form: PaletteFormState) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onDelete: (palette: HubPalette) => void;
}) {
  const updateColor = (colorId: string, updates: Partial<PaletteFormState["colors"][number]>) => {
    onFormChange({ ...form, colors: form.colors.map((color) => (color.id === colorId ? { ...color, ...updates } : color)) });
  };

  const addColor = () => {
    onFormChange({ ...form, colors: [...form.colors, { id: `color-${Date.now()}`, name: "Color", hex: "#A1A1A1", role: "" }] });
  };

  const removeColor = (colorId: string) => {
    onFormChange({ ...form, colors: form.colors.filter((color) => color.id !== colorId) });
  };

  return (
    <Modal title="Palette Manager" description="Save reusable project color palettes and link them to notes." open={open} onClose={onClose} className="max-w-5xl">
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <FieldBlock label="Palette Name">
            <Input value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} placeholder="Website brand palette" />
          </FieldBlock>
          <FieldBlock label="Tags">
            <Input value={form.tags} onChange={(event) => onFormChange({ ...form, tags: event.target.value })} placeholder="brand, dark UI, client" />
          </FieldBlock>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <ProjectPicker projects={projects} selectedIds={form.projectIds} onChange={(projectIds) => onFormChange({ ...form, projectIds })} />
          <RelatedNotesPicker notes={notes} projects={projects} selectedIds={form.noteIds} onChange={(noteIds) => onFormChange({ ...form, noteIds })} />
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]"><Palette size={14} /> Colors</p>
            <Button type="button" variant="secondary" icon={<Plus size={14} />} onClick={addColor}>Add Color</Button>
          </div>
          <div className="grid gap-2">
            {form.colors.map((color) => (
              <div key={color.id} className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2 lg:grid-cols-[44px_minmax(0,1fr)_130px_minmax(0,1fr)_auto] lg:items-center">
                <span className="h-10 w-10 rounded-[var(--radius-xs)] border border-[var(--border)]" style={{ backgroundColor: normalizeHexInput(color.hex) }} />
                <Input value={color.name} onChange={(event) => updateColor(color.id, { name: event.target.value })} placeholder="Primary" />
                <Input value={color.hex} onChange={(event) => updateColor(color.id, { hex: event.target.value })} placeholder="#1C1C1C" />
                <Input value={color.role} onChange={(event) => updateColor(color.id, { role: event.target.value })} placeholder="Base, CTA, Text..." />
                <Button type="button" variant="danger" icon={<Trash2 size={14} />} onClick={() => removeColor(color.id)} aria-label="Remove color" />
              </div>
            ))}
          </div>
        </div>
        {palettes.length ? (
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Saved Palettes</p>
            <div className="grid gap-2 md:grid-cols-2">
              {palettes.map((palette) => (
                <div key={palette.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--text)]">{palette.name}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{palette.colors.length} colors · {palette.noteIds.length} linked notes</p>
                    </div>
                    <Button type="button" variant="danger" icon={<Trash2 size={14} />} onClick={() => onDelete(palette)} aria-label={`Delete ${palette.name}`} />
                  </div>
                  <div className="mt-3 flex gap-1">
                    {palette.colors.slice(0, 8).map((color) => (
                      <span key={color.id} className="h-7 flex-1 rounded-[var(--radius-xs)] border border-[var(--border)]" style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={<Save size={15} />} disabled={!form.name.trim() || !form.colors.length}>Save Palette</Button>
        </div>
      </form>
    </Modal>
  );
}

const snippetTypeOptions: Array<{ value: HubSnippetType; label: string }> = [
  { value: "general", label: "General" },
  { value: "prompt", label: "Prompt" },
  { value: "checklist", label: "Checklist" },
  { value: "brief-section", label: "Brief Section" },
  { value: "palette-note", label: "Palette Note" },
];

function SnippetManagerModal({
  open,
  form,
  snippets,
  editingSnippetId,
  onFormChange,
  onEdit,
  onDelete,
  onInsert,
  onSubmit,
  onClose,
}: {
  open: boolean;
  form: SnippetFormState;
  snippets: HubSnippet[];
  editingSnippetId: string | null;
  onFormChange: (form: SnippetFormState) => void;
  onEdit: (snippet: HubSnippet) => void;
  onDelete: (id: string) => void;
  onInsert: (snippet: HubSnippet) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Snippet Manager" description="Save reusable prompts, checklists, brief sections, and palette notes." open={open} onClose={onClose} className="max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} placeholder="Snippet title" />
            <Select value={form.type} onChange={(event) => onFormChange({ ...form, type: event.target.value as HubSnippetType })}>
              {snippetTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <Input value={form.tags} onChange={(event) => onFormChange({ ...form, tags: event.target.value })} placeholder="Tags" />
          <StudioTextarea value={form.body} onChange={(event) => onFormChange({ ...form, body: event.target.value })} className="min-h-72 font-mono" placeholder="Reusable markdown..." />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            <Button type="submit" icon={<Save size={15} />} disabled={!form.title.trim() || !form.body.trim()}>
              {editingSnippetId ? "Update Snippet" : "Save Snippet"}
            </Button>
          </div>
        </form>
        <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-2">
          {snippets.length ? snippets.map((snippet) => (
            <div key={snippet.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--text)]">{snippet.title}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{snippet.type}{snippet.tags ? ` · ${snippet.tags}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" className="min-h-8 px-2 sm:min-h-8" icon={<Plus size={13} />} onClick={() => onInsert(snippet)} aria-label="Insert snippet" />
                  <Button variant="ghost" className="min-h-8 px-2 sm:min-h-8" icon={<Edit3 size={13} />} onClick={() => onEdit(snippet)} aria-label="Edit snippet" />
                  <Button variant="ghost" className="min-h-8 px-2 sm:min-h-8" icon={<Trash2 size={13} />} onClick={() => onDelete(snippet.id)} aria-label="Delete snippet" />
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-xs font-medium leading-5 text-[var(--text-muted)]">{snippet.body}</p>
            </div>
          )) : (
            <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-3 text-sm font-semibold text-[var(--text-muted)]">No snippets yet.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function MarkdownEditor({
  value,
  onChange,
  compact = false,
  previewOpen = false,
  onTogglePreview,
  docType = "general",
  notes = [],
  palettes = [],
  onOpenPaletteManager,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  previewOpen?: boolean;
  onTogglePreview?: () => void;
  docType?: HubNoteDocType;
  notes?: HubNote[];
  palettes?: HubPalette[];
  onOpenPaletteManager?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const headings = getMarkdownHeadings(value);

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

  const insertTemplate = () => {
    const template = getDocumentTemplate(docType);
    insertSnippet(value.trim() ? `\n\n${template}` : template, template.length);
  };

  const insertNoteLink = (noteId: string) => {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    insertSnippet(`[[${note.title}]]`);
  };

  const insertPalette = (paletteId: string) => {
    const palette = palettes.find((item) => item.id === paletteId);
    if (!palette) return;
    const block = ["```align-palette", palette.name, ...palette.colors.map((color) => `${color.name} | ${color.hex} | ${color.role ?? ""}`), "```", ""].join("\n");
    insertSnippet(`\n${block}`);
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
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <EditorButton icon={<FileText size={15} />} label="Template" title="Insert document template" onClick={insertTemplate} />
        <select
          className="h-9 max-w-[180px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-2 text-xs font-semibold text-[var(--button-secondary-text)] outline-none"
          value=""
          onChange={(event) => {
            insertNoteLink(event.target.value);
            event.currentTarget.value = "";
          }}
          aria-label="Insert note link"
        >
          <option value="">Link note...</option>
          {notes.slice(0, 80).map((note) => (
            <option key={note.id} value={note.id}>{note.title}</option>
          ))}
        </select>
        <select
          className="h-9 max-w-[180px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-2 text-xs font-semibold text-[var(--button-secondary-text)] outline-none"
          value=""
          onChange={(event) => {
            insertPalette(event.target.value);
            event.currentTarget.value = "";
          }}
          aria-label="Insert palette"
        >
          <option value="">Palette...</option>
          {palettes.slice(0, 80).map((palette) => (
            <option key={palette.id} value={palette.id}>{palette.name}</option>
          ))}
        </select>
        {onOpenPaletteManager ? <EditorButton icon={<Palette size={15} />} label="New palette" title="Open palette manager" onClick={onOpenPaletteManager} /> : null}
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
        <div className="grid min-h-[680px] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-[1180px]">
            {value.trim() ? <NoteReader body={value} palettes={palettes} onToggleChecklistLine={toggleChecklistLine} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
          </div>
          </div>
          <DocumentOutline headings={headings} />
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
              {value.trim() ? <NoteReader body={value} palettes={palettes} onToggleChecklistLine={toggleChecklistLine} /> : <p className="text-sm text-[var(--text-soft)]">Preview appears here while you write.</p>}
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

function DocumentOutline({ headings }: { headings: Array<{ level: number; title: string; line: number }> }) {
  return (
    <aside className="hidden border-l border-[var(--border)] bg-[var(--surface-raised)] p-4 lg:block">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Outline</p>
      {headings.length ? (
        <div className="grid gap-1">
          {headings.map((heading) => (
            <div
              key={`${heading.line}-${heading.title}`}
              className="rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-semibold leading-5 text-[var(--text-muted)]"
              style={{ paddingLeft: `${8 + (heading.level - 1) * 10}px` }}
            >
              {heading.title}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[var(--text-soft)]">Headings will appear here while you write.</p>
      )}
    </aside>
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
  docTypeFilter,
  onFilterChange,
  onDocTypeFilterChange,
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
  docTypeFilter: HubNoteDocType | "all";
  onFilterChange: (filter: NoteFilter) => void;
  onDocTypeFilterChange: (filter: HubNoteDocType | "all") => void;
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
  const reviewCount = allNotes.filter((note) => (note.docStatus ?? "active") === "review").length;
  const archivedCount = allNotes.filter((note) => (note.docStatus ?? "active") === "archived").length;
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
            <NoteTreeButton active={!selectedSpaceKey && filter === "all"} icon={<FileText size={15} />} label="All Docs" count={allNotes.length} onClick={() => onFilterChange("all")} />
            <NoteTreeButton active={!selectedSpaceKey && filter === "favorites"} icon={<Star size={15} />} label="Favorites" count={favoriteCount} onClick={() => onFilterChange("favorites")} />
            <NoteTreeButton active={!selectedSpaceKey && filter === "review"} icon={<Eye size={15} />} label="Needs Review" count={reviewCount} onClick={() => onFilterChange("review")} />
            <NoteTreeButton active={!selectedSpaceKey && filter === "archived"} icon={<Folder size={15} />} label="Archived" count={archivedCount} onClick={() => onFilterChange("archived")} />
            <NoteTreeButton active={!selectedSpaceKey && filter === "inbox"} icon={<FolderOpen size={15} />} label="Unfiled" count={unfiledCount} onClick={() => onFilterChange("inbox")} />
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Document Types</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onDocTypeFilterChange("all")}
              className={`rounded-[var(--radius-sm)] border px-2 py-1.5 text-left text-xs font-bold transition ${
                docTypeFilter === "all" ? "border-[var(--brand-primary)] bg-[var(--button-secondary-hover)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
              }`}
            >
              All types
            </button>
            {noteDocTypeOptions.filter((option) => option.value !== "general").map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onDocTypeFilterChange(option.value)}
                className={`rounded-[var(--radius-sm)] border px-2 py-1.5 text-left text-xs font-bold transition ${
                  docTypeFilter === option.value ? "border-[var(--brand-primary)] bg-[var(--button-secondary-hover)] text-[var(--text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                }`}
              >
                {option.label}
              </button>
            ))}
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">{selectedSpaceKey ? "Project / Space Docs" : noteFilterLabel(filter)}</p>
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
              <Badge tone="purple">{docTypeLabel(note.docType)}</Badge>
              {(note.docStatus ?? "active") !== "active" ? <Badge tone={(note.docStatus ?? "active") === "review" ? "amber" : "slate"}>{docStatusLabel(note.docStatus)}</Badge> : null}
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
  palettes,
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
  onOpenPaletteManager,
}: {
  projects: Project[];
  palettes: HubPalette[];
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
  onOpenPaletteManager: () => void;
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
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_280px]">
                <FieldBlock label="Title">
                  <Input value={noteForm.title} onChange={(event) => onNoteFormChange({ ...noteForm, title: event.target.value })} placeholder="Note title" />
                </FieldBlock>
                <FieldBlock label="Type">
                  <Select value={noteForm.docType} onChange={(event) => onNoteFormChange({ ...noteForm, docType: event.target.value as HubNoteDocType })}>
                    {noteDocTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </FieldBlock>
                <FieldBlock label="Status">
                  <Select value={noteForm.docStatus} onChange={(event) => onNoteFormChange({ ...noteForm, docStatus: event.target.value as HubNoteDocStatus })}>
                    {noteDocStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
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
                  <RelatedNotesPicker notes={allNotes} projects={projects} selectedIds={noteForm.relatedNoteIds} onChange={(relatedNoteIds) => onNoteFormChange({ ...noteForm, relatedNoteIds })} />
                </div>
              </div>
              <MarkdownEditor
                value={noteForm.body}
                onChange={(body) => onNoteFormChange({ ...noteForm, body })}
                previewOpen={previewOpen}
                onTogglePreview={onTogglePreview}
                docType={noteForm.docType}
                notes={allNotes}
                palettes={palettes}
                onOpenPaletteManager={onOpenPaletteManager}
              />
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
                    <Badge tone="purple">{docTypeLabel(selectedNote.docType)}</Badge>
                    <Badge tone={(selectedNote.docStatus ?? "active") === "review" ? "amber" : (selectedNote.docStatus ?? "active") === "archived" ? "slate" : "emerald"}>{docStatusLabel(selectedNote.docStatus)}</Badge>
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
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_280px]">
                  <FieldBlock label="Title">
                    <Input value={editNoteForm.title} onChange={(event) => onEditFormChange({ ...editNoteForm, title: event.target.value })} placeholder="Note title" />
                  </FieldBlock>
                  <FieldBlock label="Type">
                    <Select value={editNoteForm.docType} onChange={(event) => onEditFormChange({ ...editNoteForm, docType: event.target.value as HubNoteDocType })}>
                      {noteDocTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </FieldBlock>
                  <FieldBlock label="Status">
                    <Select value={editNoteForm.docStatus} onChange={(event) => onEditFormChange({ ...editNoteForm, docStatus: event.target.value as HubNoteDocStatus })}>
                      {noteDocStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
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
                    <RelatedNotesPicker notes={allNotes} projects={projects} currentNoteId={selectedNote.id} selectedIds={editNoteForm.relatedNoteIds} onChange={(relatedNoteIds) => onEditFormChange({ ...editNoteForm, relatedNoteIds })} />
                  </div>
                </div>
                <MarkdownEditor
                  value={editNoteForm.body}
                  onChange={(body) => onEditFormChange({ ...editNoteForm, body })}
                  previewOpen={previewOpen}
                  onTogglePreview={onTogglePreview}
                  docType={editNoteForm.docType}
                  notes={allNotes.filter((note) => note.id !== selectedNote.id)}
                  palettes={palettes}
                  onOpenPaletteManager={onOpenPaletteManager}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-[var(--surface)] p-5 lg:p-8">
                <div className="min-h-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-sm)] lg:px-12 lg:py-10">
                  <NoteReader body={selectedNote.body} allNotes={allNotes} palettes={palettes} onOpenNote={onSelectNote} onToggleChecklistLine={(lineIndex) => onToggleChecklistLine(selectedNote, lineIndex)} />
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

function ResourceCaptureBar({
  form,
  expanded,
  metadataStatus,
  metadataMessage,
  duplicate,
  suggestedTags,
  onFormChange,
  onToggleExpanded,
  onAutofill,
  onSubmit,
  onUpdateDuplicate,
  onCancel,
}: {
  form: ResourceFormState;
  expanded: boolean;
  metadataStatus: MetadataStatus;
  metadataMessage: string;
  duplicate: HubResource | null;
  suggestedTags: string[];
  onFormChange: (form: ResourceFormState) => void;
  onToggleExpanded: () => void;
  onAutofill: () => void;
  onSubmit: (event: FormEvent) => void;
  onUpdateDuplicate: () => void;
  onCancel: () => void;
}) {
  const host = getResourceHost(form.url);
  const favicon = getResourceFavicon(form.url);
  const canSave = Boolean(normalizeResourceUrl(form.url) || form.title.trim());

  return (
    <Card className="overflow-hidden p-0">
      <form onSubmit={onSubmit}>
        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_170px_170px_auto] lg:items-end">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Capture resource</span>
            <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 transition hover:border-[var(--border-strong)] focus-within:border-[var(--border-strong)] focus-within:bg-[var(--surface)]">
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
                {favicon ? <img src={favicon} alt="" className="h-5 w-5" /> : <ExternalLink size={15} className="text-[var(--text-soft)]" />}
              </span>
              <input
                id="resource-capture-url"
                name="align-resource-capture-url"
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={form.url}
                onChange={(event) => onFormChange({ ...form, url: event.target.value })}
                onBlur={() => {
                  const normalizedUrl = normalizeResourceUrl(form.url);
                  if (normalizedUrl && !form.title.trim()) onFormChange(mergeResourceMetadata(form, buildFallbackResourceMetadata(normalizedUrl, form), null));
                }}
                placeholder="Paste a URL or domain..."
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text)] outline-none ring-0 placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-0 focus-visible:outline-none"
              />
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Type</span>
            <Select value={form.type} onChange={(event) => onFormChange({ ...form, type: event.target.value as HubResourceType })}>
              {resourceTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Collection</span>
            <Input value={form.collection} onChange={(event) => onFormChange({ ...form, collection: event.target.value })} placeholder="Design tools" />
          </label>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button type="button" variant="secondary" onClick={onAutofill} disabled={metadataStatus === "loading" || !form.url.trim()}>
              {metadataStatus === "loading" ? "Filling..." : "Autofill"}
            </Button>
            <Button type="submit" icon={<Save size={15} />} disabled={!canSave}>
              Save
            </Button>
          </div>
        </div>

        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text)]">{form.title.trim() || titleFromUrl(normalizeResourceUrl(form.url)) || "Ready for a useful link"}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                {metadataMessage || (host ? `${host} · browser-side metadata only` : "No Supabase proxy, no screenshots, no extra storage.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {duplicate ? (
                <>
                  <Badge tone="amber">Already saved</Badge>
                  <Button type="button" variant="secondary" onClick={onUpdateDuplicate}>
                    Update Existing
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="ghost" onClick={onToggleExpanded}>
                {expanded ? "Hide Details" : "Details"}
              </Button>
              {(form.url || form.title || form.collection || form.tags || form.notes) ? (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {expanded ? (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} placeholder="Resource title" />
                <Input value={form.tags} onChange={(event) => onFormChange({ ...form, tags: event.target.value })} placeholder="Tags, comma separated" />
              </div>
              {suggestedTags.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Suggested</span>
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onFormChange({ ...form, tags: appendTag(form.tags, tag) })}
                      className="rounded-full border border-[var(--border)] bg-[var(--panel-bg-soft)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
              <StudioTextarea value={form.notes} onChange={(event) => onFormChange({ ...form, notes: event.target.value })} placeholder="Why this is useful..." />
            </div>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function ResourceLibraryToolbar({
  type,
  collectionFilter,
  collections,
  sort,
  resultCount,
  totalCount,
  onTypeChange,
  onCollectionChange,
  onSortChange,
}: {
  type: ResourceFilter;
  collectionFilter: string;
  collections: string[];
  sort: ResourceSort;
  resultCount: number;
  totalCount: number;
  onTypeChange: (type: ResourceFilter) => void;
  onCollectionChange: (collection: string) => void;
  onSortChange: (sort: ResourceSort) => void;
}) {
  return (
    <Card className="p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={type === "all"} onClick={() => onTypeChange("all")}>All</FilterChip>
          {resourceTypes.map((item) => (
            <FilterChip key={item.value} active={type === item.value} onClick={() => onTypeChange(item.value)}>
              {item.label}
            </FilterChip>
          ))}
          <FilterChip active={type === "favorites"} onClick={() => onTypeChange("favorites")}>Favorites</FilterChip>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_180px_auto] sm:items-center">
          <Select value={collectionFilter} onChange={(event) => onCollectionChange(event.target.value)}>
            <option value="all">All collections</option>
            {collections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(event) => onSortChange(event.target.value as ResourceSort)}>
            <option value="newest">Newest first</option>
            <option value="favorites">Favorites first</option>
            <option value="title">Title A-Z</option>
            <option value="collection">Collection</option>
          </Select>
          <p className="text-xs font-bold text-[var(--text-soft)] sm:text-right">{resultCount} of {totalCount}</p>
        </div>
      </div>
    </Card>
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
    <Card className={`group overflow-hidden p-0 transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] ${selected ? "border-[var(--brand-primary)]" : ""}`}>
      <button type="button" onClick={onSelect} className="block w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            {favicon ? <img src={favicon} alt="" className="h-6 w-6" loading="lazy" /> : <span className="font-display text-sm font-bold text-[var(--brand-primary)]">{getResourceInitials(item.title)}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{host || item.collection || "Saved resource"}</p>
                <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold leading-6 text-[var(--text)]">{item.title}</h3>
              </div>
              <Star size={16} className={item.favorite ? "shrink-0 fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "shrink-0 text-[var(--text-soft)]"} />
            </div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--text-muted)]">{item.notes || item.url || "No notes yet."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={type.tone}>{type.label}</Badge>
          {item.collection ? <Badge>{item.collection}</Badge> : null}
          {item.tags
            ?.split(",")
            .filter(Boolean)
            .slice(0, 2)
            .map((tag) => <Badge key={tag.trim()}>{tag.trim()}</Badge>)}
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
  const normalizedUrl = normalizeResourceUrl(item.url);
  return (
    <Card className="overflow-hidden border-[var(--brand-primary)] bg-[var(--surface-raised)] p-0">
      <div className={detailLayoutClass}>
        <div className={previewCardClass}>
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            {favicon ? <img src={favicon} alt="" className="h-10 w-10" loading="lazy" /> : <span className="font-display text-lg font-bold text-[var(--brand-primary)]">{getResourceInitials(item.title)}</span>}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">{host || "Saved resource"}</p>
            {normalizedUrl ? <p className="mt-1 break-all text-sm text-[var(--text-muted)]">{normalizedUrl}</p> : <p className="mt-1 text-sm text-[var(--text-muted)]">Add a URL when you edit this resource.</p>}
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
          <div className="mt-4 grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Domain</p>
              <p className="mt-1 truncate font-bold text-[var(--text)]">{host || "No website"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Collection</p>
              <p className="mt-1 truncate font-bold text-[var(--text)]">{item.collection || "Unfiled"}</p>
            </div>
          </div>
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
          {normalizedUrl ? (
            <div className={compact ? "mt-6 grid gap-2" : "mt-6 flex flex-wrap gap-2"}>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(normalizedUrl)} icon={<Copy size={15} />}>
                Copy Link
              </Button>
              <Button onClick={() => window.open(normalizedUrl, "_blank", "noopener,noreferrer")} icon={<ExternalLink size={15} />}>
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
  palettes = [],
  onOpenNote,
  onToggleChecklistLine,
}: {
  body: string;
  allNotes?: HubNote[];
  palettes?: HubPalette[];
  onOpenNote?: (noteId: string) => void;
  onToggleChecklistLine?: (lineIndex: number) => void;
}) {
  const lines = body.split("\n");
  const nodes: ReactNode[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  const inlineOptions = { notes: allNotes, onOpenNote };

  const pushCodeBlock = (key: string) => {
    if (codeLanguage === "align-palette") {
      const savedPalette = palettes.find((palette) => palette.name.toLowerCase() === (codeLines[0] || "").trim().toLowerCase());
      nodes.push(
        <PaletteBlock
          key={key}
          title={savedPalette?.name || codeLines[0] || "Palette"}
          lines={savedPalette ? savedPalette.colors.map((color) => `${color.name} | ${color.hex} | ${color.role ?? ""}`) : codeLines.slice(1)}
        />,
      );
      codeLines = [];
      inCodeBlock = false;
      codeLanguage = "";
      return;
    }
    nodes.push(
      <pre key={key} className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text)]">
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
    inCodeBlock = false;
    codeLanguage = "";
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        pushCodeBlock(`code-${index}`);
      } else {
        inCodeBlock = true;
        codeLanguage = line.replace(/^```/, "").trim();
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

  return <article className="align-note-reader space-y-4 text-base leading-8 text-[var(--note-text,var(--text-muted))]">{nodes}</article>;
}

function PaletteBlock({ title, lines }: { title: string; lines: string[] }) {
  const colors = lines
    .map((line) => {
      const [name, hex, role] = line.split("|").map((part) => part.trim());
      const normalizedHex = normalizeHexInput(hex ?? "");
      if (!/^#[0-9A-F]{6}$/.test(normalizedHex)) return null;
      return { name: name || "Color", hex: normalizedHex, role: role || "" };
    })
    .filter((color): color is { name: string; hex: string; role: string } => Boolean(color));

  if (!colors.length) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
        Palette block has no valid hex colors.
      </div>
    );
  }

  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--text)]"><Palette size={16} />{title}</p>
        <Badge tone="slate">{colors.length} colors</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {colors.map((color) => (
          <button
            key={`${color.name}-${color.hex}`}
            type="button"
            onClick={() => void navigator.clipboard?.writeText(color.hex)}
            className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            title={`Copy ${color.hex}`}
          >
            <span className="h-10 w-10 shrink-0 rounded-[var(--radius-xs)] border border-[var(--border)]" style={{ backgroundColor: color.hex }} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[var(--text)]">{color.name}</span>
              <span className="block truncate text-xs font-semibold text-[var(--text-soft)]">{color.role ? `${color.role} · ` : ""}{color.hex}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
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
