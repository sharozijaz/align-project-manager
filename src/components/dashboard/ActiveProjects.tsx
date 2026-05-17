import { Link } from "react-router-dom";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { priorityTone } from "../../utils/taskVisuals";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";

export function ActiveProjects({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const active = projects.filter((project) => project.status === "active" && !project.deletedAt).slice(0, 4);

  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <h2 className="text-xl font-bold text-[var(--text)]">Active Projects</h2>
      <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
        {active.length ? (
          active.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            const open = projectTasks.filter((task) => !isTerminalTaskStatus(task.status)).length;
            const complete = projectTasks.length - open;

            return (
              <Link key={project.id} to={`/projects/${project.id}`} className="block min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-lg font-bold text-[var(--text)]">{project.name}</h3>
                  <Badge tone={priorityTone(project.priority)}>{project.priority}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-[var(--text-muted)]">
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
