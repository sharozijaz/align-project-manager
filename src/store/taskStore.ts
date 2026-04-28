import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoTasks } from "./demoData";
import { normalizeTaskPriority, normalizeTaskStatus } from "../config/taskOptions";
import type { Task, TaskInput, TaskStatus } from "../types/task";

interface TaskState {
  tasks: Task[];
  lastDeletedTaskId?: string;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, updates: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  dismissDeleteNotice: () => void;
  replaceTasks: (tasks: Task[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: demoTasks,
      lastDeletedTaskId: undefined,
      addTask: (input) =>
        set((state) => ({
          tasks: [
            {
              ...input,
              id: id(),
              createdAt: stamp(),
              updatedAt: stamp(),
            },
            ...state.tasks,
          ],
        })),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates, updatedAt: stamp() } : task,
          ),
        })),
      deleteTask: (taskId) =>
        set((state) => ({
          lastDeletedTaskId: taskId,
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, deletedAt: stamp(), updatedAt: stamp() } : task,
          ),
        })),
      restoreTask: (taskId) =>
        set((state) => ({
          lastDeletedTaskId: state.lastDeletedTaskId === taskId ? undefined : state.lastDeletedTaskId,
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, deletedAt: undefined, updatedAt: stamp() } : task,
          ),
        })),
      permanentlyDeleteTask: (taskId) =>
        set((state) => ({
          lastDeletedTaskId: state.lastDeletedTaskId === taskId ? undefined : state.lastDeletedTaskId,
          tasks: state.tasks.filter((task) => task.id !== taskId),
        })),
      completeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, status: "done" satisfies TaskStatus, updatedAt: stamp() }
              : task,
          ),
        })),
      dismissDeleteNotice: () => set({ lastDeletedTaskId: undefined }),
      replaceTasks: (tasks) =>
        set({
          tasks: tasks.map((task) => ({
            ...task,
            priority: normalizeTaskPriority(task.priority),
            status: normalizeTaskStatus(task.status),
          })),
          lastDeletedTaskId: undefined,
        }),
    }),
    { name: "priority-tasks-v1" },
  ),
);
