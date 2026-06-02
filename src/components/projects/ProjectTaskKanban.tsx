import { Plus } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getTaskPriorityOption, getTaskStatusOption, taskStatusOptions } from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task, TaskInput, TaskStatus } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { getClampedDragPreviewPosition } from "../../utils/dragPreview";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { TaskOverflowMenu } from "../tasks/TaskOverflowMenu";
import { mergeProjectTaskFields, type ProjectTaskFieldVisibility } from "./projectTaskFields";

type KanbanDragState = {
  task: Task;
  startX: number;
  startY: number;
  x: number;
  y: number;
  grabOffsetX: number;
  grabOffsetY: number;
  active: boolean;
};

export function ProjectTaskKanban({
  project,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onOpenTask,
  visibleFields,
}: {
  project?: Project;
  tasks: Task[];
  onAddTask?: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onOpenTask?: (task: Task) => void;
  visibleFields?: Partial<ProjectTaskFieldVisibility>;
}) {
  const fields = mergeProjectTaskFields("kanban", visibleFields);
  const [dragState, setDragState] = useState<KanbanDragState | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const dropStatusRef = useRef<TaskStatus | null>(null);
  const parentTasks = useMemo(() => tasks.filter((task) => !task.parentTaskId), [tasks]);
  const subtasksByParent = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.parentTaskId) return;
      map.set(task.parentTaskId, [...(map.get(task.parentTaskId) ?? []), task]);
    });
    return map;
  }, [tasks]);
  const draggedTaskId = dragState?.task.id ?? null;

  const setCurrentDropStatus = (status: TaskStatus | null) => {
    dropStatusRef.current = status;
    setDragOverStatus(status);
  };

  const startPointerDrag = (task: Task, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const initialState: KanbanDragState = {
      task,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      grabOffsetX: Math.min(Math.max(event.clientX - rect.left, 24), 236),
      grabOffsetY: Math.min(Math.max(event.clientY - rect.top, 18), 72),
      active: false,
    };
    setDragState(initialState);
    setCurrentDropStatus(task.status);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const distance = Math.hypot(moveEvent.clientX - initialState.startX, moveEvent.clientY - initialState.startY);
      const active = distance > 6;
      const status = active ? getKanbanStatusAtPoint(moveEvent.clientX, moveEvent.clientY) : task.status;

      setCurrentDropStatus(status);
      setDragState((current) =>
        current?.task.id === task.id
          ? {
              ...current,
              x: moveEvent.clientX,
              y: moveEvent.clientY,
              active,
            }
          : current,
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const targetStatus = dropStatusRef.current;
      setDragState((current) => {
        if (current?.task.id === task.id && current.active && targetStatus && targetStatus !== task.status) {
          onUpdateTask(task.id, { status: targetStatus });
        }
        return null;
      });
      setCurrentDropStatus(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const addTaskToStatus = (status: TaskStatus) => {
    if (!onAddTask || !project) return;
    const title = drafts[status]?.trim();
    if (!title) return;
    onAddTask({
      title,
      description: "",
      projectId: project.id,
      category: "project",
      priority: "medium",
      status,
      startDate: "",
      startTime: "",
      dueDate: "",
      dueTime: "",
      reminder: "none",
      recurrence: "none",
    });
    setDrafts((current) => ({ ...current, [status]: "" }));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]">
      <div className="grid min-w-[1540px] grid-cols-7 gap-3 2xl:min-w-0">
        {taskStatusOptions.map((status) => {
          const columnTasks = parentTasks.filter((task) => task.status === status.value);

          return (
            <motion.section
              key={status.value}
              className="flex min-h-[520px] flex-col overflow-hidden rounded-[var(--radius-md)] border bg-[var(--surface-raised)]"
              style={{ borderColor: dragOverStatus === status.value ? status.border : "var(--border)" }}
              layout
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
            >
              <header
                className="flex items-center justify-between gap-2 border-b px-3 py-3"
                style={{ borderColor: status.border, background: "var(--surface-raised)" }}
              >
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: status.bg, borderColor: status.border, color: status.text }}
                >
                  {status.label}
                </span>
                <span className="text-xs font-bold text-[var(--text-soft)]">{columnTasks.length}</span>
              </header>
              <div
                className={`grid flex-1 content-start gap-3 rounded-b-[var(--radius-md)] p-3 transition ${
                  dragOverStatus === status.value ? "bg-[var(--accent-soft)] shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--brand-primary)_42%,transparent)]" : ""
                }`}
                data-kanban-status={status.value}
              >
                <AnimatePresence initial={false}>
                  {columnTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      subtaskCount={subtasksByParent.get(task.id)?.length ?? 0}
                      dragging={draggedTaskId === task.id}
                      onPointerDragStart={(event) => startPointerDrag(task, event)}
                      onMove={(status) => onUpdateTask(task.id, { status })}
                      onDelete={() => onDeleteTask(task.id)}
                      onOpen={() => onOpenTask?.(task)}
                      fields={fields}
                    />
                  ))}
                </AnimatePresence>
                {!columnTasks.length ? (
                  <div
                    className={`rounded-[var(--radius-sm)] border border-dashed p-6 text-center text-xs transition ${
                      dragOverStatus === status.value
                        ? "align-drop-zone min-h-24 text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--empty-bg)] text-[var(--text-soft)]"
                    }`}
                  >
                    {draggedTaskId ? "Drop task here" : "No tasks"}
                  </div>
                ) : null}
                {onAddTask && project ? (
                  <div className="mt-1 grid gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-2">
                    <Input
                      className="min-h-8 border-transparent bg-transparent text-xs hover:border-[var(--border)] focus:bg-[var(--surface-raised)] sm:min-h-8"
                      value={drafts[status.value] ?? ""}
                      placeholder="+ Add task"
                      onChange={(event) => setDrafts((current) => ({ ...current, [status.value]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addTaskToStatus(status.value);
                      }}
                    />
                    <Button type="button" variant="ghost" className="min-h-8 justify-start px-2 text-xs" icon={<Plus size={14} />} onClick={() => addTaskToStatus(status.value)}>
                      Add task
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.section>
          );
        })}
      </div>
      <AnimatePresence>
        {dragState?.active ? (
          <KanbanDragPreview
            key={dragState.task.id}
            task={dragState.task}
            subtaskCount={subtasksByParent.get(dragState.task.id)?.length ?? 0}
            x={dragState.x}
            y={dragState.y}
            grabOffsetX={dragState.grabOffsetX}
            grabOffsetY={dragState.grabOffsetY}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function KanbanTaskCard({
  task,
  subtaskCount,
  dragging,
  onPointerDragStart,
  onMove,
  onDelete,
  onOpen,
  fields,
}: {
  task: Task;
  subtaskCount: number;
  dragging: boolean;
  onPointerDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  onOpen: () => void;
  fields: ProjectTaskFieldVisibility;
}) {
  const priority = getTaskPriorityOption(task.priority);
  const status = getTaskStatusOption(task.status);

  return (
    <Card
      className={`group touch-none select-none p-3 transition duration-200 ${
        dragging ? "align-drag-source" : "cursor-grab hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] active:cursor-grabbing"
      }`}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: dragging ? 1.03 : 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      whileHover={dragging ? undefined : { y: -3 }}
      onPointerDown={onPointerDragStart}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left text-sm font-bold text-[var(--text)] transition hover:text-[var(--text-brand)]" onPointerDown={(event) => event.stopPropagation()} onClick={onOpen}>
          {task.title}
        </button>
        {fields.subtasks && subtaskCount ? <Badge>{subtaskCount} sub</Badge> : null}
      </div>
      {fields.notes && task.description ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">{task.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {fields.priority ? <span className="rounded border px-2 py-1 text-xs font-bold" style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}>
          {priority.label}
        </span> : null}
        {fields.due ? <Badge>{dateLabel(task.dueDate, task.dueTime)}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">
        {fields.status ? <select
          value={task.status}
          onChange={(event) => onMove(event.target.value as TaskStatus)}
          className="min-h-9 rounded-md border px-2 text-xs font-bold"
          style={{ backgroundColor: status.bg, borderColor: status.border, color: status.text }}
        >
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select> : null}
        {fields.actions ? <div className="flex justify-end opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <TaskOverflowMenu task={task} onOpen={() => onOpen()} onDelete={() => onDelete()} />
        </div> : null}
      </div>
    </Card>
  );
}

function KanbanDragPreview({
  task,
  subtaskCount,
  x,
  y,
  grabOffsetX,
  grabOffsetY,
}: {
  task: Task;
  subtaskCount: number;
  x: number;
  y: number;
  grabOffsetX: number;
  grabOffsetY: number;
}) {
  const priority = getTaskPriorityOption(task.priority);
  const position = getClampedDragPreviewPosition(x, y, 260, 150, { offsetX: grabOffsetX, offsetY: grabOffsetY, lift: 8 });

  return (
    <motion.div
      className="align-drag-preview w-[260px] p-3"
      style={position}
      initial={{ opacity: 0, scale: 0.96, rotate: -1.2, y: 4 }}
      animate={{ opacity: 0.96, scale: 1.02, rotate: 1.8, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, rotate: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.72 }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-bold text-[var(--text)]">{task.title}</h3>
        {subtaskCount ? <Badge>{subtaskCount} sub</Badge> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded border px-2 py-1 text-xs font-bold" style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}>
          {priority.label}
        </span>
        <Badge>{dateLabel(task.dueDate, task.dueTime)}</Badge>
      </div>
    </motion.div>
  );
}

function getKanbanStatusAtPoint(x: number, y: number): TaskStatus | null {
  const element = document.elementFromPoint(x, y);
  const target = element?.closest<HTMLElement>("[data-kanban-status]");
  const status = target?.dataset.kanbanStatus;
  return taskStatusOptions.some((option) => option.value === status) ? (status as TaskStatus) : null;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("button, input, select, textarea, a, [role='button']"));
}
