import { FolderKanban, GripVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TaskCard } from "./TaskCard";
import { TaskTable } from "./TaskTable";
import type { TaskViewMode } from "./TaskViewToggle";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";

export function TaskList({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  emptyText = "No tasks match this view.",
  view = "cards",
  lockedProjectId,
  onReorder,
  groupByProject = false,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  emptyText?: string;
  view?: TaskViewMode;
  lockedProjectId?: string;
  onReorder?: (orderedIds: string[]) => void;
  groupByProject?: boolean;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragScopeIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!draggedId || !onReorder) return;

    const findTargetId = () => {
      const position = pointerPositionRef.current;
      if (!position) return null;
      const element = document.elementFromPoint(position.x, position.y);
      const targetId = element?.closest<HTMLElement>("[data-task-reorder-id]")?.dataset.taskReorderId ?? null;
      if (!targetId) return null;
      return dragScopeIdsRef.current.length && !dragScopeIdsRef.current.includes(targetId) ? null : targetId;
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
      const targetId = findTargetId();
      setDragOverId(targetId && targetId !== draggedId ? targetId : null);
    };

    const handlePointerUp = () => {
      const targetId = findTargetId();
      if (targetId && targetId !== draggedId) {
        onReorder(moveBefore(tasks.map((item) => item.id), draggedId, targetId));
      }
      pointerPositionRef.current = null;
      dragScopeIdsRef.current = [];
      setDraggedId(null);
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
  }, [draggedId, onReorder, tasks]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const taskGroups = useMemo(() => groupTasksByProject(tasks, projectById), [projectById, tasks]);

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

        return (
        <motion.div
          key={task.id}
          data-task-reorder-id={task.id}
          layout
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
          onDragOver={(event) => {
            if (!onReorder || draggedId === task.id) return;
            event.preventDefault();
            setDragOverId(task.id);
          }}
          onDragLeave={() => setDragOverId((current) => (current === task.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            if (!onReorder || !draggedId || draggedId === task.id) return;
            onReorder(moveBefore(activeTasks.map((item) => item.id), draggedId, task.id));
            setDraggedId(null);
            setDragOverId(null);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
          }}
          className={`flex min-w-0 gap-2 rounded-[var(--radius-md)] transition-colors duration-200 ${draggedId === task.id ? "opacity-45" : ""} ${dragOverId === task.id ? "border-t-2 border-[var(--brand-primary)] pt-2" : ""}`}
        >
          {onReorder ? (
            <button
              type="button"
              draggable
              title="Drag to reorder"
              aria-label="Drag to reorder task"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                pointerPositionRef.current = { x: event.clientX, y: event.clientY };
                dragScopeIdsRef.current = activeTasks.map((item) => item.id);
                setDraggedId(task.id);
              }}
              onDragStart={(event) => {
                setDraggedId(task.id);
                dragScopeIdsRef.current = activeTasks.map((item) => item.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", task.id);
              }}
              className="flex w-8 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-soft)] transition hover:border-[var(--brand-primary)] hover:text-[var(--text)] active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <TaskCard
              task={task}
              projects={projects}
              project={project}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onComplete={onComplete}
              showProjectBadge={!options?.hideProjectBadge}
            />
          </div>
        </motion.div>
        );
      })}
      </AnimatePresence>
    </motion.div>
  );

  const cards = groupByProject ? (
    <div className="space-y-4">
      {taskGroups.map((group) => (
        <section key={group.key} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <ProjectTaskGroupHeader project={group.project} fallbackLabel={group.label} count={group.tasks.length} />
          <div className="p-3 sm:p-4">{renderCards(group.tasks, { hideProjectBadge: Boolean(group.project) })}</div>
        </section>
      ))}
    </div>
  ) : (
    renderCards(tasks)
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
          lockedProjectId={lockedProjectId}
        />
      </div>
    </>
  );
}

function ProjectTaskGroupHeader({ project, fallbackLabel, count }: { project?: Project; fallbackLabel: string; count: number }) {
  const initials = getProjectInitials(project?.name ?? fallbackLabel);
  const area = project?.area ?? "business";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_22%,var(--surface-raised)),var(--surface))] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--brand-gradient)] text-sm font-black text-white shadow-[var(--shadow-sm)]">
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

function moveBefore(ids: string[], draggedId: string, targetId: string) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedId);
  return next;
}
