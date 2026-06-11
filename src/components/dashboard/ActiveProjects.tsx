import { ArrowUpRight, FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";
import { getProjectTaskProgress } from "../../utils/projectProgress";
import { priorityTone } from "../../utils/taskVisuals";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

export function ActiveProjects({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const active = projects.filter((project) => project.status === "active" && !project.deletedAt).slice(0, 4);

  return (
    <Card className="overflow-hidden p-0">
      <SectionHeader title="Active Projects" helper={`${active.length} currently moving`} to="/projects" />
      <div className="grid min-w-0 gap-3 p-4 sm:p-5 lg:grid-cols-2">
        {active.length ? (
          active.map((project) => {
            const { total, open, completed, progress } = getProjectTaskProgress(tasks, project.id);

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
                      <span>{total} tasks</span>
                      <span>{open} open</span>
                      <span>{completed} done</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                      <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <ProgressStrip value={progress} />
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

function ProgressStrip({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="grid w-28 shrink-0 gap-2">
      <strong className="text-right text-sm font-black text-[var(--text)]">{value}%</strong>
      <div className="grid grid-cols-10 gap-0.5" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} className={`h-2 rounded-full ${index < filled ? "bg-[var(--brand-primary)]" : "bg-[var(--ring-track)]"}`} />
        ))}
      </div>
    </div>
  );
}
