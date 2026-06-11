import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkspaceBackup } from "../utils/storage";

interface RestorePoint {
  id: string;
  reason: string;
  createdAt: string;
  backup: WorkspaceBackup;
}

interface RestorePointState {
  restorePoints: RestorePoint[];
  addRestorePoint: (reason: string, backup: WorkspaceBackup) => RestorePoint;
  deleteRestorePoint: (id: string) => void;
  clearRestorePoints: () => void;
}

const MAX_RESTORE_POINTS = 5;

export const useRestorePointStore = create<RestorePointState>()(
  persist(
    (set) => ({
      restorePoints: [],
      addRestorePoint: (reason, backup) => {
        const restorePoint = {
          id: crypto.randomUUID(),
          reason,
          createdAt: new Date().toISOString(),
          backup,
        };
        set((state) => ({ restorePoints: [restorePoint, ...state.restorePoints].slice(0, MAX_RESTORE_POINTS) }));
        return restorePoint;
      },
      deleteRestorePoint: (id) => set((state) => ({ restorePoints: state.restorePoints.filter((point) => point.id !== id) })),
      clearRestorePoints: () => set({ restorePoints: [] }),
    }),
    { name: "align-restore-points-v1" },
  ),
);
