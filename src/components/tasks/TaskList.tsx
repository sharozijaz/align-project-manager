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
          draggable={Boolean(onReorder)}
          onDragStart={(event) => {
            if (!onReorder) return;
            setDraggedId(task.id);
            event.dataTransfer.effectAllowed = "move";
          }}
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
          className={`relative rounded-[var(--radius-md)] transition ${onReorder ? "cursor-grab active:cursor-grabbing" : ""} ${dragOverId === task.id ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : ""}`}
        >
          {onReorder ? (
            <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 text-[var(--text-soft)] opacity-70">
              <GripVertical size={16} />
            </div>
          ) : null}
          <TaskCard
            task={task}
            projects={projects}
            project={projects.find((project) => project.id === task.projectId)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onComplete={onComplete}
          />
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
