import { TaskCard } from "./TaskCard";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";

export function TaskList({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
  emptyText = "No tasks match this view.",
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  emptyText?: string;
}) {
  if (!tasks.length) {
    return <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/70 p-10 text-center text-sm text-slate-400">{emptyText}</div>;
  }

  return (
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
}
