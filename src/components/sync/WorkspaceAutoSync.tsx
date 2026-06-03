import { useEffect, useMemo, useRef } from "react";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useCalendarStore } from "../../store/calendarStore";
import { useProjectStore } from "../../store/projectStore";
import { useStudioStore } from "../../store/studioStore";
import { useSyncStore } from "../../store/syncStore";
import { useTaskStore } from "../../store/taskStore";
import { errorMessage } from "../../utils/errors";
import { saveWorkspaceSafetyBackup } from "../../utils/storage";
import { clearWorkspaceOwnerId, getWorkspaceOwnerId, setWorkspaceOwnerId } from "../../utils/workspaceIdentity";

const hasWorkspaceData = (workspace: { tasks: unknown[]; projects: unknown[]; events: unknown[]; resources: unknown[]; notes: unknown[]; noteSpaces?: unknown[] }) =>
  workspace.tasks.length > 0 || workspace.projects.length > 0 || workspace.events.length > 0 || workspace.resources.length > 0 || workspace.notes.length > 0 || Boolean(workspace.noteSpaces?.length);

export function WorkspaceAutoSync() {
  const { session, loading, isConfigured } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const projects = useProjectStore((state) => state.projects);
  const events = useCalendarStore((state) => state.events);
  const resources = useStudioStore((state) => state.resources);
  const notes = useStudioStore((state) => state.notes);
  const noteSpaces = useStudioStore((state) => state.noteSpaces);
  const replaceTasks = useTaskStore((state) => state.replaceTasks);
  const replaceProjects = useProjectStore((state) => state.replaceProjects);
  const replaceEvents = useCalendarStore((state) => state.replaceEvents);
  const replaceResources = useStudioStore((state) => state.replaceResources);
  const replaceNotes = useStudioStore((state) => state.replaceNotes);
  const replaceNoteSpaces = useStudioStore((state) => state.replaceNoteSpaces);
  const upsertTasks = useTaskStore((state) => state.upsertTasks);
  const setSyncState = useSyncStore((state) => state.setSyncState);
  const setSynced = useSyncStore((state) => state.setSynced);
  const syncMode = useSyncStore((state) => state.mode);
  const sessionId = session?.user.id;
  const pulledSessionRef = useRef<string | undefined>(undefined);
  const readyToPushRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const clearedSignedOutRef = useRef(false);
  const isolatedAccountRef = useRef<string | undefined>(undefined);
  const workspaceSnapshot = useMemo(
    () => JSON.stringify({ tasks, projects, events, resources, notes, noteSpaces }),
    [events, noteSpaces, notes, projects, resources, tasks],
  );

  const saveSafetyBackup = (reason: string) =>
    saveWorkspaceSafetyBackup(reason, { tasks, projects, events, resources, notes, noteSpaces });

  useEffect(() => {
    if (isConfigured && loading) {
      return;
    }

    const currentWorkspace = { tasks, projects, events, resources, notes, noteSpaces };
    const hasLocalData = hasWorkspaceData(currentWorkspace);

    if (isConfigured && !sessionId) {
      readyToPushRef.current = false;
      pulledSessionRef.current = undefined;
      if (!clearedSignedOutRef.current) {
        if (hasLocalData) saveSafetyBackup("signed-out");
        applyingCloudRef.current = true;
        replaceTasks([]);
        replaceProjects([]);
        replaceEvents([]);
        replaceResources([]);
        replaceNotes([]);
        replaceNoteSpaces([]);
        clearWorkspaceOwnerId();
        isolatedAccountRef.current = undefined;
        setSyncState("idle", "Signed out. Local workspace cleared after a safety backup was saved on this device.");
        window.setTimeout(() => {
          applyingCloudRef.current = false;
        }, 0);
        clearedSignedOutRef.current = true;
      }
      return;
    }

    if (isConfigured && sessionId) {
      const previousSessionId = getWorkspaceOwnerId();
      const isUnownedLocalWorkspace = !previousSessionId && hasLocalData;
      const isDifferentAccount = previousSessionId !== "" && previousSessionId !== sessionId;
      const mustIsolateWorkspace = (isDifferentAccount || isUnownedLocalWorkspace) && isolatedAccountRef.current !== sessionId;

      if (mustIsolateWorkspace) {
        if (hasLocalData) saveSafetyBackup("account-switch");
        applyingCloudRef.current = true;
        readyToPushRef.current = false;
        pulledSessionRef.current = undefined;
        replaceTasks([]);
        replaceProjects([]);
        replaceEvents([]);
        replaceResources([]);
        replaceNotes([]);
        replaceNoteSpaces([]);
        setWorkspaceOwnerId(sessionId);
        isolatedAccountRef.current = sessionId;
        setSyncState("idle", "Account switched. Local workspace isolated after a safety backup was saved on this device.");
        window.setTimeout(() => {
          applyingCloudRef.current = false;
        }, 0);
        return;
      }

      if (!previousSessionId) {
        setWorkspaceOwnerId(sessionId);
      }
      clearedSignedOutRef.current = false;
    }

    if (syncMode !== "cloud") {
      readyToPushRef.current = false;
      pulledSessionRef.current = undefined;
      applyingCloudRef.current = false;
      clearedSignedOutRef.current = false;
      setSyncState(
        "idle",
        syncMode === "paused"
          ? "Cloud sync is paused. Manual upload and download are still available."
          : "Local-only mode is active. Cloud upload and download are disabled.",
      );
      return;
    }

    if (!isConfigured || !sessionId) {
      readyToPushRef.current = false;
      pulledSessionRef.current = undefined;
      if (!isConfigured) {
        setSyncState("error", "Cloud sync unavailable. Local data is safe on this device.");
        return;
      }
      return;
    }

    if (pulledSessionRef.current === sessionId) return;

    let cancelled = false;
    pulledSessionRef.current = sessionId;
    readyToPushRef.current = false;
    clearedSignedOutRef.current = false;

    const hadLocalDataAtPullStart = hasWorkspaceData({ tasks, projects, events, resources, notes, noteSpaces });
    const wasIsolatedForThisSession = isolatedAccountRef.current === sessionId;

    setSyncState("pulling", "Downloading cloud workspace...");

    void pullWorkspaceFromSupabase()
      .then(async (cloudWorkspace) => {
        if (cancelled) return;

        if (hasWorkspaceData(cloudWorkspace)) {
          applyingCloudRef.current = true;
          upsertTasks(cloudWorkspace.tasks);
          replaceProjects(cloudWorkspace.projects);
          replaceEvents(cloudWorkspace.events);
          replaceResources(cloudWorkspace.resources);
          replaceNotes(cloudWorkspace.notes);
          if (!cloudWorkspace.noteSpacesUnavailable) replaceNoteSpaces(cloudWorkspace.noteSpaces);
          window.setTimeout(() => {
            applyingCloudRef.current = false;
            readyToPushRef.current = true;
          }, 0);

          setWorkspaceOwnerId(sessionId);
          isolatedAccountRef.current = undefined;
          setSynced("Cloud workspace downloaded.");
          return;
        }

        if (!wasIsolatedForThisSession && hadLocalDataAtPullStart) {
          readyToPushRef.current = true;
          setSyncState("error", "Cloud sync unavailable. Local data is safe on this device.");
          return;
        }

        setWorkspaceOwnerId(sessionId);
        isolatedAccountRef.current = undefined;
        readyToPushRef.current = true;
        setSynced("Cloud workspace is empty. Fresh workspace ready.");
      })
      .catch((error) => {
        if (cancelled) return;
        readyToPushRef.current = false;
        setSyncState("error", `${errorMessage(error, "Cloud sync unavailable.")} Local data is safe on this device.`);
      });

    return () => {
      cancelled = true;
    };
  }, [
    events,
    isConfigured,
    loading,
    projects,
    replaceEvents,
    replaceNotes,
    replaceNoteSpaces,
    replaceProjects,
    replaceResources,
    replaceTasks,
    resources,
    sessionId,
    setSyncState,
    setSynced,
    syncMode,
    tasks,
    upsertTasks,
    noteSpaces,
    notes,
  ]);

  useEffect(() => {
    if (syncMode !== "cloud" || !isConfigured || !sessionId || !readyToPushRef.current || applyingCloudRef.current) return;

    const ownerId = getWorkspaceOwnerId();
    if (ownerId && ownerId !== sessionId) {
      readyToPushRef.current = false;
      setSyncState("error", "Cloud upload blocked because this local workspace belongs to another account.");
      return;
    }

    setSyncState("pushing", "Saving workspace to cloud...");
    const timeout = window.setTimeout(() => {
      void pushWorkspaceToSupabase({ tasks, projects, events, resources, notes, noteSpaces })
        .then(() => setSynced("Workspace saved to cloud."))
        .catch((error) => setSyncState("error", errorMessage(error, "Could not save workspace to cloud.")));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [events, isConfigured, noteSpaces, notes, projects, resources, sessionId, setSyncState, setSynced, syncMode, tasks, workspaceSnapshot]);

  return null;
}
