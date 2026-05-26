import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "../types/project";
import type { HubNote, HubResource } from "../types/studio";

type ResourceInput = Omit<HubResource, "id" | "createdAt" | "updatedAt">;
type NoteInput = Omit<HubNote, "id" | "createdAt" | "updatedAt">;

interface StudioState {
  resources: HubResource[];
  notes: HubNote[];
  migratedLegacyProjectNoteIds?: string[];
  replaceResources: (resources: HubResource[]) => void;
  replaceNotes: (notes: HubNote[]) => void;
  addResource: (input: ResourceInput) => void;
  updateResource: (id: string, updates: Partial<ResourceInput>) => void;
  deleteResource: (id: string) => void;
  addNote: (input: NoteInput) => HubNote;
  updateNote: (id: string, updates: Partial<NoteInput>) => void;
  deleteNote: (id: string) => void;
  migrateLegacyProjectNotes: (projects: Project[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function createItem<T extends object>(input: T): T & { id: string; createdAt: string; updatedAt: string } {
  const now = stamp();
  return { ...input, id: id(), createdAt: now, updatedAt: now };
}

function normalizeNote(note: HubNote): HubNote {
  return { ...note, clientVisible: Boolean(note.clientVisible), teamVisible: Boolean(note.teamVisible), projectIds: note.projectIds ?? [] };
}

function legacyProjectNoteId(projectId: string, noteId: string) {
  return `legacy-project-note:${projectId}:${noteId}`;
}

function isLegacyProjectNoteId(noteId: string) {
  return noteId.startsWith("legacy-project-note:");
}

function legacyNoteBody(content: string, url?: string) {
  const trimmedContent = content.trim();
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return trimmedContent;
  const linkLine = `[Open link](${trimmedUrl})`;
  return trimmedContent ? `${linkLine}\n\n${trimmedContent}` : linkLine;
}

function projectTag(projectName: string) {
  return projectName.trim() ? `Project: ${projectName.trim()}` : "Project note";
}

function updateItems<T extends { id: string; updatedAt: string }>(items: T[], itemId: string, updates: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>) {
  return items.map((item) => (item.id === itemId ? { ...item, ...updates, updatedAt: stamp() } : item));
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      resources: [],
      notes: [],
      replaceResources: (resources) => set({ resources }),
      replaceNotes: (notes) =>
        set((state) => ({
          notes: notes.map(normalizeNote),
          migratedLegacyProjectNoteIds: mergeLegacyNoteIds(state.migratedLegacyProjectNoteIds, notes.map((note) => note.id)),
        })),
      addResource: (input) => set((state) => ({ resources: [createItem(input), ...state.resources] })),
      updateResource: (itemId, updates) => set((state) => ({ resources: updateItems(state.resources, itemId, updates) })),
      deleteResource: (itemId) => set((state) => ({ resources: state.resources.filter((item) => item.id !== itemId) })),
      addNote: (input) => {
        const note = createItem({ ...input, projectIds: input.projectIds ?? [] });
        set((state) => ({ notes: [note, ...state.notes] }));
        return note;
      },
      updateNote: (itemId, updates) => set((state) => ({ notes: updateItems(state.notes, itemId, updates) })),
      deleteNote: (itemId) =>
        set((state) => ({
          notes: state.notes.filter((item) => item.id !== itemId),
          migratedLegacyProjectNoteIds: isLegacyProjectNoteId(itemId)
            ? mergeLegacyNoteIds(state.migratedLegacyProjectNoteIds, [itemId])
            : state.migratedLegacyProjectNoteIds,
        })),
      migrateLegacyProjectNotes: (projects) =>
        set((state) => {
          const existingIds = new Set(state.notes.map((note) => note.id));
          const migratedLegacyProjectNoteIds = mergeLegacyNoteIds(state.migratedLegacyProjectNoteIds, state.notes.map((note) => note.id));
          const knownMigratedIds = new Set(migratedLegacyProjectNoteIds);
          const migratedNotes: HubNote[] = [];

          projects.forEach((project) => {
            (project.notes ?? []).forEach((note) => {
              const migratedId = legacyProjectNoteId(project.id, note.id);
              if (existingIds.has(migratedId) || knownMigratedIds.has(migratedId)) return;

              migratedNotes.push({
                id: migratedId,
                title: note.title || "Project note",
                body: legacyNoteBody(note.content, note.url),
                tags: note.visibility === "client" ? undefined : projectTag(project.name),
                favorite: false,
                clientVisible: note.visibility === "client",
                teamVisible: false,
                projectIds: note.visibility === "client" ? [project.id] : [],
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
              });
              existingIds.add(migratedId);
              knownMigratedIds.add(migratedId);
              migratedLegacyProjectNoteIds.push(migratedId);
            });
          });

          return {
            notes: migratedNotes.length ? [...migratedNotes, ...state.notes] : state.notes,
            migratedLegacyProjectNoteIds,
          };
        }),
    }),
    {
      name: "align-personal-hub-v1",
      onRehydrateStorage: () => (state) => {
        if (state) state.notes = state.notes.map(normalizeNote);
      },
    },
  ),
);

function mergeLegacyNoteIds(current: string[] | undefined, noteIds: string[]) {
  const merged = new Set(current ?? []);
  noteIds.filter(isLegacyProjectNoteId).forEach((noteId) => merged.add(noteId));
  return [...merged];
}
