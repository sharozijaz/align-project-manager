import { useEffect, useMemo, useRef } from "react";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useCalendarStore } from "../../store/calendarStore";
import { useProjectStore } from "../../store/projectStore";
import { useStudioStore } from "../../store/studioStore";
import { useSyncStore } from "../../store/syncStore";
import { useTaskStore } from "../../store/taskStore";
import { errorMessage } from "../../utils/errors";

const hasWorkspaceData = (workspace: { tasks: unknown[]; projects: unknown[]; events: unknown[]; resources: unknown[]; notes: unknown[] }) =>
  workspace.tasks.length > 0 || workspace.projects.length > 0 || workspace.events.length > 0 || workspace.resources.length > 0 || workspace.notes.length > 0;

const WORKSPACE_SESSION_KEY = "align-workspace-session-user-v1";
const WORKSPACE_BACKUP_KEY = "align-workspace-pre-clear-backup-v1";

export function WorkspaceAutoSync() {
  const { session, isConfigured } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const projects = useProjectStore((state) => state.projects);
  const events = useCalendarStore((state) => state.events);
  const resources = useStudioStore((state) => state.resources);
  const notes = useStudioStore((state) => state.notes);
  const replaceTasks = useTaskStore((state) => state.replaceTasks);
  const replaceProjects = useProjectStore((state) => state.replaceProjects);
  const replaceEvents = useCalendarStore((state) => state.replaceEvents);
  const replaceResources = useStudioStore((state) => state.replaceResources);
  const replaceNotes = useStudioStore((state) => state.replaceNotes);
  const setSyncState = useSyncStore((state) => state.setSyncState);
  const setSynced = useSyncStore((state) => state.setSynced);
  const syncMode = useSyncStore((state) => state.mode);
  const sessionId = session?.user.id;
  const pulledSessionRef = useRef<string | undefined>(undefined);
  const readyToPushRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const clearedSignedOutRef = useRef(false);
  const workspaceSnapshot = useMemo(
    () => JSON.stringify({ tasks, projects, events, resources, notes }),
    [events, notes, projects, resources, tasks],
  );

  const backupWorkspaceBeforeClear = (reason: string) => {
    window.localStorage.setItem(
      WORKSPACE_BACKUP_KEY,
      JSON.stringify({
        reason,
        backedUpAt: new Date().toISOString(),
        tasks,
        projects,
        events,
        resources,
        notes,
      }),
    );
  };

  useEffect(() => {
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
      if (isConfigured && !clearedSignedOutRef.current) {
        backupWorkspaceBeforeClear("signed-out");
        applyingCloudRef.current = true;
        replaceTasks([]);
        replaceProjects([]);
        replaceEvents([]);
        replaceResources([]);
        replaceNotes([]);
        window.localStorage.removeItem(WORKSPACE_SESSION_KEY);
        window.setTimeout(() => {
          applyingCloudRef.current = false;
        }, 0);
        clearedSignedOutRef.current = true;
      }
      return;
    }

    if (pulledSessionRef.current === sessionId) return;

    let cancelled = false;
    pulledSessionRef.current = sessionId;
    readyToPushRef.current = false;
    clearedSignedOutRef.current = false;

    const previousSessionId = window.localStorage.getItem(WORKSPACE_SESSION_KEY);
    const localWorkspaceAtPullStart = { tasks, projects, events, resources, notes };
    const hadLocalDataAtPullStart = hasWorkspaceData(localWorkspaceAtPullStart);
    const isKnownAccountSwitch = Boolean(previousSessionId && previousSessionId !== sessionId);

    if (isKnownAccountSwitch) {
      backupWorkspaceBeforeClear("account-switch");
      applyingCloudRef.current = true;
      replaceTasks([]);
      replaceProjects([]);
      replaceEvents([]);
      replaceResources([]);
      replaceNotes([]);
      window.localStorage.setItem(WORKSPACE_SESSION_KEY, sessionId);
      window.setTimeout(() => {
        applyingCloudRef.current = false;
      }, 0);
    }

    setSyncState("pulling", "Downloading cloud workspace...");

    void pullWorkspaceFromSupabase()
      .then(async (cloudWorkspace) => {
        if (cancelled) return;

        if (hasWorkspaceData(cloudWorkspace)) {
          applyingCloudRef.current = true;
          replaceTasks(cloudWorkspace.tasks);
          replaceProjects(cloudWorkspace.projects);
          replaceEvents(cloudWorkspace.events);
          replaceResources(cloudWorkspace.resources);
          replaceNotes(cloudWorkspace.notes);
          window.setTimeout(() => {
            applyingCloudRef.current = false;
            readyToPushRef.current = true;
          }, 0);

          setSynced("Cloud workspace downloaded.");
          return;
        }

        if (isKnownAccountSwitch || !hadLocalDataAtPullStart) {
          applyingCloudRef.current = true;
          replaceTasks([]);
          replaceProjects([]);
          replaceEvents([]);
          replaceResources([]);
          replaceNotes([]);
          window.setTimeout(() => {
            applyingCloudRef.current = false;
            readyToPushRef.current = !isKnownAccountSwitch;
          }, 0);
          setSynced("Cloud workspace is empty. Fresh workspace ready.");
          return;
        }

        readyToPushRef.current = true;
        setSynced("Cloud workspace is empty. Keeping local workspace.");
      })
      .catch((error) => {
        if (cancelled) return;
        readyToPushRef.current = false;
        setSyncState("error", errorMessage(error, "Could not sync workspace."));
      });

    return () => {
      cancelled = true;
    };
  }, [
    events,
    isConfigured,
    projects,
    replaceEvents,
    replaceNotes,
    replaceProjects,
    replaceResources,
    replaceTasks,
    resources,
    sessionId,
    setSyncState,
    setSynced,
    syncMode,
    tasks,
    notes,
  ]);

  useEffect(() => {
    if (syncMode !== "cloud" || !isConfigured || !sessionId || !readyToPushRef.current || applyingCloudRef.current) return;

    setSyncState("pushing", "Saving workspace to cloud...");
    const timeout = window.setTimeout(() => {
      void pushWorkspaceToSupabase({ tasks, projects, events, resources, notes })
        .then(() => setSynced("Workspace saved to cloud."))
        .catch((error) => setSyncState("error", errorMessage(error, "Could not save workspace to cloud.")));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [events, isConfigured, notes, projects, resources, sessionId, setSyncState, setSynced, syncMode, tasks, workspaceSnapshot]);

  return null;
}
