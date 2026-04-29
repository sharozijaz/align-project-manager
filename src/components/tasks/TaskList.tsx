import { GripVertical } from "lucide-react";
import { useState } from "react";
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
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (!tasks.length) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">{emptyText}</div>;
  }

  const cards = (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          onDragOver={(event) => {
            if (!onReorder || draggedId === task.id) return;
            event.preventDefault();
            setDragOverId(task.id);
          }}
          onDragLeave={() => setDragOverId((current) => (current === task.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            if (!onReorder || !draggedId || draggedId === task.id) return;
            onReorder(moveBefore(tasks.map((item) => item.id), draggedId, task.id));
            setDraggedId(null);
            setDragOverId(null);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
          }}
          className={`flex min-w-0 gap-2 rounded-[var(--radius-md)] transition-all duration-200 ${draggedId === task.id ? "scale-[0.99] opacity-45" : ""} ${dragOverId === task.id ? "translate-y-1 border-t-2 border-[var(--brand-primary)] pt-2" : ""}`}
        >
          {onReorder ? (
            <button
              type="button"
              draggable
              title="Drag to reorder"
              aria-label="Drag to reorder task"
              onDragStart={(event) => {
                setDraggedId(task.id);
                event.dataTransfer.effectAllowed = "move";
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
              project={projects.find((project) => project.id === task.projectId)}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onComplete={onComplete}
            />
          </div>
        </div>
      ))}
    </div>
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

function moveBefore(ids: string[], draggedId: string, targetId: string) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, draggedId);
  return next;
}
