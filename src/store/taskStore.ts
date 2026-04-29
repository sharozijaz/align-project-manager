import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, addMonths, addWeeks, addYears, formatISO, parseISO } from "date-fns";
import { demoTasks } from "./demoData";
import { normalizeTaskPriority, normalizeTaskRecurrence, normalizeTaskReminder, normalizeTaskStatus } from "../config/taskOptions";
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
              reminder: normalizeTaskReminder(input.reminder),
              recurrence: normalizeTaskRecurrence(input.recurrence),
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
            task.id === taskId
              ? {
                  ...task,
                  ...updates,
                  ...(updates.reminder ? { reminder: normalizeTaskReminder(updates.reminder) } : {}),
                  ...(updates.recurrence ? { recurrence: normalizeTaskRecurrence(updates.recurrence) } : {}),
                  updatedAt: stamp(),
                }
              : task,
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
        set((state) => {
          const completedAt = stamp();
          const task = state.tasks.find((item) => item.id === taskId);
          const completedTasks: Task[] = state.tasks.map((item) =>
            item.id === taskId ? { ...item, status: "done" satisfies TaskStatus, updatedAt: completedAt } : item,
          );
          const nextTask = task ? createNextRecurringTask(task, completedAt) : null;

          return {
            tasks: nextTask ? [nextTask, ...completedTasks] : completedTasks,
          };
        }),
      dismissDeleteNotice: () => set({ lastDeletedTaskId: undefined }),
      replaceTasks: (tasks) =>
        set({
          tasks: tasks.map((task) => ({
            ...task,
            priority: normalizeTaskPriority(task.priority),
            status: normalizeTaskStatus(task.status),
            reminder: normalizeTaskReminder(task.reminder),
            recurrence: normalizeTaskRecurrence(task.recurrence),
          })),
          lastDeletedTaskId: undefined,
        }),
    }),
    { name: "priority-tasks-v1" },
  ),
);

function createNextRecurringTask(task: Task, createdAt: string): Task | null {
  const recurrence = normalizeTaskRecurrence(task.recurrence);
  if (task.status === "done" || recurrence === "none" || !task.dueDate || task.deletedAt) return null;

  const nextDueDate = nextRecurringDate(task.dueDate, recurrence);
  if (!nextDueDate) return null;

  return {
    ...task,
    id: id(),
    status: "not-started",
    dueDate: nextDueDate,
    recurringParentId: task.recurringParentId ?? task.id,
    createdAt,
    updatedAt: createdAt,
    deletedAt: undefined,
  };
}

function nextRecurringDate(dueDate: string, recurrence: Task["recurrence"]) {
  const parsed = parseISO(dueDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const next =
    recurrence === "daily"
      ? addDays(parsed, 1)
      : recurrence === "weekly"
        ? addWeeks(parsed, 1)
        : recurrence === "monthly"
          ? addMonths(parsed, 1)
          : recurrence === "yearly"
            ? addYears(parsed, 1)
            : null;

  return next ? formatISO(next, { representation: "date" }) : null;
}
