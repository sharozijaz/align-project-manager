import { FolderKanban } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TaskCard } from "./TaskCard";
import { TaskTable } from "./TaskTable";
import type { TaskViewMode } from "./TaskViewToggle";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";
import { getClampedDragPreviewPosition } from "../../utils/dragPreview";
import type { ProjectTaskFieldVisibility } from "../projects/projectTaskFields";

type TaskDragState = { id: string; groupIds: string[]; startX: number; startY: number; x: number; y: number; active: boolean };

export function TaskList({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  onOpenTask,
  emptyText = "No tasks match this view.",
  view = "cards",
  lockedProjectId,
  onReorder,
  groupByProject = false,
  visibleFields,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onOpenTask?: (task: Task) => void;
  emptyText?: string;
  view?: TaskViewMode;
  lockedProjectId?: string;
  onReorder?: (orderedIds: string[]) => void;
  groupByProject?: boolean;
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  const [taskDrag, setTaskDrag] = useState<TaskDragState | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const taskDragRef = useRef<TaskDragState | null>(null);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const taskGroups = useMemo(() => groupTasksByProject(tasks, projectById), [projectById, tasks]);
  const draggedTaskId = taskDrag?.id ?? null;
  const draggedTask = draggedTaskId ? tasks.find((task) => task.id === draggedTaskId) : undefined;

  useEffect(() => {
    taskDragRef.current = taskDrag;
  }, [taskDrag]);

  useEffect(() => {
    if (!taskDrag || !onReorder) return;

    const handlePointerMove = (event: PointerEvent) => {
      setTaskDrag((current) => {
        if (!current) return current;
        const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
        const active = current.active || distance > 8;

        if (active) {
          setDragOverId(getTaskDropTarget(event.clientX, event.clientY, current.id, current.groupIds));
        }

        return { ...current, x: event.clientX, y: event.clientY, active };
      });
    };

    const handlePointerUp = () => {
      const current = taskDragRef.current;

      if (current?.active && dragOverId && current.id !== dragOverId) {
        onReorder(swapTaskSlots(current.groupIds, current.id, dragOverId));
      }

      setTaskDrag(null);
      setDragOverId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragOverId, onReorder, taskDrag]);

  if (!tasks.length) {
    return (
      <motion.div
        className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {emptyText}
      </motion.div>
    );
  }

  const renderCards = (activeTasks: Task[], options?: { hideProjectBadge?: boolean }) => (
    <motion.div className="space-y-3" layout>
      <AnimatePresence initial={false}>
      {activeTasks.map((task) => {
        const project = task.projectId ? projectById.get(task.projectId) : undefined;
        const groupIds = activeTasks.map((item) => item.id);

        return (
        <motion.div
          key={task.id}
          data-task-reorder-id={task.id}
          layout
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
          onPointerDown={(event) => {
            if (!onReorder || event.button !== 0 || isInteractiveTaskDragTarget(event.target)) return;
            event.preventDefault();
            setTaskDrag({ id: task.id, groupIds, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, active: false });
          }}
          className={`relative min-w-0 rounded-[var(--radius-md)] transition-[opacity,transform] duration-150 ${
            onReorder ? "cursor-grab active:cursor-grabbing" : ""
          } ${taskDrag?.active && draggedTaskId === task.id ? "align-drag-source" : ""}`}
        >
          {taskDrag?.active && dragOverId === task.id && draggedTaskId !== task.id ? <TaskDropCue /> : null}
          <TaskCard
            task={task}
            projects={projects}
            project={project}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onComplete={onComplete}
            onOpen={onOpenTask}
            visibleFields={visibleFields}
            showProjectBadge={!options?.hideProjectBadge}
          />
        </motion.div>
        );
      })}
      </AnimatePresence>
    </motion.div>
  );

  const dragPreview = taskDrag?.active && draggedTask ? <TaskDragPreview task={draggedTask} project={draggedTask.projectId ? projectById.get(draggedTask.projectId) : undefined} x={taskDrag.x} y={taskDrag.y} /> : null;

  const cards = groupByProject ? (
    <>
      <div className="space-y-4">
        {taskGroups.map((group) => (
          <section key={group.key} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <ProjectTaskGroupHeader project={group.project} fallbackLabel={group.label} count={group.tasks.length} />
            <div className="p-3 sm:p-4">{renderCards(group.tasks, { hideProjectBadge: Boolean(group.project) })}</div>
          </section>
        ))}
      </div>
      {dragPreview}
    </>
  ) : (
    <>
      {renderCards(tasks)}
      {dragPreview}
    </>
  );

  if (view === "cards") return cards;

  return (
    <>
      <div className="md:hidden">{cards}</div>
      <div className="hidden md:block">
        <TaskTable
          tasks={tasks}
          projects={projects}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onComplete={onComplete}
          onOpen={onOpenTask}
          lockedProjectId={lockedProjectId}
          visibleFields={visibleFields}
        />
      </div>
    </>
  );
}

function ProjectTaskGroupHeader({ project, fallbackLabel, count }: { project?: Project; fallbackLabel: string; count: number }) {
  const initials = getProjectInitials(project?.name ?? fallbackLabel);
  const area = project?.area ?? "business";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--brand-primary)] text-sm font-black text-white shadow-[var(--shadow-sm)]">
          {project ? initials : <FolderKanban size={20} />}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[var(--text)] sm:text-lg">{project?.name ?? fallbackLabel}</h3>
          <p className="truncate text-xs font-medium text-[var(--text-muted)] sm:text-sm">{project?.description || (project ? `${area} project` : "Tasks without a linked project")}</p>
        </div>
      </div>
      <div className="shrink-0 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
        {count} {count === 1 ? "task" : "tasks"}
      </div>
    </div>
  );
}

function groupTasksByProject(tasks: Task[], projectById: Map<string, Project>) {
  const groups: { key: string; label: string; project?: Project; tasks: Task[] }[] = [];
  const groupByKey = new Map<string, { key: string; label: string; project?: Project; tasks: Task[] }>();

  tasks.forEach((task) => {
    const project = task.projectId ? projectById.get(task.projectId) : undefined;
    const key = project?.id ?? `category:${task.category}`;
    let group = groupByKey.get(key);

    if (!group) {
      group = {
        key,
        label: project?.name ?? task.category,
        project,
        tasks: [],
      };
      groupByKey.set(key, group);
      groups.push(group);
    }

    group.tasks.push(task);
  });

  return groups;
}

function getProjectInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "PR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function swapTaskSlots(ids: string[], draggedId: string, targetId: string) {
  const draggedIndex = ids.indexOf(draggedId);
  const targetIndex = ids.indexOf(targetId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return ids;

  const next = [...ids];
  next[draggedIndex] = targetId;
  next[targetIndex] = draggedId;
  return next;
}

function isInteractiveTaskDragTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, select, textarea, [role='button']"));
}

function getTaskDropTarget(clientX: number, clientY: number, draggedTaskId: string, groupIds: string[]) {
  const element = document.elementFromPoint(clientX, clientY);
  const directTarget = element?.closest<HTMLElement>("[data-task-reorder-id]");
  const targetId = directTarget?.dataset.taskReorderId;
  return targetId && targetId !== draggedTaskId && groupIds.includes(targetId) ? targetId : null;
}

function TaskDropCue() {
  return (
    <motion.div
      className="align-drag-slot"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.7 }}
    />
  );
}

function TaskDragPreview({ task, project, x, y }: { task: Task; project?: Project; x: number; y: number }) {
  const position = getClampedDragPreviewPosition(x, y, 520, 120);

  return (
    <motion.div
      className="align-drag-preview w-[min(520px,calc(100vw-2rem))] p-4"
      style={position}
      initial={{ opacity: 0, scale: 0.94, rotate: -2.5, y: 8 }}
      animate={{ opacity: 0.96, scale: 1.02, rotate: -2.1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, rotate: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.72 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] font-black uppercase text-[var(--text-muted)]">
              {task.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-black uppercase text-[var(--brand-primary)]">
              {task.priority}
            </span>
          </div>
          <div className="mt-3 truncate text-base font-black text-[var(--text)]">{task.title}</div>
          <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">{project?.name ?? task.category}</div>
        </div>
        <span className="align-drag-handle shrink-0">⋯</span>
      </div>
    </motion.div>
  );
}
