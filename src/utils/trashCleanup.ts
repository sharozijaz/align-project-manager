import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import {
  AUTO_CLEANUP_DELETED_PROJECTS_KEY,
  AUTO_CLEANUP_DELETED_TASKS_KEY,
  TRASH_PROJECT_RETENTION_DAYS,
  TRASH_TASK_RETENTION_DAYS,
  getTrashCleanupPreference,
} from "./trash";

export function cleanupTrash() {
  if (getTrashCleanupPreference(AUTO_CLEANUP_DELETED_TASKS_KEY)) {
    useTaskStore.getState().cleanupDeletedTasks(TRASH_TASK_RETENTION_DAYS);
  }

  if (getTrashCleanupPreference(AUTO_CLEANUP_DELETED_PROJECTS_KEY)) {
    useProjectStore.getState().cleanupDeletedProjects(TRASH_PROJECT_RETENTION_DAYS);
  }
}
