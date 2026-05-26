import { useEffect } from "react";
import { useFeatureAccess } from "../../features/access/FeatureAccessProvider";
import { listOwnedCollaborationProjectIds, subscribeToProjectTaskChanges } from "../../integrations/supabase/collaboration";
import { useTaskStore } from "../../store/taskStore";

export function ProjectCollaborationLiveSync() {
  const { access } = useFeatureAccess();
  const upsertTasks = useTaskStore((state) => state.upsertTasks);
  const canListen = access?.source !== "collaboration" && access?.profile.role === "owner";

  useEffect(() => {
    if (!canListen) return undefined;

    let cleanup: () => void = () => {};
    let mounted = true;

    listOwnedCollaborationProjectIds()
      .then((projectIds) => {
        if (!mounted || !projectIds.length) return;
        cleanup = subscribeToProjectTaskChanges(projectIds, (task) => {
          if (task) upsertTasks([task]);
        });
      })
      .catch((error) => console.warn("Project collaboration realtime unavailable.", error));

    return () => {
      mounted = false;
      cleanup();
    };
  }, [canListen, upsertTasks]);

  return null;
}
