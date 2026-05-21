import { Check, Trash2 } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskStatusOptions } from "../../config/taskOptions";
import type { Task, TaskInput, TaskStatus } from "../../types/task";
import { dateLabel } from "../../utils/date";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type KanbanDragState = {
  task: Task;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
};

export function ProjectTaskKanban({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: {
  tasks: Task[];
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}) {
  const [dragState, setDragState] = useState<KanbanDragState | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const dropStatusRef = useRef<TaskStatus | null>(null);
  const parentTasks = tasks.filter((task) => !task.parentTaskId);
  const subtasksByParent = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (!task.parentTaskId) return;
    subtasksByParent.set(task.parentTaskId, [...(subtasksByParent.get(task.parentTaskId) ?? []), task]);
  });
  const draggedTaskId = dragState?.task.id ?? null;

  const setCurrentDropStatus = (status: TaskStatus | null) => {
    dropStatusRef.current = status;
    setDragOverStatus(status);
  };

  const startPointerDrag = (task: Task, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;

    event.preventDefault();
    const initialState: KanbanDragState = {
      task,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
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

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="grid min-w-[1680px] grid-cols-7 gap-4 2xl:min-w-0">
        {taskStatusOptions.map((status) => {
          const columnTasks = parentTasks.filter((task) => task.status === status.value);

          return (
            <motion.section
              key={status.value}
              className="flex min-h-[560px] flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)]"
              layout
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-4">
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: status.bg, borderColor: status.border, color: status.text }}
                >
                  {status.label}
                </span>
                <span className="text-xs font-bold text-[var(--text-soft)]">{columnTasks.length}</span>
              </header>
              <div
                className={`grid flex-1 content-start gap-4 rounded-b-[var(--radius-md)] p-4 transition ${
                  dragOverStatus === status.value ? "bg-[var(--brand-50)] shadow-[inset_0_0_0_2px_var(--brand-primary)]" : ""
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
                      onComplete={() => onCompleteTask(task.id)}
                    />
                  ))}
                </AnimatePresence>
                {!columnTasks.length ? (
                  <div
                    className={`rounded-[var(--radius-sm)] border border-dashed p-6 text-center text-xs transition ${
                      dragOverStatus === status.value
                        ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)]"
                        : "border-[var(--border)] bg-[var(--empty-bg)] text-[var(--text-soft)]"
                    }`}
                  >
                    {draggedTaskId ? "Drop task here" : "No tasks"}
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
  onComplete,
}: {
  task: Task;
  subtaskCount: number;
  dragging: boolean;
  onPointerDragStart: (event: ReactPointerEvent<HTMLElement>) => void;
  onMove: (status: TaskStatus) => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const priority = getTaskPriorityOption(task.priority);
  const status = getTaskStatusOption(task.status);

  return (
    <Card
      className={`touch-none select-none p-4 transition duration-200 ${
        dragging ? "rotate-2 scale-[1.03] border-[var(--brand-primary)] opacity-45 shadow-[var(--shadow-md)]" : "cursor-grab hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] active:cursor-grabbing"
      }`}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: dragging ? 1.03 : 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      whileHover={dragging ? undefined : { y: -3 }}
      onPointerDown={onPointerDragStart}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-bold text-[var(--text)]">{task.title}</h3>
        {subtaskCount ? <Badge>{subtaskCount} sub</Badge> : null}
      </div>
      {task.description ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">{task.description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded border px-2 py-1 text-xs font-bold" style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}>
          {priority.label}
        </span>
        <Badge>{dateLabel(task.dueDate, task.dueTime)}</Badge>
      </div>
      <div className="mt-4 grid gap-3">
        <select
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
        </select>
        <div className="flex justify-end gap-2">
          <Button title="Mark done" variant="secondary" className="min-h-8 px-2" onClick={onComplete} disabled={isTerminalTaskStatus(task.status)}>
            <Check size={14} />
          </Button>
          <Button title="Delete" variant="danger" className="min-h-8 px-2" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function KanbanDragPreview({ task, subtaskCount, x, y }: { task: Task; subtaskCount: number; x: number; y: number }) {
  const priority = getTaskPriorityOption(task.priority);

  return (
    <motion.div
      className="pointer-events-none fixed z-[80] w-[260px] rounded-[var(--radius-sm)] border border-[var(--brand-primary)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-md)]"
      style={{ left: x, top: y, translateX: "-50%", translateY: "-45%" }}
      initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }}
      animate={{ opacity: 0.92, scale: 1, rotate: 2 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
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
