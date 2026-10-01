import { FolderKanban, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useConfirm } from "../components/ui/ConfirmProvider";
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
  const confirm = useConfirm();
  const {
    projects,
    restoreProject,
    restoreProjects,
    permanentlyDeleteProject,
    permanentlyDeleteProjects,
    clearDeletedProjects,
  } = useProjectStore();
  const {
    tasks,
    restoreTask,
    restoreTasks,
    permanentlyDeleteTask,
    permanentlyDeleteTasks,
    clearDeletedTasks,
  } = useTaskStore();
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(() => new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());

  const deletedProjects = useMemo(() => projects.filter((project) => project.deletedAt).sort(compareDeletedAt), [projects]);
  const deletedTasks = useMemo(() => tasks.filter((task) => task.deletedAt).sort(compareDeletedAt), [tasks]);
  const deletedProjectIds = useMemo(() => deletedProjects.map((project) => project.id), [deletedProjects]);
  const deletedTaskIds = useMemo(() => deletedTasks.map((task) => task.id), [deletedTasks]);
  const selectedProjectCount = selectedProjectIds.size;
  const selectedTaskCount = selectedTaskIds.size;

  useEffect(() => {
    setSelectedProjectIds((current) => keepExistingIds(current, deletedProjectIds));
  }, [deletedProjectIds]);

  useEffect(() => {
    setSelectedTaskIds((current) => keepExistingIds(current, deletedTaskIds));
  }, [deletedTaskIds]);

  const clearAllTrash = async () => {
    const total = deletedProjects.length + deletedTasks.length;
    if (!total) return;

    const confirmed = await confirm({
      title: "Clear all trash?",
      description: `${pluralize(deletedProjects.length, "project")} and ${pluralize(deletedTasks.length, "task")} will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Clear Trash",
      tone: "danger",
    });

    if (!confirmed) return;
    clearDeletedProjects();
    clearDeletedTasks();
    setSelectedProjectIds(new Set());
    setSelectedTaskIds(new Set());
  };

  const restoreSelectedProjects = () => {
    const ids = [...selectedProjectIds];
    restoreProjects(ids);
    setSelectedProjectIds(new Set());
  };

  const deleteSelectedProjects = async () => {
    const ids = [...selectedProjectIds];
    if (!ids.length) return;

    const confirmed = await confirm({
      title: "Delete selected projects forever?",
      description: `${pluralize(ids.length, "project")} will be removed forever. This cannot be undone.`,
      confirmLabel: "Delete Forever",
      tone: "danger",
    });

    if (!confirmed) return;
    permanentlyDeleteProjects(ids);
    setSelectedProjectIds(new Set());
  };

  const clearProjectTrash = async () => {
    if (!deletedProjects.length) return;

    const confirmed = await confirm({
      title: "Clear deleted projects?",
      description: `${pluralize(deletedProjects.length, "project")} will be removed forever. This cannot be undone.`,
      confirmLabel: "Clear Projects",
      tone: "danger",
    });

    if (!confirmed) return;
    clearDeletedProjects();
    setSelectedProjectIds(new Set());
  };

  const restoreSelectedTasks = () => {
    const ids = [...selectedTaskIds];
    restoreTasks(ids);
    setSelectedTaskIds(new Set());
  };

  const deleteSelectedTasks = async () => {
    const ids = [...selectedTaskIds];
    if (!ids.length) return;

    const confirmed = await confirm({
      title: "Delete selected tasks forever?",
      description: `${pluralize(ids.length, "task")} will be removed forever. This cannot be undone.`,
      confirmLabel: "Delete Forever",
      tone: "danger",
    });

    if (!confirmed) return;
    permanentlyDeleteTasks(ids);
    setSelectedTaskIds(new Set());
  };

  const clearTaskTrash = async () => {
    if (!deletedTasks.length) return;

    const confirmed = await confirm({
      title: "Clear deleted tasks?",
      description: `${pluralize(deletedTasks.length, "task")} will be removed forever. This cannot be undone.`,
      confirmLabel: "Clear Tasks",
      tone: "danger",
    });

    if (!confirmed) return;
    clearDeletedTasks();
    setSelectedTaskIds(new Set());
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trash"
        description="Recover deleted work before it is permanently cleaned up."
        actions={
          deletedProjects.length || deletedTasks.length ? (
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void clearAllTrash()}>
              Clear All Trash
            </Button>
          ) : null
        }
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

      <TrashSection
        title="Deleted Projects"
        count={deletedProjects.length}
        icon={<FolderKanban size={18} />}
        bulkActions={
          deletedProjects.length ? (
            <BulkTrashActions
              itemLabel="projects"
              selectedCount={selectedProjectCount}
              totalCount={deletedProjects.length}
              allSelected={selectedProjectCount === deletedProjects.length}
              onSelectAll={() => setSelectedProjectIds(new Set(deletedProjectIds))}
              onClearSelection={() => setSelectedProjectIds(new Set())}
              onRestoreSelected={restoreSelectedProjects}
              onDeleteSelected={() => void deleteSelectedProjects()}
              onClearTrash={() => void clearProjectTrash()}
            />
          ) : null
        }
      >
        {deletedProjects.length ? (
          deletedProjects.map((project) => (
            <TrashProjectRow
              key={project.id}
              project={project}
              selected={selectedProjectIds.has(project.id)}
              onToggleSelected={() => toggleSelectedId(setSelectedProjectIds, project.id)}
              onRestore={() => restoreProject(project.id)}
              onDeleteForever={() => {
                void confirm({
                  title: "Permanently delete project?",
                  description: `"${project.name}" will be removed forever. This cannot be undone.`,
                  confirmLabel: "Delete Forever",
                  tone: "danger",
                }).then((confirmed) => {
                  if (confirmed) permanentlyDeleteProject(project.id);
                });
              }}
            />
          ))
        ) : (
          <EmptyTrashMessage label="No deleted projects." />
        )}
      </TrashSection>

      <TrashSection
        title="Deleted Tasks"
        count={deletedTasks.length}
        icon={<Trash2 size={18} />}
        bulkActions={
          deletedTasks.length ? (
            <BulkTrashActions
              itemLabel="tasks"
              selectedCount={selectedTaskCount}
              totalCount={deletedTasks.length}
              allSelected={selectedTaskCount === deletedTasks.length}
              onSelectAll={() => setSelectedTaskIds(new Set(deletedTaskIds))}
              onClearSelection={() => setSelectedTaskIds(new Set())}
              onRestoreSelected={restoreSelectedTasks}
              onDeleteSelected={() => void deleteSelectedTasks()}
              onClearTrash={() => void clearTaskTrash()}
            />
          ) : null
        }
      >
        {deletedTasks.length ? (
          deletedTasks.map((task) => {
            const project = projects.find((item) => item.id === task.projectId);

            return (
              <TrashTaskRow
                key={task.id}
                task={task}
                projectName={project?.name}
                selected={selectedTaskIds.has(task.id)}
                onToggleSelected={() => toggleSelectedId(setSelectedTaskIds, task.id)}
                onRestore={() => restoreTask(task.id)}
                onDeleteForever={() => {
                  void confirm({
                    title: "Permanently delete task?",
                    description: `"${task.title}" will be removed forever. This cannot be undone.`,
                    confirmLabel: "Delete Forever",
                    tone: "danger",
                  }).then((confirmed) => {
                    if (confirmed) permanentlyDeleteTask(task.id);
                  });
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
  bulkActions,
  children,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  bulkActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
            {icon} {title}
          </h2>
          <Badge tone={count ? "red" : "slate"}>{count} in trash</Badge>
        </div>
        {bulkActions}
      </div>
      <div className="space-y-3 p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function BulkTrashActions({
  itemLabel,
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  onRestoreSelected,
  onDeleteSelected,
  onClearTrash,
}: {
  itemLabel: string;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRestoreSelected: () => void;
  onDeleteSelected: () => void;
  onClearTrash: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {selectedCount ? `${selectedCount} selected` : `${totalCount} ${itemLabel}`}
      </span>
      <Button variant="secondary" className="min-h-9 px-3 py-1.5 text-xs" onClick={allSelected ? onClearSelection : onSelectAll}>
        {allSelected ? "Clear Selection" : "Select All"}
      </Button>
      <Button
        variant="secondary"
        className="min-h-9 px-3 py-1.5 text-xs"
        icon={<RotateCcw size={14} />}
        onClick={onRestoreSelected}
        disabled={!selectedCount}
      >
        Restore Selected
      </Button>
      <Button
        variant="danger"
        className="min-h-9 px-3 py-1.5 text-xs"
        icon={<Trash2 size={14} />}
        onClick={onDeleteSelected}
        disabled={!selectedCount}
      >
        Delete Selected
      </Button>
      <Button variant="danger" className="min-h-9 px-3 py-1.5 text-xs" icon={<Trash2 size={14} />} onClick={onClearTrash}>
        Clear {itemLabel}
      </Button>
    </div>
  );
}

function TrashProjectRow({
  project,
  selected,
  onToggleSelected,
  onRestore,
  onDeleteForever,
}: {
  project: Project;
  selected: boolean;
  onToggleSelected: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 lg:flex-row lg:items-center">
      <div className="flex min-w-0 gap-3">
        <TrashCheckbox label={`Select ${project.name}`} checked={selected} onChange={onToggleSelected} />
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-[var(--text)]">{project.name}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{project.description || "No description yet."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={project.status === "completed" ? "emerald" : project.status === "archived" ? "slate" : "blue"}>{project.status}</Badge>
            <Badge tone="red">Deleted {project.deletedAt ? plainDateLabel(project.deletedAt.slice(0, 10)) : ""}</Badge>
            <Badge>{retentionLabel(project.deletedAt, TRASH_PROJECT_RETENTION_DAYS)}</Badge>
          </div>
        </div>
      </div>
      <TrashActions onRestore={onRestore} onDeleteForever={onDeleteForever} />
    </div>
  );
}

function TrashTaskRow({
  task,
  projectName,
  selected,
  onToggleSelected,
  onRestore,
  onDeleteForever,
}: {
  task: Task;
  projectName?: string;
  selected: boolean;
  onToggleSelected: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 lg:flex-row lg:items-center">
      <div className="flex min-w-0 gap-3">
        <TrashCheckbox label={`Select ${task.title}`} checked={selected} onChange={onToggleSelected} />
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
      </div>
      <TrashActions onRestore={onRestore} onDeleteForever={onDeleteForever} />
    </div>
  );
}

function TrashCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="sr-only">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border border-[var(--border-strong)] bg-[var(--input-bg)] accent-[var(--button-primary-bg)]"
      />
    </label>
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

function keepExistingIds(current: Set<string>, validIds: string[]) {
  const valid = new Set(validIds);
  const next = new Set([...current].filter((id) => valid.has(id)));
  return next.size === current.size ? current : next;
}

function toggleSelectedId(setSelectedIds: (updater: (current: Set<string>) => Set<string>) => void, id: string) {
  setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
