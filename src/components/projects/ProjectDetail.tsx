import { Columns3, KanbanSquare, ListTree, Table2 } from "lucide-react";
import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { MarkdownRenderer } from "../notes/MarkdownRenderer";
import { NoteReaderModal } from "../notes/NoteReaderModal";
import { ProjectTaskBoard } from "./ProjectTaskBoard";
import { ProjectTaskKanban } from "./ProjectTaskKanban";
import { useEffect, useMemo, useState } from "react";
import { isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { useStudioStore } from "../../store/studioStore";
import type { Project } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";

type ProjectTaskView = "cards" | "table" | "board" | "kanban";
const PROJECT_TASK_VIEW_KEY = "align-project-task-view-v1";

export function ProjectDetail({
  project,
  tasks,
  projects,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
}: {
  project: Project;
  tasks: Task[];
  projects: Project[];
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [view, setView] = useState<ProjectTaskView>(() => getSavedProjectTaskView());
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

  useEffect(() => {
    window.localStorage.setItem(PROJECT_TASK_VIEW_KEY, view);
  }, [view]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">{project.name}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{project.description || "Project details and tasks."}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <span>{startDateLabel(project.startDate, project.startTime)}</span>
              <span>{dateLabel(project.dueDate, project.dueTime)}</span>
              {project.startDate ? <span>{durationLabel(project.startDate, project.dueDate)}</span> : null}
            </div>
          </div>
          <strong className="text-2xl text-[var(--text)]">{progress}%</strong>
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
      <div className="align-toolbar">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-[680px]">
        <Select className="align-field-quiet sm:min-h-10" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select className="align-field-quiet sm:min-h-10" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option value="all">All priorities</option>
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        </div>
        <ProjectTaskViewToggle value={view} onChange={setView} />
      </div>
      {view === "board" ? (
        <ProjectTaskBoard
          project={project}
          tasks={tasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onCompleteTask={onCompleteTask}
        />
      ) : view === "kanban" ? (
        <ProjectTaskKanban
          tasks={visibleTasks}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onCompleteTask={onCompleteTask}
        />
      ) : (
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
      )}
      <LinkedHubNotes notes={linkedHubNotes} />
    </div>
  );
}

function getSavedProjectTaskView(): ProjectTaskView {
  if (typeof window === "undefined") return "cards";
  const saved = window.localStorage.getItem(PROJECT_TASK_VIEW_KEY);
  return saved === "table" || saved === "board" || saved === "kanban" ? saved : "cards";
}

function ProjectTaskViewToggle({ value, onChange }: { value: ProjectTaskView; onChange: (value: ProjectTaskView) => void }) {
  const options = [
    { value: "cards" as const, label: "Cards", icon: Columns3 },
    { value: "table" as const, label: "Table", icon: Table2 },
    { value: "board" as const, label: "Board", icon: ListTree },
    { value: "kanban" as const, label: "Kanban", icon: KanbanSquare },
  ];

  return (
    <div className="align-tab-list">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            className="align-tab"
            data-active={active}
            onClick={() => onChange(optionValue)}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function LinkedHubNotes({ notes }: { notes: HubNote[] }) {
  const [selectedNote, setSelectedNote] = useState<HubNote | null>(null);

  if (!notes.length) return null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Project Context</h2>
          <p className="text-sm text-[var(--text-muted)]">Notes linked from Personal Hub. Linked notes appear on client share links.</p>
        </div>
        <Badge tone="slate">{notes.length} linked</Badge>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sortLinkedNotes(notes).map((note) => (
          <article
            key={note.id}
            role="button"
            tabIndex={0}
            className="group cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]"
            onClick={() => setSelectedNote(note)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedNote(note);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-[var(--text)]">{note.title}</h3>
              {note.favorite ? <Badge tone="purple">Favorite</Badge> : null}
            </div>
            <div className="mt-3 max-h-72 overflow-hidden">
              <MarkdownRenderer body={note.body} className="text-sm leading-6" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags
                ?.split(",")
                .filter(Boolean)
                .map((tag) => (
                  <Badge key={tag.trim()}>{tag.trim()}</Badge>
                ))}
            </div>
            <p className="mt-3 text-xs font-bold text-[var(--text-brand)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">
              Open note
            </p>
          </article>
        ))}
      </div>
      <NoteReaderModal
        note={selectedNote ? { title: selectedNote.title, body: selectedNote.body, tags: selectedNote.tags, favorite: selectedNote.favorite, updatedAt: selectedNote.updatedAt } : null}
        onClose={() => setSelectedNote(null)}
      />
    </Card>
  );
}

function sortLinkedNotes(notes: HubNote[]) {
  return [...notes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
}
