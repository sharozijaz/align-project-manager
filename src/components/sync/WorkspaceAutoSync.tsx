import { useEffect, useMemo, useRef } from "react";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useCalendarStore } from "../../store/calendarStore";
import { useProjectStore } from "../../store/projectStore";
import { useSyncStore } from "../../store/syncStore";
import { useTaskStore } from "../../store/taskStore";
import { errorMessage } from "../../utils/errors";

const hasWorkspaceData = (workspace: { tasks: unknown[]; projects: unknown[]; events: unknown[] }) =>
  workspace.tasks.length > 0 || workspace.projects.length > 0 || workspace.events.length > 0;

export function WorkspaceAutoSync() {
  const { session, isConfigured } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const projects = useProjectStore((state) => state.projects);
  const events = useCalendarStore((state) => state.events);
  const replaceTasks = useTaskStore((state) => state.replaceTasks);
  const replaceProjects = useProjectStore((state) => state.replaceProjects);
  const replaceEvents = useCalendarStore((state) => state.replaceEvents);
  const setSyncState = useSyncStore((state) => state.setSyncState);
  const setSynced = useSyncStore((state) => state.setSynced);
  const sessionId = session?.user.id;
  const pulledSessionRef = useRef<string | undefined>(undefined);
  const readyToPushRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const workspaceSnapshot = useMemo(
    () => JSON.stringify({ tasks, projects, events }),
    [events, projects, tasks],
  );

  useEffect(() => {
    if (!isConfigured || !sessionId) {
      readyToPushRef.current = false;
      pulledSessionRef.current = undefined;
      return;
    }

    if (pulledSessionRef.current === sessionId) return;

    let cancelled = false;
    pulledSessionRef.current = sessionId;
    readyToPushRef.current = false;
    setSyncState("pulling", "Downloading cloud workspace...");

    void pullWorkspaceFromSupabase()
      .then(async (cloudWorkspace) => {
        if (cancelled) return;

        if (hasWorkspaceData(cloudWorkspace)) {
          applyingCloudRef.current = true;
          replaceTasks(cloudWorkspace.tasks);
          replaceProjects(cloudWorkspace.projects);
          replaceEvents(cloudWorkspace.events);
          window.setTimeout(() => {
            applyingCloudRef.current = false;
            readyToPushRef.current = true;
          }, 0);
          setSynced("Cloud workspace downloaded.");
          return;
        }

        setSyncState("pushing", "Cloud is empty. Uploading local workspace...");
        await pushWorkspaceToSupabase({ tasks, projects, events });
        if (cancelled) return;
        readyToPushRef.current = true;
        setSynced("Local workspace uploaded to cloud.");
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
    replaceProjects,
    replaceTasks,
    sessionId,
    setSyncState,
    setSynced,
    tasks,
  ]);

  useEffect(() => {
    if (!isConfigured || !sessionId || !readyToPushRef.current || applyingCloudRef.current) return;

    setSyncState("pushing", "Saving workspace to cloud...");
    const timeout = window.setTimeout(() => {
      void pushWorkspaceToSupabase({ tasks, projects, events })
        .then(() => setSynced("Workspace saved to cloud."))
        .catch((error) => setSyncState("error", errorMessage(error, "Could not save workspace to cloud.")));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [events, isConfigured, projects, sessionId, setSyncState, setSynced, tasks, workspaceSnapshot]);

  return null;
}
