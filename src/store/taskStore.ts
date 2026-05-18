import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import { demoTasks } from "./demoData";
import { isTerminalTaskStatus, normalizeTaskPriority, normalizeTaskRecurrence, normalizeTaskReminder, normalizeTaskStatus } from "../config/taskOptions";
import { isSupabaseConfigured } from "../integrations/supabase/client";
import type { Task, TaskInput, TaskStatus } from "../types/task";
import { isDeletedBeyondRetention } from "../utils/trash";

interface TaskState {
  tasks: Task[];
  lastDeletedTaskId?: string;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, updates: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  cleanupDeletedTasks: (retentionDays: number) => void;
  completeTask: (id: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  dismissDeleteNotice: () => void;
  replaceTasks: (tasks: Task[]) => void;
  importTasks: (tasks: Task[]) => void;
  upsertTasks: (tasks: Task[]) => void;
}

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: isSupabaseConfigured ? [] : demoTasks,
      lastDeletedTaskId: undefined,
      addTask: (input) =>
        set((state) => {
          const parentTask = validParentTask(input.parentTaskId, state.tasks);
          const nextTask = {
            ...input,
            projectId: parentTask ? parentTask.projectId : input.projectId,
            category: parentTask ? parentTask.category : input.category,
            priority: normalizeTaskPriority(input.priority),
            status: normalizeTaskStatus(input.status),
            reminder: normalizeTaskReminder(input.reminder),
            recurrence: normalizeTaskRecurrence(input.recurrence),
            parentTaskId: parentTask ? parentTask.id : undefined,
            sortOrder: nextTopSortOrder(state.tasks),
            id: id(),
            createdAt: stamp(),
            updatedAt: stamp(),
          };

          return { tasks: [nextTask, ...state.tasks] };
        }),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;

            const nextProjectId = updates.projectId !== undefined ? updates.projectId : task.projectId;
            const parentTask =
              updates.parentTaskId !== undefined
                ? validParentTask(updates.parentTaskId, state.tasks, taskId, nextProjectId)
                : validParentTask(task.parentTaskId, state.tasks, taskId, nextProjectId);

            return {
              ...task,
              ...updates,
              ...(updates.priority ? { priority: normalizeTaskPriority(updates.priority) } : {}),
              ...(updates.status ? { status: normalizeTaskStatus(updates.status) } : {}),
              ...(updates.reminder ? { reminder: normalizeTaskReminder(updates.reminder) } : {}),
              ...(updates.recurrence ? { recurrence: normalizeTaskRecurrence(updates.recurrence) } : {}),
              parentTaskId: parentTask ? parentTask.id : undefined,
              updatedAt: stamp(),
            };
          }),
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
      cleanupDeletedTasks: (retentionDays) =>
        set((state) => ({
          lastDeletedTaskId:
            state.lastDeletedTaskId &&
            state.tasks.some((task) => task.id === state.lastDeletedTaskId && isDeletedBeyondRetention(task.deletedAt, retentionDays))
              ? undefined
              : state.lastDeletedTaskId,
          tasks: state.tasks.filter((task) => !isDeletedBeyondRetention(task.deletedAt, retentionDays)),
        })),
      completeTask: (taskId) =>
        set((state) => {
          const completedAt = stamp();
          const task = state.tasks.find((item) => item.id === taskId);
          if (!task || isTerminalTaskStatus(task.status)) {
            return { tasks: state.tasks };
          }

          const completedTasks: Task[] = state.tasks.map((item) =>
            item.id === taskId ? { ...item, status: "done" satisfies TaskStatus, updatedAt: completedAt } : item,
          );
          const nextTask = createNextRecurringTask(task, completedAt, nextBottomSortOrder(completedTasks));

          return {
            tasks: nextTask ? [...completedTasks, nextTask].sort(compareSortOrder) : completedTasks,
          };
        }),
      reorderTasks: (orderedIds) =>
        set((state) => {
          const order = new Map(orderedIds.map((taskId, index) => [taskId, index]));
          return {
            tasks: state.tasks
              .map((task) => (order.has(task.id) ? { ...task, sortOrder: order.get(task.id), updatedAt: stamp() } : task))
              .sort(compareSortOrder),
          };
        }),
      dismissDeleteNotice: () => set({ lastDeletedTaskId: undefined }),
      replaceTasks: (tasks) =>
        set({
          tasks: normalizeTaskOrder(tasks),
          lastDeletedTaskId: undefined,
        }),
      importTasks: (tasks) =>
        set((state) => {
          const existingIds = new Set(state.tasks.map((task) => task.id));
          const importedTasks = tasks.filter((task) => !existingIds.has(task.id));

          return {
            tasks: normalizeTaskOrder([...importedTasks, ...state.tasks]),
            lastDeletedTaskId: undefined,
          };
        }),
      upsertTasks: (tasks) =>
        set((state) => {
          const incoming = new Map(tasks.map((task) => [task.id, task]));
          const existingIds = new Set(state.tasks.map((task) => task.id));
          const mergedTasks = state.tasks.map((task) => incoming.get(task.id) ?? task);
          const newTasks = tasks.filter((task) => !existingIds.has(task.id));

          return {
            tasks: normalizeTaskOrder([...newTasks, ...mergedTasks]),
            lastDeletedTaskId: undefined,
          };
        }),
    }),
    { name: "priority-tasks-v1" },
  ),
);

function normalizeTaskOrder(tasks: Task[]) {
  return tasks
    .filter((task) => !isRemovedPrototypeTask(task))
    .map((task, index) => {
      const cleanedTask = stripRemovedPrototypeFields(task);

      return {
        ...cleanedTask,
        priority: normalizeTaskPriority(task.priority),
        status: normalizeTaskStatus(task.status),
        reminder: normalizeTaskReminder(task.reminder),
        recurrence: normalizeTaskRecurrence(task.recurrence),
        parentTaskId: task.parentTaskId || undefined,
        sortOrder: Number.isFinite(task.sortOrder) ? task.sortOrder : index,
      };
    })
    .sort(compareSortOrder);
}

function isRemovedPrototypeTask(task: Task) {
  const record = task as Task & Record<string, unknown>;
  const sourceType = record.sourceType;
  const title = task.title.trim().toLowerCase();

  return (
    record.taskType === "routine" ||
    title === "new routine" ||
    sourceType === "inbox" ||
    sourceType === "money" ||
    sourceType === "people" ||
    sourceType === "goal"
  );
}

function stripRemovedPrototypeFields(task: Task) {
  const cleanedTask = { ...task } as Task & Record<string, unknown>;
  delete cleanedTask.lifeAreaId;
  delete cleanedTask.taskType;
  delete cleanedTask.sourceType;
  delete cleanedTask.linkedGoalId;
  delete cleanedTask.linkedPersonId;
  delete cleanedTask.linkedMoneyReminderId;

  return cleanedTask as Task;
}

function compareSortOrder(a: Task, b: Task) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.createdAt.localeCompare(a.createdAt);
}

function nextTopSortOrder(tasks: Task[]) {
  const orders = tasks.map((task) => task.sortOrder).filter((value): value is number => Number.isFinite(value));
  return orders.length ? Math.min(...orders) - 1 : 0;
}

function nextBottomSortOrder(tasks: Task[]) {
  const orders = tasks.map((task) => task.sortOrder).filter((value): value is number => Number.isFinite(value));
  return orders.length ? Math.max(...orders) + 1 : 0;
}

function validParentTask(parentTaskId: string | undefined, tasks: Task[], taskId?: string, projectId?: string) {
  if (!parentTaskId || parentTaskId === taskId) return undefined;

  const parentTask = tasks.find((task) => task.id === parentTaskId && !task.deletedAt);
  if (!parentTask || parentTask.parentTaskId) return undefined;
  if (projectId !== undefined && parentTask.projectId !== projectId) return undefined;

  return parentTask;
}

function createNextRecurringTask(task: Task, createdAt: string, sortOrder: number): Task | null {
  const recurrence = normalizeTaskRecurrence(task.recurrence);
  if (isTerminalTaskStatus(task.status) || recurrence === "none" || !task.dueDate || task.deletedAt) return null;

  const nextDueDate = nextRecurringDate(task.dueDate, recurrence);
  if (!nextDueDate) return null;

  return {
    ...task,
    id: id(),
    status: "not_started",
    startDate: nextRecurringStartDate(task.startDate, task.dueDate, nextDueDate) ?? undefined,
    dueDate: nextDueDate,
    plannedMonth: undefined,
    plannedWeekStart: undefined,
    sortOrder,
    recurringParentId: task.recurringParentId ?? task.id,
    parentTaskId: task.parentTaskId,
    createdAt,
    updatedAt: createdAt,
    deletedAt: undefined,
  };
}


function nextRecurringStartDate(startDate: string | undefined, dueDate: string, nextDueDate: string) {
  if (!startDate) return null;
  const parsedStart = parseISO(startDate);
  const parsedDue = parseISO(dueDate);
  const parsedNextDue = parseISO(nextDueDate);
  if ([parsedStart, parsedDue, parsedNextDue].some((date) => Number.isNaN(date.getTime()))) return null;

  const duration = Math.max(0, differenceInCalendarDays(parsedDue, parsedStart));
  return formatISO(addDays(parsedNextDue, -duration), { representation: "date" });
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
