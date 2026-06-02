import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Columns3,
  FileText,
  Flag,
  Gauge,
  KanbanSquare,
  ListTree,
  Pin,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  Table2,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { ScopedSearchNotice } from "../ui/ScopedSearchNotice";
import { Select } from "../ui/Select";
import { NoteReaderModal } from "../notes/NoteReaderModal";
import { TaskDetailModal } from "../tasks/TaskDetailModal";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { getHeroOption, heroOptions } from "../../store/heroStore";
import { useSearchStore } from "../../store/searchStore";
import { useStudioStore } from "../../store/studioStore";
import type { Project, ProjectInput } from "../../types/project";
import type { HubNote } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, durationLabel, isOverdue, isToday, startDateLabel } from "../../utils/date";
import { ProjectSharePanel } from "./ProjectSharePanel";
import { ProjectTaskBoard } from "./ProjectTaskBoard";
import { ProjectTaskKanban } from "./ProjectTaskKanban";
import { PROJECT_TASK_FIELDS, mergeProjectTaskFields, type ProjectTaskField, type ProjectTaskFieldVisibility } from "./projectTaskFields";

type ProjectTaskView = "overview" | "cards" | "table" | "board" | "kanban";
type FieldView = Exclude<ProjectTaskView, "overview">;

const PROJECT_TASK_VIEW_KEY = "align-project-task-view-v2";
const PROJECT_TASK_FIELDS_KEY = "align-project-task-fields-v1";
const fallbackAccents = ["#3b82f6", "#10a37f", "#f59e0b", "#ef476f", "#8b5cf6"];

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
  const search = useSearchStore((state) => state.query);
  const clearSearch = useSearchStore((state) => state.clearQuery);
  const [view, setView] = useState<ProjectTaskView>(() => getSavedProjectTaskView());
  const fieldView = view === "overview" ? "cards" : view;
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fieldPreferences, setFieldPreferences] = useState<Record<FieldView, Partial<ProjectTaskFieldVisibility>>>(() => getSavedFieldPreferences());
  const hubNotes = useStudioStore((state) => state.notes);
  const fields = mergeProjectTaskFields(fieldView, fieldPreferences[fieldView]);
  const identity = useMemo(() => getProjectIdentity(project), [project]);
  const metrics = useMemo(() => getProjectMetrics(tasks), [tasks]);
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
      [fieldView]: {
        ...current[fieldView],
        [field]: enabled,
      },
    }));
  };

  const addQuickTask = (title: string) => {
    onAddTask({
      title,
      description: "",
      projectId: project.id,
      category: "project",
      priority: "medium",
      status: "not_started",
      startDate: "",
      startTime: "",
      dueDate: "",
      dueTime: "",
      reminder: "none",
      recurrence: "none",
    });
  };

  return (
    <div
      className="space-y-5"
      style={{
        "--project-accent": identity.accent,
        "--brand-primary": identity.accent,
        "--button-primary-bg": identity.accent,
        "--button-primary-hover": `color-mix(in srgb, ${identity.accent} 82%, #000)`,
        "--progress-fill": identity.accent,
        "--icon-tile-bg": `color-mix(in srgb, ${identity.accent} 16%, var(--surface-raised))`,
        "--icon-tile-border": `color-mix(in srgb, ${identity.accent} 34%, var(--border))`,
        "--accent-soft": `color-mix(in srgb, ${identity.accent} 14%, var(--panel-bg))`,
        "--accent-muted": `color-mix(in srgb, ${identity.accent} 24%, var(--panel-bg))`,
        "--shadow-focus": `0 0 0 3px color-mix(in srgb, ${identity.accent} 28%, transparent)`,
      } as CSSProperties}
    >
      <ProjectHero project={project} identity={identity} metrics={metrics} onUpdateProject={onUpdateProject} />
      <ProjectWorkspaceToolbar
        view={view}
        onViewChange={setView}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onStatusFilterChange={setStatusFilter}
        onPriorityFilterChange={setPriorityFilter}
        onCustomize={() => setCustomizeOpen(true)}
        onAddTask={() => setTaskModalOpen(true)}
      />
      <ScopedSearchNotice query={search} scope={`${project.name} tasks`} resultCount={visibleTasks.length} onClear={clearSearch} />
      {view === "overview" ? (
        <ProjectOverview
          project={project}
          tasks={tasks}
          metrics={metrics}
          notes={linkedHubNotes}
          onAddTask={addQuickTask}
          onOpenTask={(task) => setOpenTaskId(task.id)}
        />
      ) : (
        <ProjectTaskSurface
          view={view}
          project={project}
          tasks={visibleTasks}
          projects={projects}
          fields={fields}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onCompleteTask={onCompleteTask}
          onReorderTasks={onReorderTasks}
          onOpenTask={(task) => setOpenTaskId(task.id)}
        />
      )}
      <LinkedHubNotes notes={linkedHubNotes} />
      <section className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--project-accent)]">
            <Share2 size={16} />
          </span>
          <div>
            <h2 className="font-bold text-[var(--text)]">Sharing</h2>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Client-facing links stay read-only and separate from your private workspace.</p>
          </div>
        </div>
        <ProjectSharePanel project={project} />
      </section>
      <Modal title="Add project task" description={`Create work inside ${project.name}.`} open={taskModalOpen} onClose={() => setTaskModalOpen(false)}>
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
      <Modal title={`${fieldView === "cards" ? "List" : fieldView} fields`} description="Choose the fields shown in this project view." open={customizeOpen} onClose={() => setCustomizeOpen(false)} className="w-[min(92vw,620px)] !max-w-[620px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--text-muted)]">Preferences stay on this device.</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{Object.values(fields).filter(Boolean).length} visible</Badge>
              <Badge tone="slate">{fieldView === "cards" ? "List" : fieldView} view</Badge>
            </div>
          </div>
          <div className="grid gap-2">
            {PROJECT_TASK_FIELDS.map((field) => (
              <button
                key={field.key}
                type="button"
                className={`flex min-h-[58px] items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] ${
                  fields[field.key]
                    ? "border-[var(--project-accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--project-accent)_28%,transparent)]"
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
                    fields[field.key] ? "border-[var(--project-accent)] bg-[var(--project-accent)] text-white" : "border-[var(--border-strong)]"
                  }`}
                >
                  {fields[field.key] ? <Check size={14} /> : null}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setFieldPreferences((current) => ({ ...current, [fieldView]: {} }))}>
              Reset view
            </Button>
            <Button onClick={() => setCustomizeOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProjectHero({
  project,
  identity,
  metrics,
  onUpdateProject,
}: {
  project: Project;
  identity: ProjectIdentity;
  metrics: ProjectMetrics;
  onUpdateProject: (id: string, input: Partial<ProjectInput>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--shadow-sm)]">
      <div className="relative min-h-[220px] bg-cover bg-center" style={{ backgroundImage: `url(${identity.cover.src})` }}>
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.48)]" />
        <div className="relative flex min-h-[220px] flex-col justify-between gap-6 p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-md)] border border-white/20 bg-black/35 text-2xl font-black shadow-[var(--shadow-sm)]">
                {identity.icon}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-3xl font-black tracking-normal text-white">{project.name}</h1>
                  {project.pinnedAt ? <Badge tone="purple">Pinned</Badge> : null}
                  <Badge tone={project.status === "active" ? "emerald" : project.status === "paused" ? "amber" : "slate"}>{project.status}</Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/82">{project.description || `${identity.moodLabel} project workspace.`}</p>
              </div>
            </div>
            {project.status === "active" || project.status === "paused" ? (
              <Button
                variant="secondary"
                icon={<Pin size={15} className={project.pinnedAt ? "fill-[var(--project-accent)] text-[var(--project-accent)]" : undefined} />}
                onClick={() => onUpdateProject(project.id, { pinnedAt: project.pinnedAt ? undefined : new Date().toISOString() })}
              >
                {project.pinnedAt ? "Pinned" : "Pin"}
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div className="flex flex-wrap gap-2">
              <HeroPill icon={<CalendarDays size={14} />} label={startDateLabel(project.startDate, project.startTime)} />
              <HeroPill icon={<Flag size={14} />} label={dateLabel(project.dueDate, project.dueTime)} />
              {project.startDate ? <HeroPill icon={<Target size={14} />} label={durationLabel(project.startDate, project.dueDate)} /> : null}
              <HeroPill icon={<CircleDot size={14} />} label={`${metrics.open} open`} />
              <HeroPill icon={<CheckCircle2 size={14} />} label={`${metrics.completed} done`} />
            </div>
            <div className="rounded-[var(--radius-md)] border border-white/15 bg-black/35 p-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/62">Progress</span>
                <strong className="text-3xl font-black text-white">{metrics.progress}%</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/18">
                <div className="h-full rounded-full" style={{ width: `${metrics.progress}%`, backgroundColor: identity.accent }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/14 bg-black/30 px-3 text-xs font-bold text-white/86">
      {icon}
      {label}
    </span>
  );
}

function ProjectWorkspaceToolbar({
  view,
  onViewChange,
  statusFilter,
  priorityFilter,
  onStatusFilterChange,
  onPriorityFilterChange,
  onCustomize,
  onAddTask,
}: {
  view: ProjectTaskView;
  onViewChange: (view: ProjectTaskView) => void;
  statusFilter: string;
  priorityFilter: string;
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onCustomize: () => void;
  onAddTask: () => void;
}) {
  return (
    <div className="align-toolbar items-start">
      <ProjectTaskViewToggle value={view} onChange={onViewChange} />
      <div className="ml-auto grid w-full gap-2 md:w-auto md:grid-cols-[170px_170px_auto_auto]">
        <Select className="align-field-quiet sm:min-h-10" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="all">All statuses</option>
          {taskStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select className="align-field-quiet sm:min-h-10" value={priorityFilter} onChange={(event) => onPriorityFilterChange(event.target.value)}>
          <option value="all">All priorities</option>
          {taskPriorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button variant="secondary" icon={<Settings2 size={15} />} onClick={onCustomize}>
          Fields
        </Button>
        <Button icon={<Plus size={16} />} onClick={onAddTask}>
          Add Task
        </Button>
      </div>
    </div>
  );
}

function ProjectTaskViewToggle({ value, onChange }: { value: ProjectTaskView; onChange: (value: ProjectTaskView) => void }) {
  const options = [
    { value: "overview" as const, label: "Overview", icon: Gauge },
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
          <button key={optionValue} type="button" className="align-tab" data-active={active} onClick={() => onChange(optionValue)}>
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ProjectOverview({
  project,
  tasks,
  metrics,
  notes,
  onAddTask,
  onOpenTask,
}: {
  project: Project;
  tasks: Task[];
  metrics: ProjectMetrics;
  notes: HubNote[];
  onAddTask: (title: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const upcoming = tasks.filter((task) => !isTerminalTaskStatus(task.status) && task.dueDate).sort(compareDueDate).slice(0, 5);
  const recentDone = tasks.filter((task) => isTerminalTaskStatus(task.status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const workspace = getWorkspaceProfile(project);

  const submitQuickTask = () => {
    const title = draftTitle.trim();
    if (!title) return;
    onAddTask(title);
    setDraftTitle("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <OverviewStat icon={<Gauge size={16} />} label="Progress" value={`${metrics.progress}%`} helper={`${metrics.completed} of ${metrics.total} done`} />
          <OverviewStat icon={<CircleDot size={16} />} label="Open" value={metrics.open} helper="Tasks in motion" />
          <OverviewStat icon={<AlertTriangle size={16} />} label="Overdue" value={metrics.overdue} helper={metrics.overdue ? "Needs attention" : "No risk today"} tone={metrics.overdue ? "danger" : "ok"} />
          <OverviewStat icon={<FileText size={16} />} label={workspace.notesLabel} value={notes.length} helper={workspace.notesHelper} />
        </div>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">{workspace.movesTitle}</h2>
              <p className="text-sm text-[var(--text-muted)]">{workspace.movesBody}</p>
            </div>
            <span className="rounded-full border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] px-3 py-1 text-xs font-black text-[var(--project-accent)]">
              {workspace.label} workspace
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitQuickTask();
              }}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-semibold text-[var(--text)] outline-none transition focus:border-[var(--project-accent)]"
              placeholder={workspace.quickTaskPlaceholder}
            />
            <Button icon={<Plus size={16} />} onClick={submitQuickTask} disabled={!draftTitle.trim()}>
              Add Task
            </Button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {upcoming.length ? (
              upcoming.map((task) => <ProjectMiniTask key={task.id} task={task} onOpen={() => onOpenTask(task)} />)
            ) : (
              <EmptyProjectPanel icon={<CalendarDays size={18} />} title="No dated work" body="Add due dates to make upcoming project work visible here." />
            )}
          </div>
        </Card>
      </section>
      <aside className="space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--project-accent)]">
              <Target size={16} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">{workspace.focusTitle}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--text-muted)]">{workspace.focusBody}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {workspace.cues.map((cue) => (
              <div key={cue} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-bold text-[var(--text-muted)]">
                {cue}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-bold text-[var(--text)]">Project health</h2>
          <div className="mt-4 space-y-3">
            <HealthRow label="Due today" value={metrics.dueToday} />
            <HealthRow label="High priority open" value={metrics.highPriorityOpen} />
            <HealthRow label="Completed recently" value={recentDone.length} />
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--text)]">Recent completions</h2>
            <Badge tone="slate">{recentDone.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {recentDone.length ? recentDone.map((task) => <ProjectMiniTask key={task.id} task={task} completed onOpen={() => onOpenTask(task)} />) : <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-4 text-sm font-semibold text-[var(--text-muted)]">Completed tasks will collect here.</p>}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function OverviewStat({ icon, label, value, helper, tone = "neutral" }: { icon: ReactNode; label: string; value: string | number; helper: string; tone?: "neutral" | "danger" | "ok" }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "ok" ? "var(--success)" : "var(--project-accent)";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[var(--text)]">{value}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{helper}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)]" style={{ color }}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

function ProjectMiniTask({ task, completed, onOpen }: { task: Task; completed?: boolean; onOpen: () => void }) {
  const priority = getTaskPriorityOption(task.priority);
  const status = getTaskStatusOption(task.status);
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`min-w-0 font-bold text-[var(--text)] ${completed ? "line-through opacity-60" : ""}`}>{task.title}</span>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: priority.bg, borderColor: priority.border, color: priority.text }}>
          {priority.label}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <span>{dateLabel(task.dueDate, task.dueTime)}</span>
        <span style={{ color: status.text }}>{status.label}</span>
      </div>
    </button>
  );
}

function HealthRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
      <span className="text-sm font-bold text-[var(--text-muted)]">{label}</span>
      <strong className="text-[var(--text)]">{value}</strong>
    </div>
  );
}

function EmptyProjectPanel({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-6 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--project-accent)]">
        {icon}
      </span>
      <p className="mt-3 font-bold text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">{body}</p>
    </div>
  );
}

function ProjectTaskSurface({
  view,
  project,
  tasks,
  projects,
  fields,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onReorderTasks,
  onOpenTask,
}: {
  view: FieldView;
  project: Project;
  tasks: Task[];
  projects: Project[];
  fields: ProjectTaskFieldVisibility;
  onAddTask: (input: TaskInput) => void;
  onUpdateTask: (id: string, input: Partial<TaskInput>) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReorderTasks: (orderedIds: string[]) => void;
  onOpenTask: (task: Task) => void;
}) {
  if (view === "board") {
    return <ProjectTaskBoard project={project} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} visibleFields={fields} onOpenTask={onOpenTask} />;
  }

  if (view === "kanban") {
    return <ProjectTaskKanban project={project} tasks={tasks} onAddTask={onAddTask} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} visibleFields={fields} onOpenTask={onOpenTask} />;
  }

  return (
    <TaskList
      tasks={tasks}
      projects={projects}
      onUpdate={onUpdateTask}
      onDelete={onDeleteTask}
      onComplete={onCompleteTask}
      view={view}
      lockedProjectId={project.id}
      onReorder={onReorderTasks}
      visibleFields={fields}
      onOpenTask={onOpenTask}
      emptyText="This project view is empty. Add a task or loosen the filters."
    />
  );
}

function LinkedHubNotes({ notes }: { notes: HubNote[] }) {
  const [selectedNote, setSelectedNote] = useState<HubNote | null>(null);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Project Context</h2>
          <p className="text-sm text-[var(--text-muted)]">Linked notes stay private unless they are marked client-visible for share links.</p>
        </div>
        <Badge tone="slate">{notes.length} linked</Badge>
      </div>
      {notes.length ? (
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
              <p className="mt-2 text-xs font-bold text-[var(--text-brand)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">Open note</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyProjectPanel icon={<FileText size={18} />} title="No linked notes yet" body="Link notes from the Notes workspace to turn this into a richer project brief." />
      )}
      <NoteReaderModal
        note={selectedNote ? { title: selectedNote.title, body: selectedNote.body, tags: selectedNote.tags, favorite: selectedNote.favorite, updatedAt: selectedNote.updatedAt } : null}
        onClose={() => setSelectedNote(null)}
      />
    </Card>
  );
}

function getSavedProjectTaskView(): ProjectTaskView {
  if (typeof window === "undefined") return "overview";
  const saved = window.localStorage.getItem(PROJECT_TASK_VIEW_KEY);
  return saved === "cards" || saved === "table" || saved === "board" || saved === "kanban" || saved === "overview" ? saved : "overview";
}

function getSavedFieldPreferences(): Record<FieldView, Partial<ProjectTaskFieldVisibility>> {
  const defaults = { cards: {}, table: {}, board: {}, kanban: {} };
  if (typeof window === "undefined") return defaults;
  try {
    const saved = window.localStorage.getItem(PROJECT_TASK_FIELDS_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

type ProjectIdentity = ReturnType<typeof getProjectIdentity>;

function getWorkspaceProfile(project: Project) {
  const type = project.mood || (project.area === "personal" ? "personal" : "focused");
  const profiles: Record<NonNullable<Project["mood"]>, {
    label: string;
    movesTitle: string;
    movesBody: string;
    quickTaskPlaceholder: string;
    notesLabel: string;
    notesHelper: string;
    focusTitle: string;
    focusBody: string;
    cues: string[];
  }> = {
    focused: {
      label: "Focused",
      movesTitle: "Next project moves",
      movesBody: "Keep the next action, risk, and delivery path visible.",
      quickTaskPlaceholder: "Add the next move for this project",
      notesLabel: "Notes",
      notesHelper: "Project context",
      focusTitle: "Workspace focus",
      focusBody: "Best for a clean execution view where priority, blockers, and the next task matter most.",
      cues: ["Prioritize one next move", "Watch overdue and high-priority work", "Keep the task list lean"],
    },
    creative: {
      label: "Creative",
      movesTitle: "Creative next steps",
      movesBody: "Capture experiments, assets, drafts, and review passes before organizing them.",
      quickTaskPlaceholder: "Add a draft, idea, asset, or review step",
      notesLabel: "Context",
      notesHelper: "Ideas and references",
      focusTitle: "Creative workspace",
      focusBody: "Best for design, writing, content, and exploratory work where notes and references carry the project.",
      cues: ["Use notes as the project brief", "Track review passes", "Keep open ideas visible"],
    },
    technical: {
      label: "Technical",
      movesTitle: "Implementation moves",
      movesBody: "Track build work, specs, QA, and handoff details with tighter field discipline.",
      quickTaskPlaceholder: "Add a build, QA, bug, or handoff task",
      notesLabel: "Specs",
      notesHelper: "Technical context",
      focusTitle: "Technical workspace",
      focusBody: "Best for implementation-heavy projects where fields, due dates, and status precision are useful.",
      cues: ["Use Table for detailed fields", "Keep status current", "Separate build, QA, and review tasks"],
    },
    client: {
      label: "Client",
      movesTitle: "Client delivery moves",
      movesBody: "Keep deadlines, client-visible context, and shareable progress easy to inspect.",
      quickTaskPlaceholder: "Add a client deliverable, follow-up, or deadline",
      notesLabel: "Client notes",
      notesHelper: "Share context",
      focusTitle: "Client workspace",
      focusBody: "Best for external work where deadlines, updates, and client-facing links need extra care.",
      cues: ["Review client-visible notes", "Keep deadlines dated", "Use sharing when updates are ready"],
    },
    personal: {
      label: "Personal",
      movesTitle: "Personal next steps",
      movesBody: "Keep this lightweight: a few clear steps, low friction, and only the structure you need.",
      quickTaskPlaceholder: "Add a personal next step",
      notesLabel: "Notes",
      notesHelper: "Personal context",
      focusTitle: "Personal workspace",
      focusBody: "Best for personal planning where the page should stay quiet and easy to maintain.",
      cues: ["Keep tasks small", "Use dates only when useful", "Archive finished work"],
    },
  };

  return profiles[type];
}

function getProjectIdentity(project: Project) {
  const hash = hashString(project.id || project.name);
  const cover = getHeroOption((project.coverImage || heroOptions[hash % heroOptions.length].value) as (typeof heroOptions)[number]["value"]);
  return {
    cover,
    accent: project.accentColor || fallbackAccents[hash % fallbackAccents.length],
    icon: project.icon || (project.area === "personal" ? "◆" : "◈"),
    moodLabel: project.mood ? `${project.mood[0].toUpperCase()}${project.mood.slice(1)}` : project.area === "personal" ? "Personal" : "Focused",
  };
}

type ProjectMetrics = ReturnType<typeof getProjectMetrics>;

function getProjectMetrics(tasks: Task[]) {
  const completed = tasks.filter((task) => isTerminalTaskStatus(task.status)).length;
  const open = tasks.length - completed;
  const overdue = tasks.filter((task) => !isTerminalTaskStatus(task.status) && isOverdue(task.dueDate)).length;
  const dueToday = tasks.filter((task) => !isTerminalTaskStatus(task.status) && isToday(task.dueDate)).length;
  const highPriorityOpen = tasks.filter((task) => !isTerminalTaskStatus(task.status) && (task.priority === "high" || task.priority === "urgent")).length;
  return {
    total: tasks.length,
    completed,
    open,
    overdue,
    dueToday,
    highPriorityOpen,
    progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

function compareDueDate(a: Task, b: Task) {
  return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || b.updatedAt.localeCompare(a.updatedAt);
}

function sortLinkedNotes(notes: HubNote[]) {
  return [...notes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
}

function hashString(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}
