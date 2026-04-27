import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { useMemo, useState } from "react";
import type { Project } from "../../types/project";
import type { Task, TaskInput } from "../../types/task";

export function ProjectDetail({
  project,
  tasks,
  projects,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}: {
  project: Project;
  tasks: Task[];
  projects: Project[];
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const complete = tasks.filter((task) => task.status === "completed").length;
  const progress = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const statusMatch = statusFilter === "all" || task.status === statusFilter;
        const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
        return statusMatch && priorityMatch;
      }),
    [priorityFilter, statusFilter, tasks],
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{project.description || "Project details and tasks."}</p>
          </div>
          <strong className="text-2xl text-slate-950">{progress}%</strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-sky-300" style={{ width: `${progress}%` }} />
        </div>
      </Card>
      <Card className="p-4">
        <TaskForm projects={projects} onSubmit={(input) => onAddTask({ ...input, projectId: project.id, category: "project" })} compact />
      </Card>
      <div className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/75 p-3 sm:grid-cols-2">
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </div>
      <TaskList tasks={visibleTasks} projects={projects} onUpdate={onUpdateTask} onDelete={onDeleteTask} onComplete={onCompleteTask} />
    </div>
  );
}
