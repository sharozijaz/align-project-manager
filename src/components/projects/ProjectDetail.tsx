import { Check, Columns3, KanbanSquare, ListTree, Pin, Plus, RotateCcw, Search, Settings2, Table2 } from "lucide-react";
import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { Card } from "../ui/Card";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { NoteReaderModal } from "../notes/NoteReaderModal";
import { TaskDetailModal } from "../tasks/TaskDetailModal";
import { ProjectTaskBoard } from "./ProjectTaskBoard";
import { ProjectTaskKanban } from "./ProjectTaskKanban";
import { PROJECT_TASK_FIELDS, mergeProjectTaskFields, type ProjectTaskField, type ProjectTaskFieldVisibility } from "./projectTaskFields";
import { useEffect, useMemo, useState } from "react";
import { isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { useStudioStore } from "../../store/studioStore";
import type { Project, ProjectInput } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, durationLabel, startDateLabel } from "../../utils/date";

type ProjectTaskView = "cards" | "table" | "board" | "kanban";
const PROJECT_TASK_VIEW_KEY = "align-project-task-view-v1";
const PROJECT_TASK_FIELDS_KEY = "align-project-task-fields-v1";

export function ProjectDetail({
  project,
  tasks,
  projects,
  onAddTask,
  onUpdateTask,
  onUpdateProject,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
}: {
  project: Project;
  tasks: Task[];
  projects: Project[];
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onUpdateProject: (id: string, input: Partial<ProjectInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ProjectTaskView>(() => getSavedProjectTaskView());
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fieldPreferences, setFieldPreferences] = useState<Record<ProjectTaskView, Partial<ProjectTaskFieldVisibility>>>(() => getSavedFieldPreferences());
  const hubNotes = useStudioStore((state) => state.notes);
  const fields = mergeProjectTaskFields(view, fieldPreferences[view]);
  const complete = tasks.filter((task) => isTerminalTaskStatus(task.status)).length;
  const progress = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
  const linkedHubNotes = useMemo(() => hubNotes.filter((note) => note.projectIds?.includes(project.id)), [hubNotes, project.id]);
  const openTask = useMemo(() => (openTaskId ? tasks.find((task) => task.id === openTaskId) ?? null : null), [openTaskId, tasks]);
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const statusMatch = statusFilter === "all" || task.status === statusFilter;
        const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
        const query = search.trim().toLowerCase();
        const searchMatch = !query || task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query);
        return statusMatch && priorityMatch && searchMatch;
      }),
    [priorityFilter, search, statusFilter, tasks],
  );

  useEffect(() => {
    window.localStorage.setItem(PROJECT_TASK_VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(PROJECT_TASK_FIELDS_KEY, JSON.stringify(fieldPreferences));
  }, [fieldPreferences]);

  const updateVisibleField = (field: ProjectTaskField, enabled: boolean) => {
    setFieldPreferences((current) => ({
      ...current,
      [view]: {
        ...current[view],
        [field]: enabled,
      },
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-[var(--text)]">{project.name}</h1>
              {project.pinnedAt ? <Badge tone="purple">Pinned</Badge> : null}
              <Badge tone={project.status === "active" ? "emerald" : project.status === "paused" ? "amber" : "slate"}>{project.status}</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">{project.description || "Project details and tasks."}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Badge tone="slate">{startDateLabel(project.startDate, project.startTime)}</Badge>
              <Badge tone="slate">{dateLabel(project.dueDate, project.dueTime)}</Badge>
              {project.startDate ? <Badge tone="slate">{durationLabel(project.startDate, project.dueDate)}</Badge> : null}
              <Badge tone="slate">{tasks.length} tasks</Badge>
              <Badge tone="slate">{complete} done</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {project.status === "active" || project.status === "paused" ? (
              <Button
                variant="secondary"
                icon={<Pin size={15} className={project.pinnedAt ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : undefined} />}
                onClick={() => onUpdateProject(project.id, { pinnedAt: project.pinnedAt ? undefined : new Date().toISOString() })}
              >
                {project.pinnedAt ? "Pinned" : "Pin project"}
              </Button>
            ) : null}
            <strong className="text-2xl text-[var(--text)]">{progress}%</strong>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden bg-[var(--bg-muted)]">
          <div className="h-full align-gradient" style={{ width: `${progress}%` }} />
        </div>
      </Card>
      <div className="align-toolbar items-start">
        <ProjectTaskViewToggle value={view} onChange={setView} />
        <div className="grid flex-1 gap-2 lg:grid-cols-[minmax(240px,1fr)_170px_170px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" size={16} />
            <Input className="pl-10 sm:min-h-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks and notes..." />
          </label>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Settings2 size={15} />} onClick={() => setCustomizeOpen(true)}>
            Fields
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => setTaskModalOpen(true)}>
            Add Task
          </Button>
        </div>
      </div>
      {view === "board" ? (
        <ProjectTaskBoard
          project={project}
          tasks={visibleTasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          visibleFields={fields}
          onOpenTask={(task) => setOpenTaskId(task.id)}
        />
      ) : view === "kanban" ? (
        <ProjectTaskKanban
          project={project}
          tasks={visibleTasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          visibleFields={fields}
          onOpenTask={(task) => setOpenTaskId(task.id)}
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
          visibleFields={fields}
          onOpenTask={(task) => setOpenTaskId(task.id)}
        />
      )}
      <LinkedHubNotes notes={linkedHubNotes} />
      <Modal title="Add task" open={taskModalOpen} onClose={() => setTaskModalOpen(false)}>
        <TaskForm
          projects={projects}
          lockedProject={project}
          onSubmit={(input) => {
            onAddTask({ ...input, projectId: project.id, category: "project" });
            setTaskModalOpen(false);
          }}
          onCancel={() => setTaskModalOpen(false)}
        />
      </Modal>
      <TaskDetailModal
        task={openTask}
        project={project}
        projects={projects}
        tasks={tasks}
        notes={linkedHubNotes}
        open={Boolean(openTask)}
        onClose={() => setOpenTaskId(null)}
        onUpdateTask={onUpdateTask}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
      />
      <Modal title={`${view === "cards" ? "List" : view} fields`} open={customizeOpen} onClose={() => setCustomizeOpen(false)} className="w-[min(94vw,780px)] !max-w-none">
        <div className="space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold leading-6 text-[var(--text-muted)]">
              Keep each view focused by showing only the fields you need. These preferences stay on this device.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="slate">{Object.values(fields).filter(Boolean).length} visible</Badge>
              <Badge tone="slate">{view === "cards" ? "List" : view} view</Badge>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROJECT_TASK_FIELDS.map((field) => (
              <button
                key={field.key}
                type="button"
                className={`flex min-h-[88px] items-start justify-between gap-3 rounded-[var(--radius-sm)] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
                  fields[field.key]
                    ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
                }`}
                onClick={() => updateVisibleField(field.key, !fields[field.key])}
              >
                <span className="min-w-0">
                  <span className="block font-bold text-[var(--text)]">{field.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">{field.description}</span>
                </span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    fields[field.key] ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white" : "border-[var(--border-strong)]"
                  }`}
                >
                  {fields[field.key] ? <Check size={14} /> : null}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setFieldPreferences((current) => ({ ...current, [view]: {} }))}>
              Reset view
            </Button>
            <Button onClick={() => setCustomizeOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getSavedProjectTaskView(): ProjectTaskView {
  if (typeof window === "undefined") return "cards";
  const saved = window.localStorage.getItem(PROJECT_TASK_VIEW_KEY);
  return saved === "table" || saved === "board" || saved === "kanban" ? saved : "cards";
}

function getSavedFieldPreferences(): Record<ProjectTaskView, Partial<ProjectTaskFieldVisibility>> {
  const defaults = { cards: {}, table: {}, board: {}, kanban: {} };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = window.localStorage.getItem(PROJECT_TASK_FIELDS_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function ProjectTaskViewToggle({ value, onChange }: { value: ProjectTaskView; onChange: (value: ProjectTaskView) => void }) {
  const options = [
    { value: "cards" as const, label: "List", icon: Columns3 },
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
          <p className="text-sm text-[var(--text-muted)]">Linked notes stay private unless they are marked client-visible for share links.</p>
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
              <h3 className="min-w-0 truncate font-bold text-[var(--text)]">{note.title}</h3>
              <div className="flex shrink-0 flex-wrap gap-2">
                {note.clientVisible ? <Badge tone="emerald">Client-visible</Badge> : null}
                {note.favorite ? <Badge tone="purple">Favorite</Badge> : null}
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-[var(--text-brand)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">
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
