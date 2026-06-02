import { Link } from "react-router-dom";
import { Archive, CheckCircle2, ExternalLink, Pencil, Pin, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { ProjectForm } from "./ProjectForm";
import { isTerminalTaskStatus } from "../../config/taskOptions";
import { dateLabel, durationLabel, plainDateLabel, startDateLabel } from "../../utils/date";
import type { Project, ProjectInput } from "../../types/project";
import type { Task } from "../../types/task";

export function ProjectCard({
  project,
  tasks,
  onUpdate,
  onComplete,
  onArchive,
  onRestore,
  onDelete,
  dragging = false,
  dropTarget = false,
  canDrag = false,
}: {
  project: Project;
  tasks: Task[];
  onUpdate: (id: string, input: Partial<ProjectInput>) => void;
  onComplete: (project: Project) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  dragging?: boolean;
  dropTarget?: boolean;
  canDrag?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const open = projectTasks.filter((task) => !isTerminalTaskStatus(task.status)).length;
  const complete = projectTasks.length - open;
  const area = project.area ?? "business";
  const progress = projectTasks.length ? Math.round((complete / projectTasks.length) * 100) : 0;

  return (
    <Card
      layout
      whileHover={dragging ? undefined : { y: -3 }}
      className={`group overflow-hidden p-4 transition duration-200 sm:p-5 ${
        dragging
          ? "rotate-[-1.3deg] scale-[0.985] border-[var(--brand-primary)] opacity-55 shadow-[var(--shadow-md)]"
          : dropTarget
            ? "border-dashed border-[var(--brand-primary)] bg-[var(--accent-soft)] shadow-[var(--shadow-md)]"
            : "hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:shadow-[var(--shadow-md)]"
      } ${canDrag ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 overflow-hidden">
          <Link to={`/projects/${project.id}`} className="break-words text-lg font-bold text-[var(--text)] hover:underline">
            {project.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">{project.description || "No description yet."}</p>
        </div>
        <div className="flex shrink-0 gap-1.5 opacity-80 transition group-hover:opacity-100">
          {project.status === "active" || project.status === "paused" ? (
            <Button
              variant="secondary"
              className="min-h-9 px-3 sm:min-h-10"
              title={project.pinnedAt ? "Unpin from sidebar" : "Pin to sidebar"}
              aria-label={project.pinnedAt ? "Unpin project from sidebar" : "Pin project to sidebar"}
              onClick={() => onUpdate(project.id, { pinnedAt: project.pinnedAt ? undefined : new Date().toISOString() })}
            >
              <Pin size={16} className={project.pinnedAt ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : undefined} />
            </Button>
          ) : null}
          <Button variant="secondary" className="min-h-9 px-3 sm:min-h-10" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </Button>
          {project.status === "active" || project.status === "paused" ? (
            <Button
              variant="secondary"
              className="min-h-9 px-3 sm:min-h-10"
              title="Mark completed"
              aria-label="Mark project completed"
              onClick={() => onComplete(project)}
            >
              <CheckCircle2 size={16} />
            </Button>
          ) : null}
          {project.status === "active" || project.status === "paused" || project.status === "completed" ? (
            <Button
              variant="secondary"
              className="min-h-9 px-3 sm:min-h-10"
              title="Archive project"
              aria-label="Archive project"
              onClick={() => onArchive(project.id)}
            >
              <Archive size={16} />
            </Button>
          ) : null}
          {project.status === "archived" ? (
            <Button
              variant="secondary"
              className="min-h-9 px-3 sm:min-h-10"
              title="Restore project"
              aria-label="Restore project"
              onClick={() => onRestore(project.id)}
            >
              <RotateCcw size={16} />
            </Button>
          ) : null}
          <Button variant="danger" className="min-h-9 px-3 sm:min-h-10" onClick={() => onDelete(project.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        <Badge tone={area === "personal" ? "purple" : "blue"}>{area}</Badge>
        <Badge tone={project.status === "completed" ? "emerald" : project.status === "archived" ? "slate" : project.status === "paused" ? "amber" : "blue"}>{project.status}</Badge>
        {project.startDate ? <Badge>{startDateLabel(project.startDate, project.startTime)}</Badge> : null}
        <Badge>{dateLabel(project.dueDate, project.dueTime)}</Badge>
        {project.startDate ? <Badge>{durationLabel(project.startDate, project.dueDate)}</Badge> : null}
        {project.completedAt ? <Badge tone="emerald">Completed {plainDateLabel(project.completedAt.slice(0, 10))}</Badge> : null}
        {project.archivedAt ? <Badge>Archived {plainDateLabel(project.archivedAt.slice(0, 10))}</Badge> : null}
        <Badge>{projectTasks.length} tasks</Badge>
        <Badge>{open} open</Badge>
        <Badge>{complete} done</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--text-muted)]">
            <span>Progress</span>
            <span className="text-[var(--text)]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
            <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Link
          to={`/projects/${project.id}`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-2 text-sm font-bold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
        >
          Open
          <ExternalLink size={15} />
        </Link>
      </div>
      <Modal title="Edit project" description="Update this project without changing its task history." open={editing} onClose={() => setEditing(false)}>
        <ProjectForm
          initialProject={project}
          onSubmit={(input) => {
            onUpdate(project.id, input);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}
