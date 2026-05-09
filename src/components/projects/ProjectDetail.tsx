import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { TaskViewToggle } from "../tasks/TaskViewToggle";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { ProjectNotes } from "./ProjectNotes";
import { useMemo, useState } from "react";
import { isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { useTaskViewPreference } from "../../hooks/useTaskViewPreference";
import { useStudioStore } from "../../store/studioStore";
import type { Project, ProjectInput } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";

export function ProjectDetail({
  project,
  tasks,
  projects,
  onAddTask,
  onUpdateProject,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
}: {
  project: Project;
  tasks: Task[];
  projects: Project[];
  onAddTask: (input: TaskInput) => void;
  onUpdateProject: (id: string, input: Partial<ProjectInput>) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useTaskViewPreference();
  const hubNotes = useStudioStore((state) => state.notes);
  const complete = tasks.filter((task) => isTerminalTaskStatus(task.status)).length;
  const progress = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
  const linkedHubNotes = useMemo(() => hubNotes.filter((note) => note.projectIds?.includes(project.id)), [hubNotes, project.id]);
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
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <span>{startDateLabel(project.startDate, project.startTime)}</span>
              <span>{dateLabel(project.dueDate, project.dueTime)}</span>
              {project.startDate ? <span>{durationLabel(project.startDate, project.dueDate)}</span> : null}
            </div>
          </div>
          <strong className="text-2xl text-slate-950">{progress}%</strong>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
          <div className="h-full align-gradient" style={{ width: `${progress}%` }} />
        </div>
      </Card>
      <Card className="p-4">
        <TaskForm
          projects={projects}
          lockedProject={project}
          onSubmit={(input) => onAddTask({ ...input, projectId: project.id, category: "project" })}
          compact
        />
      </Card>
      <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:grid-cols-[1fr_1fr_auto]">
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option value="all">All priorities</option>
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <TaskViewToggle value={view} onChange={setView} />
      </div>
      <TaskList
        tasks={visibleTasks}
        projects={projects}
        onUpdate={onUpdateTask}
        onDelete={onDeleteTask}
        onComplete={onCompleteTask}
        view={view}
        lockedProjectId={project.id}
        onReorder={onReorderTasks}
      />
      <LinkedHubNotes notes={linkedHubNotes} />
      <ProjectNotes
        notes={project.notes ?? []}
        onChange={(notes) => onUpdateProject(project.id, { notes })}
      />
    </div>
  );
}

function LinkedHubNotes({ notes }: { notes: HubNote[] }) {
  if (!notes.length) return null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Personal Hub Notes</h2>
          <p className="text-sm text-[var(--text-muted)]">Private notes linked to this project. They never appear on client share links.</p>
        </div>
        <Badge tone="slate">{notes.length} private</Badge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-[var(--text)]">{note.title}</h3>
              {note.favorite ? <Badge tone="purple">Favorite</Badge> : null}
            </div>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags
                ?.split(",")
                .filter(Boolean)
                .map((tag) => (
                  <Badge key={tag.trim()}>{tag.trim()}</Badge>
                ))}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
