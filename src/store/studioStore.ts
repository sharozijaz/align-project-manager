import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "../types/project";
import type { HubNote, HubNoteSpace, HubResource } from "../types/studio";

type ResourceInput = Omit<HubResource, "id" | "createdAt" | "updatedAt">;
type NoteInput = Omit<HubNote, "id" | "createdAt" | "updatedAt">;
type NoteSpaceInput = Omit<HubNoteSpace, "id" | "createdAt" | "updatedAt">;

interface StudioState {
  resources: HubResource[];
  notes: HubNote[];
  noteSpaces: HubNoteSpace[];
  migratedLegacyProjectNoteIds?: string[];
  replaceResources: (resources: HubResource[]) => void;
  replaceNotes: (notes: HubNote[]) => void;
  replaceNoteSpaces: (spaces: HubNoteSpace[]) => void;
  addResource: (input: ResourceInput) => void;
  updateResource: (id: string, updates: Partial<ResourceInput>) => void;
  deleteResource: (id: string) => void;
  addNote: (input: NoteInput) => HubNote;
  updateNote: (id: string, updates: Partial<NoteInput>) => void;
  deleteNote: (id: string) => void;
  addNoteSpace: (input: NoteSpaceInput) => HubNoteSpace;
  updateNoteSpace: (id: string, updates: Partial<NoteSpaceInput>) => void;
  deleteNoteSpace: (id: string) => void;
  addNoteToSpace: (spaceId: string, noteId: string) => void;
  removeNoteFromSpace: (spaceId: string, noteId: string) => void;
  migrateLegacyProjectNotes: (projects: Project[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function createItem<T extends object>(input: T): T & { id: string; createdAt: string; updatedAt: string } {
  const now = stamp();
  return { ...input, id: id(), createdAt: now, updatedAt: now };
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

function normalizeNoteSpace(space: HubNoteSpace): HubNoteSpace {
  return {
    ...space,
    name: space.name.trim() || "Untitled space",
    description: space.description?.trim() || undefined,
    projectIds: normalizeIds(space.projectIds),
    manualNoteIds: normalizeIds(space.manualNoteIds),
  };
}

function normalizeIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).filter(Boolean))];
}

function spacesFromLegacyCollections(notes: HubNote[], existingSpaces: HubNoteSpace[] = []) {
  const now = stamp();
  const spacesByName = new Map(existingSpaces.map((space) => [space.name.trim().toLowerCase(), normalizeNoteSpace(space)]));

  notes.forEach((note) => {
    const collection = note.collection?.trim();
    if (!collection) return;

    const key = collection.toLowerCase();
    const current = spacesByName.get(key);
    if (current) {
      spacesByName.set(key, normalizeNoteSpace({ ...current, manualNoteIds: [...current.manualNoteIds, note.id] }));
      return;
    }

    spacesByName.set(key, {
      id: `legacy-collection:${collection}`,
      name: collection,
      projectIds: [],
      manualNoteIds: [note.id],
      createdAt: note.createdAt || now,
      updatedAt: note.updatedAt || now,
    });
  });

  return [...spacesByName.values()].map(normalizeNoteSpace);
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
      noteSpaces: [],
      replaceResources: (resources) => set({ resources }),
      replaceNotes: (notes) =>
        set((state) => ({
          notes: notes.map(normalizeNote),
          noteSpaces: spacesFromLegacyCollections(notes.map(normalizeNote), state.noteSpaces),
          migratedLegacyProjectNoteIds: mergeLegacyNoteIds(state.migratedLegacyProjectNoteIds, notes.map((note) => note.id)),
        })),
      replaceNoteSpaces: (noteSpaces) => set({ noteSpaces: noteSpaces.map(normalizeNoteSpace) }),
      addResource: (input) => set((state) => ({ resources: [createItem(input), ...state.resources] })),
      updateResource: (itemId, updates) => set((state) => ({ resources: updateItems(state.resources, itemId, updates) })),
      deleteResource: (itemId) => set((state) => ({ resources: state.resources.filter((item) => item.id !== itemId) })),
      addNote: (input) => {
        const note = createItem({ ...input, collection: input.collection?.trim() || undefined, projectIds: input.projectIds ?? [], relatedNoteIds: input.relatedNoteIds ?? [] });
        set((state) => ({ notes: [note, ...state.notes] }));
        return note;
      },
      updateNote: (itemId, updates) => set((state) => ({ notes: updateItems(state.notes, itemId, updates) })),
      deleteNote: (itemId) =>
        set((state) => ({
          notes: state.notes.filter((item) => item.id !== itemId),
          noteSpaces: state.noteSpaces.map((space) => normalizeNoteSpace({ ...space, manualNoteIds: space.manualNoteIds.filter((noteId) => noteId !== itemId) })),
          migratedLegacyProjectNoteIds: isLegacyProjectNoteId(itemId)
            ? mergeLegacyNoteIds(state.migratedLegacyProjectNoteIds, [itemId])
            : state.migratedLegacyProjectNoteIds,
        })),
      addNoteSpace: (input) => {
        const space = createItem({
          ...input,
          description: input.description?.trim() || undefined,
          projectIds: normalizeIds(input.projectIds),
          manualNoteIds: normalizeIds(input.manualNoteIds),
        });
        set((state) => ({ noteSpaces: [space, ...state.noteSpaces] }));
        return space;
      },
      updateNoteSpace: (spaceId, updates) =>
        set((state) => {
          const nextUpdates: Partial<NoteSpaceInput> = { ...updates };
          if ("description" in updates) nextUpdates.description = updates.description?.trim() || undefined;
          if (updates.projectIds) nextUpdates.projectIds = normalizeIds(updates.projectIds);
          if (updates.manualNoteIds) nextUpdates.manualNoteIds = normalizeIds(updates.manualNoteIds);
          return { noteSpaces: updateItems(state.noteSpaces, spaceId, nextUpdates).map(normalizeNoteSpace) };
        }),
      deleteNoteSpace: (spaceId) => set((state) => ({ noteSpaces: state.noteSpaces.filter((space) => space.id !== spaceId) })),
      addNoteToSpace: (spaceId, noteId) =>
        set((state) => ({
          noteSpaces: state.noteSpaces.map((space) =>
            space.id === spaceId ? normalizeNoteSpace({ ...space, manualNoteIds: [...space.manualNoteIds, noteId], updatedAt: stamp() }) : space,
          ),
        })),
      removeNoteFromSpace: (spaceId, noteId) =>
        set((state) => ({
          noteSpaces: state.noteSpaces.map((space) =>
            space.id === spaceId ? normalizeNoteSpace({ ...space, manualNoteIds: space.manualNoteIds.filter((id) => id !== noteId), updatedAt: stamp() }) : space,
          ),
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
                projectIds: note.visibility === "client" ? [project.id] : [],
                relatedNoteIds: [],
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
            noteSpaces: spacesFromLegacyCollections(migratedNotes.length ? [...migratedNotes, ...state.notes] : state.notes, state.noteSpaces),
            migratedLegacyProjectNoteIds,
          };
        }),
    }),
    {
      name: "align-personal-hub-v1",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notes = state.notes.map(normalizeNote);
          state.noteSpaces = spacesFromLegacyCollections(state.notes, state.noteSpaces ?? []);
        }
      },
    },
  ),
);

function mergeLegacyNoteIds(current: string[] | undefined, noteIds: string[]) {
  const merged = new Set(current ?? []);
  noteIds.filter(isLegacyProjectNoteId).forEach((noteId) => merged.add(noteId));
  return [...merged];
}
