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
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  emptyText?: string;
  view?: TaskViewMode;
  lockedProjectId?: string;
}) {
  if (!tasks.length) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">{emptyText}</div>;
  }

  const cards = (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          projects={projects}
          project={projects.find((project) => project.id === task.projectId)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onComplete={onComplete}
        />
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
