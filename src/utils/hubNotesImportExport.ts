import type { HubNote, HubNoteDocStatus, HubNoteDocType, HubNoteSpace, HubPalette, HubPaletteColor } from "../types/studio";

type HubNotesImportSummary = {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  message: string;
};

type HubNotesExportFile = {
  version: "align-hub-notes-v3";
  exportedAt: string;
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  palettes: HubPalette[];
};

type HubNotesImportResult = {
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  palettes: HubPalette[];
};

const EXPORT_VERSION = "align-hub-notes-v3";
const docTypes: HubNoteDocType[] = ["brief", "strategy", "research", "palette", "meeting", "prompt", "checklist", "reference", "general"];
const docStatuses: HubNoteDocStatus[] = ["draft", "active", "review", "archived"];

export function exportHubNotesJson(notes: HubNote[], noteSpaces: HubNoteSpace[] = [], palettes: HubPalette[] = []) {
  const payload: HubNotesExportFile = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notes: notes.map(normalizeNote),
    noteSpaces: noteSpaces.map(normalizeNoteSpace),
    palettes: palettes.map(normalizePalette),
  };

  return JSON.stringify(payload, null, 2);
}

export function exportHubNotesMarkdown(notes: HubNote[], noteSpaces: HubNoteSpace[] = [], palettes: HubPalette[] = []) {
  void noteSpaces;
  void palettes;
  return notes.map((note) => cleanMarkdownNote(normalizeNote(note))).join("\n\n---\n\n").trimEnd() + "\n";
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseHubNotesImport(content: string, filename: string): HubNotesImportResult {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "json") return parseJsonNotes(content);
  if (extension === "md" || extension === "markdown") return parseMarkdownNotes(content);

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseJsonNotes(content);
  return parseMarkdownNotes(content);
}

export function mergeImportedHubNotes(
  existing: HubNote[],
  incoming: HubNote[],
  existingSpaces: HubNoteSpace[] = [],
  incomingSpaces: HubNoteSpace[] = [],
  existingPalettes: HubPalette[] = [],
  incomingPalettes: HubPalette[] = [],
) {
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const existingById = new Map(existing.map((note) => [note.id, normalizeNote(note)]));
  const signatures = new Set(existing.map(noteSignature));
  const next = existing.map(normalizeNote);

  incoming.forEach((rawNote) => {
    const note = normalizeNote(rawNote);
    if (!note.title.trim() || !note.body.trim()) {
      failed += 1;
      return;
    }

    const existingIndex = next.findIndex((item) => item.id === note.id);
    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        ...note,
        createdAt: next[existingIndex].createdAt,
        updatedAt: new Date().toISOString(),
      };
      updated += 1;
      return;
    }

    const signature = noteSignature(note);
    if (!existingById.has(note.id) && signatures.has(signature)) {
      skipped += 1;
      return;
    }

    signatures.add(signature);
    next.unshift(note);
    added += 1;
  });

  return {
    notes: next,
    noteSpaces: mergeImportedNoteSpaces(existingSpaces, incomingSpaces, next),
    palettes: mergeImportedPalettes(existingPalettes, incomingPalettes, next),
    summary: {
      added,
      updated,
      skipped,
      failed,
      message: `Import complete: ${added} added, ${updated} updated, ${skipped} skipped, ${failed} failed.`,
    } satisfies HubNotesImportSummary,
  };
}

function parseJsonNotes(content: string): HubNotesImportResult {
  const parsed = JSON.parse(content) as Partial<HubNotesExportFile & { version: string }> | HubNote[];
  const notes = Array.isArray(parsed) ? parsed : parsed.notes;
  if (!Array.isArray(notes)) throw new Error("JSON file does not contain Align notes.");
  return {
    notes: notes.map((note) => normalizeImportedNote(note)),
    noteSpaces: Array.isArray(parsed) ? [] : Array.isArray(parsed.noteSpaces) ? parsed.noteSpaces.map((space) => normalizeImportedNoteSpace(space)) : [],
    palettes: Array.isArray(parsed) ? [] : Array.isArray(parsed.palettes) ? parsed.palettes.map((palette) => normalizeImportedPalette(palette)) : [],
  };
}

function parseMarkdownNotes(content: string): HubNotesImportResult {
  if (content.includes("<!-- align-note-start -->")) return parseReadableMarkdownNotes(content);

  const sections = content
    .split(/\n-{3,}\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if (!sections.length) throw new Error("Markdown file does not contain any notes.");

  return {
    notes: sections.map((section) => {
    if (!section.startsWith("---\n")) {
      const title = section.split("\n").find(Boolean)?.replace(/^#+\s*/, "") || "Imported note";
      return normalizeImportedNote({ title, body: section });
    }

    const closingIndex = section.indexOf("\n---\n", 4);
    if (closingIndex < 0) {
      const title = section.split("\n").find(Boolean)?.replace(/^#+\s*/, "") || "Imported note";
      return normalizeImportedNote({ title, body: section });
    }

    const metadata = parseMetadata(section.slice(4, closingIndex));
    const body = section.slice(closingIndex + 5).trim();
    return normalizeImportedNote({
      id: metadata["align-note-id"],
      title: metadata.title || "Imported note",
      body,
      collection: metadata.collection || metadata["align-note-collection"] || undefined,
      tags: metadata.tags || undefined,
      favorite: metadata.favorite === "true",
      clientVisible: metadata["client-visible"] === "true",
      docType: normalizeDocType(metadata["doc-type"]),
      docStatus: normalizeDocStatus(metadata["doc-status"]),
      projectIds: splitCsv(metadata["project-ids"]),
      relatedNoteIds: splitCsv(metadata["related-note-ids"]),
      createdAt: metadata["created-at"],
      updatedAt: metadata["updated-at"],
    });
    }),
    noteSpaces: [],
    palettes: [],
  };
}

function cleanMarkdownNote(note: HubNote) {
  const title = note.title.trim() || "Untitled note";
  const body = note.body.trim();
  const titlePattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(title)}\\s*$`, "iu");
  if (body.split("\n").find((line) => line.trim())?.match(titlePattern)) return body;
  return [`# ${title}`, "", body].filter((part) => part.length > 0).join("\n");
}

function parseReadableMarkdownNotes(content: string): HubNotesImportResult {
  const noteSpaces = parseMarkdownNoteSpaces(content);
  const palettes = parseMarkdownPalettes(content);
  const sections = content
    .split("<!-- align-note-start -->")
    .map((section) => section.trim())
    .filter((section) => section.includes("<!-- align-note-id:") || /^##\s+/m.test(section));

  if (!sections.length) throw new Error("Markdown file does not contain any notes.");

  return {
    notes: sections.map((section) => {
    const comments = parseHtmlComments(section);
    const titleMatch = section.match(/^##\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() || "Imported note";
    const bodyStart = titleMatch ? section.indexOf(titleMatch[0]) + titleMatch[0].length : 0;
    const body = section
      .slice(bodyStart)
      .replace(/^\s*(>\s.*\n?)+/m, "")
      .replace(/^---\s*$/gm, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();

    return normalizeImportedNote({
      id: comments["align-note-id"],
      title,
      body,
      collection: comments["align-note-collection"] || undefined,
      tags: comments["align-note-tags"] || undefined,
      favorite: comments["align-note-favorite"] === "true",
      clientVisible: comments["align-note-client-visible"] === "true",
      docType: normalizeDocType(comments["align-note-doc-type"]),
      docStatus: normalizeDocStatus(comments["align-note-doc-status"]),
      projectIds: splitCsv(comments["align-note-project-ids"]),
      relatedNoteIds: splitCsv(comments["align-note-related-note-ids"]),
      createdAt: comments["align-note-created-at"],
      updatedAt: comments["align-note-updated-at"],
    });
    }),
    noteSpaces,
    palettes,
  };
}

function normalizeImportedNote(note: Partial<HubNote>): HubNote {
  const now = new Date().toISOString();
  return {
    id: note.id || createNoteId(),
    title: String(note.title ?? "Imported note").trim() || "Imported note",
    body: String(note.body ?? "").trim(),
    collection: note.collection?.trim() || undefined,
    tags: note.tags?.trim() || undefined,
    favorite: Boolean(note.favorite),
    clientVisible: Boolean(note.clientVisible),
    docType: normalizeDocType(note.docType),
    docStatus: normalizeDocStatus(note.docStatus),
    projectIds: Array.isArray(note.projectIds) ? note.projectIds.filter(Boolean) : [],
    relatedNoteIds: Array.isArray(note.relatedNoteIds) ? note.relatedNoteIds.filter(Boolean) : [],
    createdAt: validDate(note.createdAt) || now,
    updatedAt: validDate(note.updatedAt) || now,
  };
}

function normalizeNote(note: HubNote): HubNote {
  return {
    ...note,
    collection: note.collection?.trim() || undefined,
    clientVisible: Boolean(note.clientVisible),
    projectIds: note.projectIds ?? [],
    relatedNoteIds: note.relatedNoteIds ?? [],
  };
}

function normalizeImportedNoteSpace(space: Partial<HubNoteSpace>): HubNoteSpace {
  const now = new Date().toISOString();
  return {
    id: space.id || createNoteId().replace(/^note-/, "space-"),
    name: String(space.name ?? "Imported space").trim() || "Imported space",
    description: space.description?.trim() || undefined,
    projectIds: Array.isArray(space.projectIds) ? [...new Set(space.projectIds.filter(Boolean))] : [],
    manualNoteIds: Array.isArray(space.manualNoteIds) ? [...new Set(space.manualNoteIds.filter(Boolean))] : [],
    createdAt: validDate(space.createdAt) || now,
    updatedAt: validDate(space.updatedAt) || now,
  };
}

function normalizeNoteSpace(space: HubNoteSpace): HubNoteSpace {
  return normalizeImportedNoteSpace(space);
}

function normalizeImportedPalette(palette: Partial<HubPalette>): HubPalette {
  const now = new Date().toISOString();
  return {
    id: palette.id || createNoteId().replace(/^note-/, "palette-"),
    name: String(palette.name ?? "Imported palette").trim() || "Imported palette",
    projectIds: Array.isArray(palette.projectIds) ? [...new Set(palette.projectIds.filter(Boolean))] : [],
    noteIds: Array.isArray(palette.noteIds) ? [...new Set(palette.noteIds.filter(Boolean))] : [],
    colors: Array.isArray(palette.colors) ? palette.colors.map(normalizeImportedPaletteColor) : [],
    tags: palette.tags?.trim() || undefined,
    createdAt: validDate(palette.createdAt) || now,
    updatedAt: validDate(palette.updatedAt) || now,
  };
}

function normalizeImportedPaletteColor(color: Partial<HubPaletteColor>): HubPaletteColor {
  return {
    id: color.id || createNoteId().replace(/^note-/, "color-"),
    name: String(color.name ?? "Color").trim() || "Color",
    hex: normalizeHex(color.hex),
    role: color.role?.trim() || undefined,
  };
}

function normalizePalette(palette: HubPalette): HubPalette {
  return normalizeImportedPalette(palette);
}

function mergeImportedNoteSpaces(existingSpaces: HubNoteSpace[], incomingSpaces: HubNoteSpace[], notes: HubNote[]) {
  const validNoteIds = new Set(notes.map((note) => note.id));
  const spacesById = new Map(existingSpaces.map((space) => [space.id, normalizeNoteSpace(space)]));

  incomingSpaces.map(normalizeImportedNoteSpace).forEach((space) => {
    const existing = spacesById.get(space.id);
    spacesById.set(space.id, {
      ...(existing ?? space),
      ...space,
      manualNoteIds: [...new Set([...(existing?.manualNoteIds ?? []), ...space.manualNoteIds].filter((noteId) => validNoteIds.has(noteId)))],
      projectIds: [...new Set([...(existing?.projectIds ?? []), ...space.projectIds])],
      updatedAt: new Date().toISOString(),
    });
  });

  return [...spacesById.values()];
}

function mergeImportedPalettes(existingPalettes: HubPalette[], incomingPalettes: HubPalette[], notes: HubNote[]) {
  const validNoteIds = new Set(notes.map((note) => note.id));
  const palettesById = new Map(existingPalettes.map((palette) => [palette.id, normalizePalette(palette)]));

  incomingPalettes.map(normalizePalette).forEach((palette) => {
    const existing = palettesById.get(palette.id);
    palettesById.set(palette.id, {
      ...(existing ?? palette),
      ...palette,
      noteIds: palette.noteIds.filter((noteId) => validNoteIds.has(noteId)),
      updatedAt: new Date().toISOString(),
    });
  });

  return [...palettesById.values()];
}

function parseMarkdownNoteSpaces(content: string) {
  const spaces: HubNoteSpace[] = [];
  const pattern = /<!--\s*align-note-space:\s*([\s\S]*?)\s*-->/g;
  let match = pattern.exec(content);
  while (match) {
    try {
      spaces.push(normalizeImportedNoteSpace(JSON.parse(match[1].replace(/\\n/g, "\n")) as Partial<HubNoteSpace>));
    } catch {
      // Ignore malformed optional space metadata; note content remains importable.
    }
    match = pattern.exec(content);
  }
  return spaces;
}

function parseMarkdownPalettes(content: string) {
  const palettes: HubPalette[] = [];
  const pattern = /<!--\s*align-palette:\s*([\s\S]*?)\s*-->/g;
  let match = pattern.exec(content);
  while (match) {
    try {
      palettes.push(normalizeImportedPalette(JSON.parse(match[1].replace(/\\n/g, "\n")) as Partial<HubPalette>));
    } catch {
      // Ignore malformed optional palette metadata; note content remains importable.
    }
    match = pattern.exec(content);
  }
  return palettes;
}

function parseMetadata(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator < 0) return null;
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/\\n/g, "\n")];
      })
      .filter((item): item is [string, string] => Boolean(item)),
  );
}

function parseHtmlComments(value: string) {
  const comments: Record<string, string> = {};
  const pattern = /<!--\s*([^:]+):\s*([\s\S]*?)\s*-->/g;
  let match = pattern.exec(value);
  while (match) {
    comments[match[1].trim()] = match[2].trim().replace(/\\n/g, "\n");
    match = pattern.exec(value);
  }
  return comments;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function noteSignature(note: HubNote) {
  return [note.title, note.body, note.tags ?? ""].map((value) => value.trim().toLowerCase()).join("|");
}

function validDate(value?: string) {
  if (!value) return "";
  return Number.isNaN(new Date(value).getTime()) ? "" : value;
}

function createNoteId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeDocType(value?: string): HubNoteDocType {
  return docTypes.includes(value as HubNoteDocType) ? (value as HubNoteDocType) : "general";
}

function normalizeDocStatus(value?: string): HubNoteDocStatus {
  return docStatuses.includes(value as HubNoteDocStatus) ? (value as HubNoteDocStatus) : "active";
}

function normalizeHex(value?: string) {
  const raw = String(value ?? "").trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toUpperCase() : "#A1A1A1";
}
