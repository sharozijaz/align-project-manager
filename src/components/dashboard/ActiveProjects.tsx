import { ArrowUpRight, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";
import { priorityTone } from "../../utils/taskVisuals";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function ActiveProjects({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const active = projects.filter((project) => project.status === "active" && !project.deletedAt).slice(0, 4);

  return (
    <Card className="overflow-hidden p-0">
      <SectionHeader title="Active Projects" helper={`${active.length} moving now`} to="/projects" />
      <div className="grid min-w-0 gap-3 p-4 sm:p-5 lg:grid-cols-2">
        {active.length ? (
          active.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectId === project.id && !task.deletedAt);
            const open = projectTasks.filter((task) => !isTerminalTaskStatus(task.status)).length;
            const complete = projectTasks.length - open;
            const progress = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group block min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-4 transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
                      <FolderKanban size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="min-w-0 break-words text-base font-black leading-6 text-[var(--text)]">{project.name}</h3>
                      <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{project.description || `${project.area} project`}</p>
                    </div>
                  </div>
                  <Badge tone={priorityTone(project.priority)}>{project.priority}</Badge>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-[var(--text-muted)]">
                      <span>{projectTasks.length} tasks</span>
                      <span>{open} open</span>
                      <span>{complete} done</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                      <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <ProgressRing value={progress} />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm font-semibold text-[var(--text-muted)] lg:col-span-2">
            No active projects yet.
          </div>
        )}
      </div>
    </Card>
  );
}

function SectionHeader({ title, helper, to }: { title: string; helper: string; to: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
      <div>
        <h2 className="text-lg font-black text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{helper}</p>
      </div>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]">
        View all
        <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const background = `conic-gradient(var(--brand-primary) ${value * 3.6}deg, var(--ring-track) 0deg)`;

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background }}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--panel-bg-soft)] text-[11px] font-black text-[var(--text)]">{value}%</span>
    </span>
  );
}
