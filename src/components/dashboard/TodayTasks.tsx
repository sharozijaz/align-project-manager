import { TaskList } from "../tasks/TaskList";
import { Card } from "../ui/Card";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";

export function TodayTasks({
  tasks,
  projects,
  onUpdate,
  onDelete,
  onComplete,
}: {
  tasks: Task[];
  projects: Project[];
  onUpdate: (id: string, input: Partial<TaskInput>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-950">Today's Tasks</h2>
      <p className="mt-2 text-sm text-slate-400">Task, goal, or personal chore</p>
      <div className="mt-6">
        <TaskList tasks={tasks} projects={projects} onUpdate={onUpdate} onDelete={onDelete} onComplete={onComplete} emptyText="Nothing due today. Add a due date to keep work visible here." />
      </div>
    </Card>
  );
}
