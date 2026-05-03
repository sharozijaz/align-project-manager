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
  const workspaceSnapshot = useMemo(
    () => JSON.stringify({ tasks, projects, events, resources, notes }),
    [events, notes, projects, resources, tasks],
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
          const shouldUploadLocalHub = (resources.length > 0 || notes.length > 0) && cloudWorkspace.resources.length === 0 && cloudWorkspace.notes.length === 0;
          const nextResources = cloudWorkspace.resources.length ? cloudWorkspace.resources : resources;
          const nextNotes = cloudWorkspace.notes.length ? cloudWorkspace.notes : notes;

          applyingCloudRef.current = true;
          replaceTasks(cloudWorkspace.tasks);
          replaceProjects(cloudWorkspace.projects);
          replaceEvents(cloudWorkspace.events);
          replaceResources(nextResources);
          replaceNotes(nextNotes);
          window.setTimeout(() => {
            applyingCloudRef.current = false;
            readyToPushRef.current = true;
          }, 0);

          if (shouldUploadLocalHub) {
            await pushWorkspaceToSupabase({
              tasks: cloudWorkspace.tasks,
              projects: cloudWorkspace.projects,
              events: cloudWorkspace.events,
              resources: nextResources,
              notes: nextNotes,
            });
          }

          setSynced("Cloud workspace downloaded.");
          return;
        }

        setSyncState("pushing", "Cloud is empty. Uploading local workspace...");
        await pushWorkspaceToSupabase({ tasks, projects, events, resources, notes });
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
