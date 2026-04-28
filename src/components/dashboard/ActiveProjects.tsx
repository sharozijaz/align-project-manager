import { Link } from "react-router-dom";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { priorityTone } from "../../utils/taskVisuals";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";

export function ActiveProjects({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const active = projects.filter((project) => project.status !== "completed").slice(0, 4);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-950">Active Projects</h2>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {active.length ? (
          active.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            const open = projectTasks.filter((task) => !isTerminalTaskStatus(task.status)).length;
            const complete = projectTasks.length - open;

            return (
              <Link key={project.id} to={`/projects/${project.id}`} className="block rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                  <Badge tone={priorityTone(project.priority)}>{project.priority}</Badge>
                </div>
                <div className="mt-4 flex gap-6 text-sm text-slate-600">
                  <span>{projectTasks.length} tasks</span>
                  <span>{open} open</span>
                  <span>{complete} done</span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">No active projects yet.</div>
        )}
      </div>
    </Card>
  );
}
