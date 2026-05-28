import type { HubNote } from "../types/studio";

type HubNotesImportSummary = {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  message: string;
};

type HubNotesExportFile = {
  version: "align-hub-notes-v1";
  exportedAt: string;
  notes: HubNote[];
};

const EXPORT_VERSION = "align-hub-notes-v1";

export function exportHubNotesJson(notes: HubNote[]) {
  const payload: HubNotesExportFile = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notes: notes.map(normalizeNote),
  };

  return JSON.stringify(payload, null, 2);
}

export function exportHubNotesMarkdown(notes: HubNote[]) {
  const header = [
    "# Align Notes",
    "",
    `Exported: ${new Date().toLocaleString()}`,
    "",
    "This Markdown file is meant to be readable. Align note IDs are stored in comments so the file can still be imported safely.",
    "",
  ].join("\n");

  const body = notes
    .map((note, index) => {
      const normalized = normalizeNote(note);
      const metadata = [
        normalized.tags ? `Tags: ${normalized.tags}` : "",
        normalized.favorite ? "Favorite: yes" : "",
        normalized.clientVisible ? "Client-visible: yes" : "",
        normalized.projectIds.length ? `Linked project IDs: ${normalized.projectIds.join(", ")}` : "",
        `Created: ${normalized.createdAt}`,
        `Updated: ${normalized.updatedAt}`,
      ].filter(Boolean);

      return [
        "<!-- align-note-start -->",
        `<!-- align-note-id: ${normalized.id} -->`,
        `<!-- align-note-tags: ${escapeMetadata(normalized.tags ?? "")} -->`,
        `<!-- align-note-favorite: ${normalized.favorite ? "true" : "false"} -->`,
        `<!-- align-note-client-visible: ${normalized.clientVisible ? "true" : "false"} -->`,
        `<!-- align-note-project-ids: ${normalized.projectIds.join(",")} -->`,
        `<!-- align-note-created-at: ${normalized.createdAt} -->`,
        `<!-- align-note-updated-at: ${normalized.updatedAt} -->`,
        `## ${normalized.title}`,
        "",
        metadata.length ? metadata.map((item) => `> ${item}`).join("\n") : "> No metadata",
        "",
        normalized.body,
        "",
        index < notes.length - 1 ? "---" : "",
      ].join("\n");
    })
    .join("\n\n");

  return `${header}${body}`.trimEnd() + "\n";
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

export function parseHubNotesImport(content: string, filename: string): HubNote[] {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "json") return parseJsonNotes(content);
  if (extension === "md" || extension === "markdown") return parseMarkdownNotes(content);

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseJsonNotes(content);
  return parseMarkdownNotes(content);
}

export function mergeImportedHubNotes(existing: HubNote[], incoming: HubNote[]) {
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
    summary: {
      added,
      updated,
      skipped,
      failed,
      message: `Import complete: ${added} added, ${updated} updated, ${skipped} skipped, ${failed} failed.`,
    } satisfies HubNotesImportSummary,
  };
}

function parseJsonNotes(content: string): HubNote[] {
  const parsed = JSON.parse(content) as Partial<HubNotesExportFile> | HubNote[];
  const notes = Array.isArray(parsed) ? parsed : parsed.notes;
  if (!Array.isArray(notes)) throw new Error("JSON file does not contain Align notes.");
  return notes.map((note) => normalizeImportedNote(note));
}

function parseMarkdownNotes(content: string): HubNote[] {
  if (content.includes("<!-- align-note-start -->")) return parseReadableMarkdownNotes(content);

  const sections = content
    .split(/\n(?=---\n)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if (!sections.length) throw new Error("Markdown file does not contain any notes.");

  return sections.map((section) => {
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
      tags: metadata.tags || undefined,
      favorite: metadata.favorite === "true",
      clientVisible: metadata["client-visible"] === "true",
      projectIds: splitCsv(metadata["project-ids"]),
      createdAt: metadata["created-at"],
      updatedAt: metadata["updated-at"],
    });
  });
}

function parseReadableMarkdownNotes(content: string): HubNote[] {
  const sections = content
    .split("<!-- align-note-start -->")
    .map((section) => section.trim())
    .filter((section) => section.includes("<!-- align-note-id:") || /^##\s+/m.test(section));

  if (!sections.length) throw new Error("Markdown file does not contain any notes.");

  return sections.map((section) => {
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
      tags: comments["align-note-tags"] || undefined,
      favorite: comments["align-note-favorite"] === "true",
      clientVisible: comments["align-note-client-visible"] === "true",
      projectIds: splitCsv(comments["align-note-project-ids"]),
      createdAt: comments["align-note-created-at"],
      updatedAt: comments["align-note-updated-at"],
    });
  });
}

function normalizeImportedNote(note: Partial<HubNote>): HubNote {
  const now = new Date().toISOString();
  return {
    id: note.id || createNoteId(),
    title: String(note.title ?? "Imported note").trim() || "Imported note",
    body: String(note.body ?? "").trim(),
    tags: note.tags?.trim() || undefined,
    favorite: Boolean(note.favorite),
    clientVisible: Boolean(note.clientVisible),
    projectIds: Array.isArray(note.projectIds) ? note.projectIds.filter(Boolean) : [],
    createdAt: validDate(note.createdAt) || now,
    updatedAt: validDate(note.updatedAt) || now,
  };
}

function normalizeNote(note: HubNote): HubNote {
  return { ...note, clientVisible: Boolean(note.clientVisible), projectIds: note.projectIds ?? [] };
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

function escapeMetadata(value: string) {
  return value.replace(/\n/g, "\\n");
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
