import { RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTaskPriorityOption, getTaskStatusOption, taskStatusOptions } from "../config/taskOptions";
import { pullSharedProjects, subscribeToProjectTaskChanges, updateSharedTask } from "../integrations/supabase/collaboration";
import { useFeatureAccess } from "../features/access/FeatureAccessProvider";
import type { SharedProjectBundle } from "../integrations/supabase/collaboration";
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { startDateLabel, dateLabel } from "../utils/date";

export function SharedProjects() {
  const { access } = useFeatureAccess();
  const [bundle, setBundle] = useState<SharedProjectBundle>({ collaborators: [], projects: [], tasks: [], notes: [] });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const next = await pullSharedProjects();
      setBundle(next);
      setSelectedProjectId((current) => (current && next.projects.some((project) => project.id === current) ? current : next.projects[0]?.id ?? ""));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load shared projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const projectIds = bundle.projects.map((project) => project.id);
    if (!projectIds.length) return undefined;

    return subscribeToProjectTaskChanges(projectIds, (task, taskId) => {
      setBundle((current) => ({
        ...current,
        tasks: task ? upsertTask(current.tasks, task) : current.tasks.filter((item) => item.id !== taskId),
      }));
    });
  }, [bundle.projects]);

  const selectedProject = bundle.projects.find((project) => project.id === selectedProjectId);
  const selectedProjectTasks = useMemo(() => {
    const email = access?.profile.email.toLowerCase();
    return bundle.tasks
      .filter((task) => task.projectId === selectedProjectId)
      .filter((task) => {
        if (filter === "mine") return Boolean(email && task.assigneeEmail?.toLowerCase() === email);
        if (filter === "unassigned") return !task.assigneeEmail;
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt));
  }, [access?.profile.email, bundle.tasks, filter, selectedProjectId]);

  const sharedNotes = bundle.notes.filter((note) => note.projectIds.includes(selectedProjectId));

  const handleTaskStatus = async (task: Task, status: string) => {
    try {
      const updated = await updateSharedTask(task.id, { status: status as Task["status"] });
      setBundle((current) => ({ ...current, tasks: upsertTask(current.tasks, updated) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Shared Projects</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Project-only workspaces shared with {access?.profile.email ?? "you"}.</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Focused collaborator view</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">You can update shared project tasks only. Private workspace data is not loaded here.</p>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[460px]">
            <Select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} disabled={!bundle.projects.length}>
              {bundle.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
              <option value="all">All shared tasks</option>
              <option value="mine">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </Select>
          </div>
        </div>
      </Card>

      {message ? <div className="rounded-[var(--radius-sm)] border border-[var(--warning)] bg-[var(--warning-bg)] p-3 text-sm font-semibold text-[var(--warning)]">{message}</div> : null}

      {loading ? (
        <Card className="p-8 text-center text-sm text-[var(--text-muted)]">Loading shared project access...</Card>
      ) : selectedProject ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SharedProjectWork project={selectedProject} tasks={selectedProjectTasks} onTaskStatus={handleTaskStatus} />
          <aside className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-bold text-[var(--text)]">Project Context</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
                <span>{startDateLabel(selectedProject.startDate, selectedProject.startTime)}</span>
                <span>{dateLabel(selectedProject.dueDate, selectedProject.dueTime)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{selectedProject.description || "No project description yet."}</p>
            </Card>
            <Card className="p-4">
              <h2 className="text-lg font-bold text-[var(--text)]">Team-visible Notes</h2>
              <div className="mt-3 space-y-2">
                {sharedNotes.length ? (
                  sharedNotes.map((note) => (
                    <article key={note.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                      <h3 className="font-bold text-[var(--text)]">{note.title}</h3>
                      <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.body}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-5 text-center text-sm text-[var(--text-muted)]">
                    No team-visible notes for this project.
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      ) : (
        <Card className="p-10 text-center">
          <UserCheck className="mx-auto text-[var(--text-soft)]" />
          <h2 className="mt-3 text-xl font-bold text-[var(--text)]">No shared projects yet</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Ask the project owner to invite this email to a project.</p>
        </Card>
      )}
    </div>
  );
}

function SharedProjectWork({ project, tasks, onTaskStatus }: { project: Project; tasks: Task[]; onTaskStatus: (task: Task, status: string) => Promise<void> }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <h2 className="text-xl font-bold text-[var(--text)]">{project.name}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{tasks.length} shared tasks</p>
      </div>
      <div className="space-y-3 p-4">
        {tasks.length ? (
          tasks.map((task) => (
            <article key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-bold text-[var(--text)]">{task.title}</h3>
                  {task.description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{task.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="amber">{getTaskPriorityOption(task.priority).label}</Badge>
                    <Badge tone="slate">{dateLabel(task.dueDate, task.dueTime)}</Badge>
                    {task.assigneeEmail ? <Badge tone="blue">{task.assigneeEmail}</Badge> : <Badge tone="slate">Unassigned</Badge>}
                  </div>
                </div>
                <Select className="lg:w-48" value={task.status} onChange={(event) => void onTaskStatus(task, event.target.value)}>
                  {taskStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getTaskStatusOption(option.value).label}
                    </option>
                  ))}
                </Select>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-10 text-center text-sm text-[var(--text-muted)]">
            No tasks match this view.
          </div>
        )}
      </div>
    </Card>
  );
}

function upsertTask(tasks: Task[], next: Task) {
  return tasks.some((task) => task.id === next.id) ? tasks.map((task) => (task.id === next.id ? next : task)) : [...tasks, next];
}
