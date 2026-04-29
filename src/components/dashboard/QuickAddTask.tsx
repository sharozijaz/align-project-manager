import { TaskForm } from "../tasks/TaskForm";
import { Card } from "../ui/Card";
import type { Project } from "../../types/project";
import type { TaskInput } from "../../types/task";

export function QuickAddTask({ projects, onAdd }: { projects: Project[]; onAdd: (task: TaskInput) => void }) {
  return (
    <Card className="relative z-20 -mt-12 p-3 sm:-mt-20 sm:p-4">
      <TaskForm projects={projects} onSubmit={onAdd} compact />
    </Card>
  );
}
