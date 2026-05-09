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
  const sessionId = session?.user.id;
  const pulledSessionRef = useRef<string | undefined>(undefined);
  const readyToPushRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const clearedSignedOutRef = useRef(false);
  const workspaceSnapshot = useMemo(
    () => JSON.stringify({ tasks, projects, events, resources, notes }),
    [events, notes, projects, resources, tasks],
  );

  useEffect(() => {
    if (!isConfigured || !sessionId) {
      readyToPushRef.current = false;
      pulledSessionRef.current = undefined;
      if (isConfigured && !clearedSignedOutRef.current) {
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
    if (previousSessionId !== sessionId) {
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

        applyingCloudRef.current = true;
        replaceTasks([]);
        replaceProjects([]);
        replaceEvents([]);
        replaceResources([]);
        replaceNotes([]);
        window.setTimeout(() => {
          applyingCloudRef.current = false;
          readyToPushRef.current = true;
        }, 0);
        setSynced("Cloud workspace is empty. Fresh workspace ready.");
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
    tasks,
    notes,
  ]);

  useEffect(() => {
    if (!isConfigured || !sessionId || !readyToPushRef.current || applyingCloudRef.current) return;

    setSyncState("pushing", "Saving workspace to cloud...");
    const timeout = window.setTimeout(() => {
      void pushWorkspaceToSupabase({ tasks, projects, events, resources, notes })
        .then(() => setSynced("Workspace saved to cloud."))
        .catch((error) => setSyncState("error", errorMessage(error, "Could not save workspace to cloud.")));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [events, isConfigured, notes, projects, resources, sessionId, setSyncState, setSynced, tasks, workspaceSnapshot]);

  return null;
}
