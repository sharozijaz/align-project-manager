import { FolderKanban, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import { dateLabel, plainDateLabel } from "../utils/date";
import {
  daysUntilPermanentDelete,
  TRASH_PROJECT_RETENTION_DAYS,
  TRASH_TASK_RETENTION_DAYS,
} from "../utils/trash";
import { priorityTone } from "../utils/taskVisuals";

export function Trash() {
  const { projects, restoreProject, permanentlyDeleteProject } = useProjectStore();
  const { tasks, restoreTask, permanentlyDeleteTask } = useTaskStore();
  const deletedProjects = projects.filter((project) => project.deletedAt).sort(compareDeletedAt);
  const deletedTasks = tasks.filter((task) => task.deletedAt).sort(compareDeletedAt);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trash"
        description="Recover deleted work before it is permanently cleaned up."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Deleted projects</p>
          <p className="mt-3 text-3xl font-bold text-[var(--text)]">{deletedProjects.length}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">Auto-cleanup after {TRASH_PROJECT_RETENTION_DAYS} days</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Deleted tasks</p>
          <p className="mt-3 text-3xl font-bold text-[var(--text)]">{deletedTasks.length}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">Auto-cleanup after {TRASH_TASK_RETENTION_DAYS} days</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--text-muted)]">Permanent delete</p>
          <p className="mt-3 text-lg font-bold text-[var(--text)]">Manual anytime</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">Delete Forever cannot be undone.</p>
        </Card>
      </div>

      <TrashSection title="Deleted Projects" count={deletedProjects.length} icon={<FolderKanban size={18} />}>
        {deletedProjects.length ? (
          deletedProjects.map((project) => (
            <TrashProjectRow
              key={project.id}
              project={project}
              onRestore={() => restoreProject(project.id)}
              onDeleteForever={() => {
                if (window.confirm(`Permanently delete "${project.name}"? This cannot be undone.`)) {
                  permanentlyDeleteProject(project.id);
                }
              }}
            />
          ))
        ) : (
          <EmptyTrashMessage label="No deleted projects." />
        )}
      </TrashSection>

      <TrashSection title="Deleted Tasks" count={deletedTasks.length} icon={<Trash2 size={18} />}>
        {deletedTasks.length ? (
          deletedTasks.map((task) => {
            const project = projects.find((item) => item.id === task.projectId);

            return (
              <TrashTaskRow
                key={task.id}
                task={task}
                projectName={project?.name}
                onRestore={() => restoreTask(task.id)}
                onDeleteForever={() => {
                  if (window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
                    permanentlyDeleteTask(task.id);
                  }
                }}
              />
            );
          })
        ) : (
          <EmptyTrashMessage label="No deleted tasks." />
        )}
      </TrashSection>
    </div>
  );
}

function TrashSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
          {icon} {title}
        </h2>
        <Badge tone={count ? "red" : "slate"}>{count} in trash</Badge>
      </div>
      <div className="space-y-3 p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function TrashProjectRow({
  project,
  onRestore,
  onDeleteForever,
}: {
  project: Project;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <h3 className="break-words text-lg font-bold text-[var(--text)]">{project.name}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{project.description || "No description yet."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={project.status === "completed" ? "emerald" : project.status === "archived" ? "slate" : "blue"}>{project.status}</Badge>
          <Badge tone="red">Deleted {project.deletedAt ? plainDateLabel(project.deletedAt.slice(0, 10)) : ""}</Badge>
          <Badge>{retentionLabel(project.deletedAt, TRASH_PROJECT_RETENTION_DAYS)}</Badge>
        </div>
      </div>
      <TrashActions onRestore={onRestore} onDeleteForever={onDeleteForever} />
    </div>
  );
}

function TrashTaskRow({
  task,
  projectName,
  onRestore,
  onDeleteForever,
}: {
  task: Task;
  projectName?: string;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 lg:flex-row lg:items-center">
      <div className="min-w-0">
        <h3 className="break-words text-lg font-bold text-[var(--text)]">{task.title}</h3>
        {task.description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
          <Badge>{projectName ?? task.category}</Badge>
          <Badge>{dateLabel(task.dueDate, task.dueTime)}</Badge>
          <Badge tone="red">Deleted {task.deletedAt ? plainDateLabel(task.deletedAt.slice(0, 10)) : ""}</Badge>
          <Badge>{retentionLabel(task.deletedAt, TRASH_TASK_RETENTION_DAYS)}</Badge>
        </div>
      </div>
      <TrashActions onRestore={onRestore} onDeleteForever={onDeleteForever} />
    </div>
  );
}

function TrashActions({ onRestore, onDeleteForever }: { onRestore: () => void; onDeleteForever: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={onRestore}>
        Restore
      </Button>
      <Button variant="danger" icon={<Trash2 size={16} />} onClick={onDeleteForever}>
        Delete Forever
      </Button>
    </div>
  );
}

function EmptyTrashMessage({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
      {label}
    </div>
  );
}

function retentionLabel(deletedAt: string | undefined, retentionDays: number) {
  const days = daysUntilPermanentDelete(deletedAt, retentionDays);
  if (days <= 0) return "Cleanup ready";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function compareDeletedAt<T extends { deletedAt?: string }>(a: T, b: T) {
  return (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "");
}
