import { useEffect, useState } from "react";
import type { TaskViewMode } from "../components/tasks/TaskViewToggle";
import { loadJson, saveJson } from "../utils/storage";

const key = "align-task-view-mode";

export function useTaskViewPreference() {
  const [view, setView] = useState<TaskViewMode>(() => loadJson<TaskViewMode>(key, "cards"));

  useEffect(() => {
    saveJson(key, view);
  }, [view]);

  return [view, setView] as const;
}
