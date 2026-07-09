import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Columns3,
  Edit3,
  FileText,
  Flag,
  Gauge,
  KanbanSquare,
  Link2,
  ListTree,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Share2,
  Table2,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { TaskForm } from "../tasks/TaskForm";
import { TaskList } from "../tasks/TaskList";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { ScopedSearchNotice } from "../ui/ScopedSearchNotice";
import { Select } from "../ui/Select";
import { RichNoteRenderer } from "../notes/RichNoteRenderer";
import { TaskDetailModal } from "../tasks/TaskDetailModal";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../../config/taskOptions";
import { getHeroOption, heroOptions } from "../../store/heroStore";
import { useMilestoneStore } from "../../store/milestoneStore";
import { useSearchStore } from "../../store/searchStore";
import { useSnippetStore } from "../../store/snippetStore";
import { useStudioStore } from "../../store/studioStore";
import type { Project, ProjectInput, ProjectMilestone } from "../../types/project";
import type { HubNote, HubNoteDocStatus, HubNoteDocType, HubPalette } from "../../types/studio";
import type { Task, TaskInput } from "../../types/task";
import { dateLabel, durationLabel, isOverdue, isToday, startDateLabel } from "../../utils/date";
import { ProjectSharePanel } from "./ProjectSharePanel";
import { ProjectTaskBoard } from "./ProjectTaskBoard";
import { ProjectTaskKanban } from "./ProjectTaskKanban";
import { PROJECT_TASK_FIELDS, mergeProjectTaskFields, type ProjectTaskField, type ProjectTaskFieldVisibility } from "./projectTaskFields";

type ProjectTaskView = "overview" | "docs" | "cards" | "table" | "board" | "kanban";
type FieldView = Exclude<ProjectTaskView, "overview" | "docs">;

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
  const fieldView: FieldView = view === "overview" || view === "docs" ? "cards" : view;
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [docCreateSignal, setDocCreateSignal] = useState(0);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fieldPreferences, setFieldPreferences] = useState<Record<FieldView, Partial<ProjectTaskFieldVisibility>>>(() => getSavedFieldPreferences());
  const hubNotes = useStudioStore((state) => state.notes);
  const palettes = useStudioStore((state) => state.palettes);
  const addNote = useStudioStore((state) => state.addNote);
  const updateNote = useStudioStore((state) => state.updateNote);
  const addPalette = useStudioStore((state) => state.addPalette);
  const milestones = useMilestoneStore((state) => state.milestones);
  const addMilestone = useMilestoneStore((state) => state.addMilestone);
  const updateMilestone = useMilestoneStore((state) => state.updateMilestone);
  const fields = mergeProjectTaskFields(fieldView, fieldPreferences[fieldView]);
  const identity = useMemo(() => getProjectIdentity(project), [project]);
  const metrics = useMemo(() => getProjectMetrics(tasks), [tasks]);
  const linkedHubNotes = useMemo(() => hubNotes.filter((note) => note.projectIds?.includes(project.id)), [hubNotes, project.id]);
  const linkedPalettes = useMemo(() => palettes.filter((palette) => palette.projectIds.includes(project.id) || palette.noteIds.some((noteId) => linkedHubNotes.some((note) => note.id === noteId))), [linkedHubNotes, palettes, project.id]);
  const projectMilestones = useMemo(() => milestones.filter((milestone) => milestone.projectId === project.id).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt)), [milestones, project.id]);
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
        onAddDoc={() => {
          setView("docs");
          setDocCreateSignal((signal) => signal + 1);
        }}
      />
      {view !== "docs" ? <ScopedSearchNotice query={search} scope={`${project.name} tasks`} resultCount={visibleTasks.length} onClear={clearSearch} /> : null}
      {view === "overview" ? (
        <ProjectOverview
          project={project}
          tasks={tasks}
          metrics={metrics}
          notes={linkedHubNotes}
          palettes={linkedPalettes}
          milestones={projectMilestones}
          onAddTask={addQuickTask}
          onOpenTask={(task) => setOpenTaskId(task.id)}
          onOpenDocs={() => setView("docs")}
          onAddMilestone={(title) => addMilestone({ projectId: project.id, title, status: "planned" })}
          onUpdateMilestone={updateMilestone}
        />
      ) : view === "docs" ? (
        <ProjectDocsWorkspace project={project} tasks={tasks} notes={linkedHubNotes} allNotes={hubNotes} palettes={linkedPalettes} milestones={projectMilestones} createSignal={docCreateSignal} onAddNote={addNote} onUpdateNote={updateNote} onAddPalette={addPalette} />
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
        <ClientHandoffPreview project={project} tasks={tasks} notes={linkedHubNotes.filter((note) => note.clientVisible)} milestones={projectMilestones} />
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
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-md)] border border-white/20 bg-black/35 text-2xl font-bold shadow-[var(--shadow-sm)]">
                {identity.icon}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-3xl font-bold tracking-normal text-white">{project.name}</h1>
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
                <strong className="text-3xl font-bold text-white">{metrics.progress}%</strong>
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
  onAddDoc,
}: {
  view: ProjectTaskView;
  onViewChange: (view: ProjectTaskView) => void;
  statusFilter: string;
  priorityFilter: string;
  onStatusFilterChange: (value: string) => void;
  onPriorityFilterChange: (value: string) => void;
  onCustomize: () => void;
  onAddTask: () => void;
  onAddDoc: () => void;
}) {
  const docsActive = view === "docs";

  return (
    <div className="align-toolbar items-start">
      <ProjectTaskViewToggle value={view} onChange={onViewChange} />
      {docsActive ? (
        <div className="ml-auto">
          <Button icon={<FileText size={16} />} onClick={onAddDoc}>
            New Doc
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}

function ProjectTaskViewToggle({ value, onChange }: { value: ProjectTaskView; onChange: (value: ProjectTaskView) => void }) {
  const options = [
    { value: "overview" as const, label: "Overview", icon: Gauge },
    { value: "docs" as const, label: "Docs", icon: BookOpen },
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
  palettes,
  milestones,
  onAddTask,
  onOpenTask,
  onOpenDocs,
  onAddMilestone,
  onUpdateMilestone,
}: {
  project: Project;
  tasks: Task[];
  metrics: ProjectMetrics;
  notes: HubNote[];
  palettes: HubPalette[];
  milestones: ProjectMilestone[];
  onAddTask: (title: string) => void;
  onOpenTask: (task: Task) => void;
  onOpenDocs: () => void;
  onAddMilestone: (title: string) => void;
  onUpdateMilestone: (id: string, updates: Partial<Omit<ProjectMilestone, "id" | "projectId" | "createdAt" | "updatedAt">>) => void;
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
          <OverviewStat icon={<Gauge size={16} />} label="Progress" value={`${metrics.progress}%`} helper={`${metrics.completed} of ${metrics.total} complete`} />
          <OverviewStat icon={<CircleDot size={16} />} label="Remaining" value={metrics.open} helper="Tasks still moving" />
          <OverviewStat icon={<AlertTriangle size={16} />} label="Overdue" value={metrics.overdue} helper={metrics.overdue ? "Needs attention" : "No overdue work"} tone={metrics.overdue ? "danger" : "ok"} />
          <OverviewStat icon={<FileText size={16} />} label={workspace.notesLabel} value={notes.length} helper={workspace.notesHelper} />
        </div>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">{workspace.movesTitle}</h2>
              <p className="text-sm text-[var(--text-muted)]">{workspace.movesBody}</p>
            </div>
            <span className="rounded-full border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] px-3 py-1 text-xs font-bold text-[var(--project-accent)]">
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
        <ProjectMilestonesPanel milestones={milestones} tasks={tasks} onAddMilestone={onAddMilestone} onUpdateMilestone={onUpdateMilestone} />
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
        <ProjectDocsPreview notes={notes} palettes={palettes} onOpenDocs={onOpenDocs} />
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

function ProjectDocsPreview({ notes, palettes, onOpenDocs }: { notes: HubNote[]; palettes: HubPalette[]; onOpenDocs: () => void }) {
  const sorted = sortLinkedNotes(notes).slice(0, 3);
  const reviewCount = notes.filter((note) => (note.docStatus ?? "active") === "review").length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--project-accent)]">
            <BookOpen size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text)]">Project docs</h2>
            <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">{notes.length ? `${notes.length} docs, ${reviewCount} need review, ${palettes.length} palettes` : "Briefs, research, palettes, and decisions live here."}</p>
          </div>
        </div>
        <Button variant="secondary" icon={<BookOpen size={15} />} onClick={onOpenDocs}>
          Open
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {sorted.length ? (
          sorted.map((note) => (
            <button key={note.id} type="button" onClick={onOpenDocs} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
              <span className="block truncate text-sm font-bold text-[var(--text)]">{note.title}</span>
              <span className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-soft)]">
                <span>{docTypeLabel(note.docType)}</span>
                <span>{docStatusLabel(note.docStatus)}</span>
                {note.clientVisible ? <span>Client-visible</span> : null}
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-4 text-sm font-semibold text-[var(--text-muted)]">No project docs yet. Create a brief, strategy note, research doc, or palette from the Docs tab.</p>
        )}
      </div>
    </Card>
  );
}

function ProjectMilestonesPanel({
  milestones,
  tasks,
  onAddMilestone,
  onUpdateMilestone,
}: {
  milestones: ProjectMilestone[];
  tasks: Task[];
  onAddMilestone: (title: string) => void;
  onUpdateMilestone: (id: string, updates: Partial<Omit<ProjectMilestone, "id" | "projectId" | "createdAt" | "updatedAt">>) => void;
}) {
  const [title, setTitle] = useState("");

  const submit = () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    onAddMilestone(nextTitle);
    setTitle("");
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">Milestones</h2>
          <p className="text-sm text-[var(--text-muted)]">Milestones group project phases. Tasks and docs can link to them as the project grows.</p>
        </div>
        <Badge tone="slate">{milestones.length} phases</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {milestones.length ? (
          milestones.map((milestone) => {
            const linkedTasks = tasks.filter((task) => task.milestoneId === milestone.id && !task.deletedAt);
            const done = linkedTasks.filter((task) => isTerminalTaskStatus(task.status)).length;
            const progress = linkedTasks.length ? Math.round((done / linkedTasks.length) * 100) : milestone.status === "done" ? 100 : 0;
            return (
              <div key={milestone.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-[var(--text)]">{milestone.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{done} of {linkedTasks.length} tasks complete · {progress}%</p>
                  </div>
                  <Select className="w-36 min-h-9 sm:min-h-9" value={milestone.status} onChange={(event) => onUpdateMilestone(milestone.id, { status: event.target.value as ProjectMilestone["status"] })}>
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="done">Done</option>
                  </Select>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                  <div className="h-full rounded-full bg-[var(--project-accent)]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <EmptyProjectPanel icon={<Target size={18} />} title="No milestones yet" body="Add phases like Discovery, Design, Build, Review, or Launch." />
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} className="align-project-input" placeholder="Add milestone..." />
        <Button type="button" icon={<Plus size={15} />} onClick={submit} disabled={!title.trim()}>Add</Button>
      </div>
    </Card>
  );
}

function ClientHandoffPreview({ project, tasks, notes, milestones }: { project: Project; tasks: Task[]; notes: HubNote[]; milestones: ProjectMilestone[] }) {
  const liveTasks = tasks.filter((task) => !task.deletedAt);
  const completed = liveTasks.filter((task) => isTerminalTaskStatus(task.status));
  const nextSteps = liveTasks.filter((task) => !isTerminalTaskStatus(task.status)).slice(0, 4);
  const doneMilestones = milestones.filter((milestone) => milestone.status === "done").length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">Client Handoff Preview</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--text-muted)]">A read-only outline of what a client-safe handoff should communicate.</p>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-right">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Deadline</p>
          <p className="text-sm font-bold text-[var(--text)]">{dateLabel(project.dueDate, project.dueTime)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <HandoffMiniCard label="Status" value={project.status} helper={project.priority} />
        <HandoffMiniCard label="Milestones" value={`${doneMilestones}/${milestones.length}`} helper="complete" />
        <HandoffMiniCard label="Completed Work" value={completed.length} helper={`${liveTasks.length} total tasks`} />
        <HandoffMiniCard label="Shared Docs" value={notes.length} helper="client-visible" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Selected Docs</p>
          <div className="mt-2 space-y-2">
            {notes.length ? notes.slice(0, 4).map((note) => <p key={note.id} className="rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm font-bold text-[var(--text)]">{note.title}</p>) : <p className="text-sm font-semibold text-[var(--text-muted)]">No client-visible docs yet.</p>}
          </div>
        </section>
        <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Next Steps</p>
          <div className="mt-2 space-y-2">
            {nextSteps.length ? nextSteps.map((task) => <p key={task.id} className="rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm font-bold text-[var(--text)]">{task.title}</p>) : <p className="text-sm font-semibold text-[var(--text-muted)]">No open next steps.</p>}
          </div>
        </section>
      </div>
    </Card>
  );
}

function HandoffMiniCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-xl font-bold capitalize text-[var(--text)]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{helper}</p>
    </div>
  );
}

type ProjectDocFilter = "all" | "pinned" | HubNoteDocType | "review" | "archived";

type ProjectDocFormState = {
  title: string;
  body: string;
  tags: string;
  docType: HubNoteDocType;
  docStatus: HubNoteDocStatus;
  milestoneId: string;
  clientVisible: boolean;
  favorite: boolean;
  relatedNoteIds: string[];
};

type ProjectPaletteFormState = {
  name: string;
  tags: string;
  noteIds: string[];
  colors: Array<{ id: string; name: string; hex: string; role: string }>;
};

const projectDocTypeOptions: Array<{ value: HubNoteDocType; label: string }> = [
  { value: "general", label: "General" },
  { value: "brief", label: "Brief" },
  { value: "strategy", label: "Strategy" },
  { value: "research", label: "Research" },
  { value: "palette", label: "Palette" },
  { value: "meeting", label: "Meeting" },
  { value: "prompt", label: "Prompt" },
  { value: "checklist", label: "Checklist" },
  { value: "reference", label: "Reference" },
];

const projectDocStatusOptions: Array<{ value: HubNoteDocStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "review", label: "Needs Review" },
  { value: "archived", label: "Archived" },
];

const projectDocFilters: Array<{ value: ProjectDocFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
  { value: "brief", label: "Brief" },
  { value: "strategy", label: "Strategy" },
  { value: "research", label: "Research" },
  { value: "palette", label: "Palette" },
  { value: "meeting", label: "Meeting" },
  { value: "prompt", label: "Prompt" },
  { value: "checklist", label: "Checklist" },
  { value: "reference", label: "Reference" },
  { value: "review", label: "Needs Review" },
  { value: "archived", label: "Archived" },
];

function ProjectDocsWorkspace({
  project,
  tasks,
  notes,
  allNotes,
  palettes,
  milestones,
  createSignal,
  onAddNote,
  onUpdateNote,
  onAddPalette,
}: {
  project: Project;
  tasks: Task[];
  notes: HubNote[];
  allNotes: HubNote[];
  palettes: HubPalette[];
  milestones: ProjectMilestone[];
  createSignal: number;
  onAddNote: (input: Omit<HubNote, "id" | "createdAt" | "updatedAt">) => HubNote;
  onUpdateNote: (id: string, updates: Partial<Omit<HubNote, "id" | "createdAt" | "updatedAt">>) => void;
  onAddPalette: (input: Omit<HubPalette, "id" | "createdAt" | "updatedAt">) => HubPalette;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProjectDocFilter>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<HubNote | null>(null);
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortLinkedNotes(notes).filter((note) => {
      const type = note.docType ?? "general";
      const status = note.docStatus ?? "active";
      const matchesFilter =
        filter === "all" ||
        (filter === "pinned" ? Boolean(note.favorite) : filter === "review" ? status === "review" : filter === "archived" ? status === "archived" : type === filter);
      const matchesQuery = !normalizedQuery || `${note.title} ${note.tags ?? ""} ${note.body} ${type} ${status}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, notes, query]);

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0] ?? notes[0] ?? null;
  const projectPalettes = palettes.filter((palette) => palette.projectIds.includes(project.id) || (selectedNote ? palette.noteIds.includes(selectedNote.id) : false));
  const stats = getProjectDocStats(notes, palettes);

  useEffect(() => {
    if (createSignal > 0) setCreatingDoc(true);
  }, [createSignal]);

  useEffect(() => {
    if (selectedNote && !notes.some((note) => note.id === selectedNote.id)) setSelectedNoteId(filteredNotes[0]?.id ?? null);
  }, [filteredNotes, notes, selectedNote]);

  const saveDoc = (form: ProjectDocFormState, note?: HubNote | null) => {
    const payload = {
      title: form.title.trim() || "Untitled project doc",
      body: form.body,
      tags: form.tags.trim() || undefined,
      favorite: form.favorite,
      clientVisible: form.clientVisible,
      docType: form.docType,
      docStatus: form.docStatus,
      projectIds: note ? normalizeIdList([...note.projectIds, project.id]) : [project.id],
      relatedNoteIds: normalizeIdList(form.relatedNoteIds.filter((noteId) => noteId !== note?.id)),
      collection: note?.collection,
      milestoneId: form.milestoneId || undefined,
    };

    if (note) {
      onUpdateNote(note.id, payload);
      setSelectedNoteId(note.id);
    } else {
      const created = onAddNote(payload);
      setSelectedNoteId(created.id);
    }

    setEditingNote(null);
    setCreatingDoc(false);
  };

  const toggleChecklistLine = (note: HubNote, lineIndex: number) => {
    onUpdateNote(note.id, { body: toggleChecklistLineInMarkdown(note.body, lineIndex) });
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <ProjectDocStat label="Docs" value={stats.total} helper="Linked to project" />
        <ProjectDocStat label="Active" value={stats.active} helper="Ready context" />
        <ProjectDocStat label="Review" value={stats.review} helper="Needs decision" tone={stats.review ? "danger" : "neutral"} />
        <ProjectDocStat label="Client-visible" value={stats.clientVisible} helper="Shared context" />
        <ProjectDocStat label="Palettes" value={stats.palettes} helper="Project assets" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Project Documentation</h2>
            <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">Briefs, strategy, research, palettes, prompts, and decisions connected to this project.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Palette size={16} />} onClick={() => setPaletteOpen(true)}>
              New Palette
            </Button>
            <Button icon={<FileText size={16} />} onClick={() => setCreatingDoc(true)}>
              New Doc
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 min-[1180px]:flex-row min-[1180px]:items-center min-[1180px]:justify-between">
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-semibold text-[var(--text)]">
            <Search size={16} className="text-[var(--text-soft)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project docs, tags, body..." className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--input-placeholder)]" />
          </label>
          <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 min-[1180px]:max-w-[58%]">
            {projectDocFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`min-h-9 shrink-0 rounded-[var(--radius-sm)] border px-3 text-xs font-bold transition ${
                  filter === item.value
                    ? "border-[var(--project-accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 min-[1180px]:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
          <div className="max-h-[520px] min-h-[280px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 min-[1180px]:max-h-[calc(100vh-360px)] min-[1180px]:min-h-[420px]">
            {filteredNotes.length ? (
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <ProjectDocListItem key={note.id} note={note} active={selectedNote?.id === note.id} onSelect={() => setSelectedNoteId(note.id)} />
                ))}
              </div>
            ) : (
              <EmptyProjectPanel icon={<FileText size={18} />} title="No docs match" body={notes.length ? "Try another search or filter." : "Create the first project doc to keep context close to the work."} />
            )}
          </div>

          <div className="min-h-[420px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
            {selectedNote ? (
              <ProjectDocReader
                note={selectedNote}
                allNotes={allNotes}
                palettes={projectPalettes}
                relatedNotes={getRelatedProjectNotes(selectedNote, notes)}
                relatedTasks={tasks.filter((task) => !task.deletedAt && (task.linkedNoteIds ?? []).includes(selectedNote.id))}
                onEdit={() => setEditingNote(selectedNote)}
                onOpenNote={setSelectedNoteId}
                onToggleChecklistLine={(lineIndex) => toggleChecklistLine(selectedNote, lineIndex)}
                onNewPalette={() => setPaletteOpen(true)}
              />
            ) : (
              <EmptyProjectPanel icon={<BookOpen size={18} />} title="Select a doc" body="Project documentation opens here with outline, linked notes, and palettes." />
            )}
          </div>
        </div>
      </Card>

      <ProjectDocModal open={creatingDoc} projectName={project.name} milestones={milestones} allNotes={allNotes} onClose={() => setCreatingDoc(false)} onSave={(form) => saveDoc(form)} />
      <ProjectDocModal open={Boolean(editingNote)} projectName={project.name} note={editingNote} milestones={milestones} allNotes={allNotes} onClose={() => setEditingNote(null)} onSave={(form) => saveDoc(form, editingNote)} />
      <ProjectPaletteModal
        open={paletteOpen}
        project={project}
        selectedNote={selectedNote}
        notes={notes}
        onClose={() => setPaletteOpen(false)}
        onSave={(form) => {
          onAddPalette({
            name: form.name.trim() || "Project palette",
            tags: form.tags.trim() || undefined,
            projectIds: [project.id],
            noteIds: form.noteIds,
            colors: form.colors
              .map((color) => ({ id: color.id, name: color.name.trim() || "Color", hex: normalizeHexInput(color.hex), role: color.role.trim() || undefined }))
              .filter((color) => /^#[0-9A-F]{6}$/.test(color.hex)),
          });
          setPaletteOpen(false);
        }}
      />
    </section>
  );
}

function ProjectDocStat({ label, value, helper, tone = "neutral" }: { label: string; value: number; helper: string; tone?: "neutral" | "danger" }) {
  return (
    <Card className={`border p-3 ${tone === "danger" ? "border-[var(--priority-high-border)] bg-[var(--priority-high-bg)]" : ""}`}>
      <div className="flex items-center justify-between gap-3 lg:block">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">{helper}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold text-[var(--text)] lg:mt-2">{value}</p>
      </div>
    </Card>
  );
}

function ProjectDocListItem({ note, active, onSelect }: { note: HubNote; active: boolean; onSelect: () => void }) {
  const excerpt = getNoteExcerpt(note.body);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full rounded-[var(--radius-sm)] border p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] ${
        active ? "border-[var(--project-accent)] bg-[var(--accent-soft)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--project-accent)_24%,transparent)]" : "border-[var(--border)] bg-[var(--surface-raised)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate font-bold text-[var(--text)]">{note.title}</span>
        {note.favorite ? <Pin size={14} className="shrink-0 fill-[var(--project-accent)] text-[var(--project-accent)]" /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="slate">{docTypeLabel(note.docType)}</Badge>
        <Badge tone={(note.docStatus ?? "active") === "review" ? "amber" : (note.docStatus ?? "active") === "archived" ? "slate" : "emerald"}>{docStatusLabel(note.docStatus)}</Badge>
        {note.clientVisible ? <Badge tone="blue">Client-visible</Badge> : null}
      </div>
      {excerpt ? <p className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-[var(--text-muted)]">{excerpt}</p> : null}
      <p className="mt-3 text-xs font-semibold text-[var(--text-soft)]">Updated {plainProjectDate(note.updatedAt)}</p>
    </button>
  );
}

function ProjectDocReader({
  note,
  allNotes,
  palettes,
  relatedNotes,
  relatedTasks,
  onEdit,
  onOpenNote,
  onToggleChecklistLine,
  onNewPalette,
}: {
  note: HubNote;
  allNotes: HubNote[];
  palettes: HubPalette[];
  relatedNotes: HubNote[];
  relatedTasks: Task[];
  onEdit: () => void;
  onOpenNote: (noteId: string) => void;
  onToggleChecklistLine: (lineIndex: number) => void;
  onNewPalette: () => void;
}) {
  const headings = getMarkdownHeadings(note.body);
  const [detailsOpen, setDetailsOpen] = useState(() => (typeof window === "undefined" ? true : window.matchMedia("(min-width: 1536px)").matches));
  const detailCount = headings.length + relatedNotes.length + relatedTasks.length + palettes.length;

  return (
    <div className={`grid min-h-[420px] gap-0 ${detailsOpen ? "min-[1536px]:grid-cols-[minmax(0,1fr)_260px]" : ""}`}>
      <article className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{docTypeLabel(note.docType)}</Badge>
              <Badge tone={(note.docStatus ?? "active") === "review" ? "amber" : (note.docStatus ?? "active") === "archived" ? "slate" : "emerald"}>{docStatusLabel(note.docStatus)}</Badge>
              {note.clientVisible ? <Badge tone="blue">Client-visible</Badge> : <Badge tone="slate">Private</Badge>}
              {note.favorite ? <Badge tone="purple">Pinned</Badge> : null}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-[var(--text)]">{note.title}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--text-soft)]">Updated {plainProjectDate(note.updatedAt)} · {getReadTimeLabel(note.body)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={detailsOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />} onClick={() => setDetailsOpen((open) => !open)}>
              Details {detailCount ? `(${detailCount})` : ""}
            </Button>
            <Button variant="secondary" icon={<Edit3 size={15} />} onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
        <div className="pt-5">
          {note.body.trim() ? (
            <RichNoteRenderer body={note.body} allNotes={allNotes} palettes={palettes} onOpenNote={onOpenNote} onToggleChecklistLine={onToggleChecklistLine} className="max-w-none text-sm leading-7 sm:text-base" />
          ) : (
            <EmptyProjectPanel icon={<FileText size={18} />} title="Empty document" body="Edit this doc to add the brief, decisions, links, or project notes." />
          )}
        </div>
      </article>
      <aside className={`${detailsOpen ? "block" : "hidden"} border-t border-[var(--border)] bg-[var(--surface-raised)] p-4 min-[1536px]:border-l min-[1536px]:border-t-0`}>
        <div className="space-y-4">
          <ProjectDocSideBlock title="Outline" empty="Add headings to build an outline.">
            {headings.map((heading) => (
              <p key={`${heading.line}-${heading.title}`} className="truncate text-sm font-semibold text-[var(--text-muted)]" style={{ paddingLeft: `${Math.max(0, heading.level - 1) * 10}px` }}>
                {heading.title}
              </p>
            ))}
          </ProjectDocSideBlock>
          <ProjectDocSideBlock title="Related Docs" empty="No related docs yet.">
            {relatedNotes.map((related) => (
              <button key={related.id} type="button" onClick={() => onOpenNote(related.id)} className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
                <Link2 size={14} className="shrink-0 text-[var(--project-accent)]" />
                <span className="truncate">{related.title}</span>
              </button>
            ))}
          </ProjectDocSideBlock>
          <ProjectDocSideBlock title="Related Tasks" empty="No tasks linked to this doc.">
            {relatedTasks.map((task) => (
              <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                <p className="truncate text-sm font-bold text-[var(--text)]">{task.title}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{getTaskStatusOption(task.status)?.label ?? task.status}</p>
              </div>
            ))}
          </ProjectDocSideBlock>
          <ProjectDocSideBlock title="Palettes" empty="No linked palettes.">
            {palettes.map((palette) => (
              <div key={palette.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
                <p className="truncate text-sm font-bold text-[var(--text)]">{palette.name}</p>
                <div className="mt-2 flex gap-1">
                  {palette.colors.slice(0, 7).map((color) => (
                    <button key={color.id} type="button" className="h-6 w-6 rounded-[var(--radius-xs)] border border-[var(--border)]" style={{ backgroundColor: color.hex }} title={`Copy ${color.hex}`} onClick={() => void navigator.clipboard?.writeText(color.hex)} />
                  ))}
                </div>
              </div>
            ))}
            <Button variant="secondary" className="w-full" icon={<Palette size={14} />} onClick={onNewPalette}>
              New Palette
            </Button>
          </ProjectDocSideBlock>
        </div>
      </aside>
    </div>
  );
}

function ProjectDocSideBlock({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{title}</p>
      <div className="space-y-2">{hasChildren ? children : <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-3 text-sm font-semibold text-[var(--text-muted)]">{empty}</p>}</div>
    </section>
  );
}

function ProjectDocModal({
  open,
  projectName,
  note,
  milestones,
  allNotes,
  onClose,
  onSave,
}: {
  open: boolean;
  projectName: string;
  note?: HubNote | null;
  milestones: ProjectMilestone[];
  allNotes: HubNote[];
  onClose: () => void;
  onSave: (form: ProjectDocFormState) => void;
}) {
  const [form, setForm] = useState<ProjectDocFormState>(() => noteToProjectDocForm(note, projectName));
  const snippets = useSnippetStore((state) => state.snippets);

  useEffect(() => {
    if (open) setForm(noteToProjectDocForm(note, projectName));
  }, [note, open, projectName]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <Modal title={note ? "Edit project doc" : "New project doc"} description={note ? "Update project documentation, visibility, and relationships." : `Create a document linked to ${projectName}.`} open={open} onClose={onClose} className="!max-w-[1120px]">
      <form className="grid max-h-[78vh] gap-4 overflow-y-auto" onSubmit={submit}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <FieldShell label="Title">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="align-project-input" placeholder="Project brief, research notes, launch checklist..." />
          </FieldShell>
          <FieldShell label="Type">
            <select value={form.docType} onChange={(event) => setForm({ ...form, docType: event.target.value as HubNoteDocType })} className="align-project-input">
              {projectDocTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldShell>
          <FieldShell label="Status">
            <select value={form.docStatus} onChange={(event) => setForm({ ...form, docStatus: event.target.value as HubNoteDocStatus })} className="align-project-input">
              {projectDocStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldShell>
        </div>
        <FieldShell label="Tags">
          <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="align-project-input" placeholder="brand, research, handoff" />
        </FieldShell>
        <FieldShell label="Milestone">
          <select value={form.milestoneId} onChange={(event) => setForm({ ...form, milestoneId: event.target.value })} className="align-project-input">
            <option value="">No milestone</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
            ))}
          </select>
        </FieldShell>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <FieldShell label="Document">
            {snippets.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {snippets.slice(0, 6).map((snippet) => (
                  <Button
                    key={snippet.id}
                    type="button"
                    variant="secondary"
                    className="min-h-8 px-2 text-xs sm:min-h-8"
                    onClick={() => setForm((current) => ({ ...current, body: `${current.body.trimEnd()}\n\n${snippet.body}\n`.trimStart() }))}
                  >
                    {snippet.title}
                  </Button>
                ))}
              </div>
            ) : null}
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="min-h-[420px] w-full resize-y rounded-[var(--radius-sm)] border border-[var(--input-border)] bg-[var(--input-bg)] p-3 font-mono text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--project-accent)]" placeholder="# Project Brief" />
          </FieldShell>
          <div className="space-y-3">
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <label className="flex items-start gap-3 text-sm font-bold text-[var(--text)]">
                <input type="checkbox" checked={form.clientVisible} onChange={(event) => setForm({ ...form, clientVisible: event.target.checked })} className="mt-1" />
                <span>
                  Client-visible
                  <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">Only enable for docs that are safe for share links.</span>
                </span>
              </label>
              <label className="mt-3 flex items-start gap-3 text-sm font-bold text-[var(--text)]">
                <input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} className="mt-1" />
                <span>Pinned document</span>
              </label>
            </div>
            <RelatedNoteSelector notes={allNotes} currentNoteId={note?.id} selectedIds={form.relatedNoteIds} onChange={(relatedNoteIds) => setForm({ ...form, relatedNoteIds })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" icon={<X size={15} />} onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={<Save size={15} />}>Save Doc</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectPaletteModal({
  open,
  project,
  selectedNote,
  notes,
  onClose,
  onSave,
}: {
  open: boolean;
  project: Project;
  selectedNote: HubNote | null;
  notes: HubNote[];
  onClose: () => void;
  onSave: (form: ProjectPaletteFormState) => void;
}) {
  const [form, setForm] = useState<ProjectPaletteFormState>(() => emptyProjectPaletteForm(selectedNote));

  useEffect(() => {
    if (open) setForm(emptyProjectPaletteForm(selectedNote));
  }, [open, selectedNote]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Modal title="New project palette" description={`Save reusable colors for ${project.name}.`} open={open} onClose={onClose} className="max-w-4xl">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <FieldShell label="Palette Name">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="align-project-input" placeholder={`${project.name} palette`} />
          </FieldShell>
          <FieldShell label="Tags">
            <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="align-project-input" placeholder="brand, web, client" />
          </FieldShell>
        </div>
        <RelatedNoteSelector notes={notes} selectedIds={form.noteIds} onChange={(noteIds) => setForm({ ...form, noteIds })} title="Linked Docs" />
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">Colors</p>
          {form.colors.map((color) => (
            <div key={color.id} className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 md:grid-cols-[44px_minmax(0,1fr)_140px_minmax(0,1fr)_auto] md:items-center">
              <label className="align-color-picker-swatch" style={{ backgroundColor: normalizeHexInput(color.hex) }} title="Pick color">
                <input
                  type="color"
                  value={validColorInputValue(color.hex)}
                  onChange={(event) => setForm({ ...form, colors: updatePaletteFormColor(form.colors, color.id, { hex: event.target.value.toUpperCase() }) })}
                  aria-label={`Pick ${color.name || "color"}`}
                />
              </label>
              <input value={color.name} onChange={(event) => setForm({ ...form, colors: updatePaletteFormColor(form.colors, color.id, { name: event.target.value }) })} className="align-project-input" placeholder="Primary" />
              <input value={color.hex} onChange={(event) => setForm({ ...form, colors: updatePaletteFormColor(form.colors, color.id, { hex: event.target.value }) })} className="align-project-input font-mono" placeholder="#1C1C1C" />
              <input value={color.role} onChange={(event) => setForm({ ...form, colors: updatePaletteFormColor(form.colors, color.id, { role: event.target.value }) })} className="align-project-input" placeholder="Base, accent, text" />
              <Button type="button" variant="ghost" icon={<X size={14} />} onClick={() => setForm({ ...form, colors: form.colors.filter((item) => item.id !== color.id) })} aria-label="Remove color" />
            </div>
          ))}
          <Button type="button" variant="secondary" icon={<Plus size={15} />} onClick={() => setForm({ ...form, colors: [...form.colors, { id: crypto.randomUUID(), name: "Color", hex: "#A1A1A1", role: "" }] })}>
            Add Color
          </Button>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" icon={<X size={15} />} onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={<Save size={15} />} disabled={!form.name.trim() || !form.colors.length}>Save Palette</Button>
        </div>
      </form>
    </Modal>
  );
}

function RelatedNoteSelector({ notes, selectedIds, onChange, currentNoteId, title = "Related Docs" }: { notes: HubNote[]; selectedIds: string[]; onChange: (ids: string[]) => void; currentNoteId?: string; title?: string }) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const candidates = notes
    .filter((note) => note.id !== currentNoteId)
    .filter((note) => !query.trim() || `${note.title} ${note.tags ?? ""} ${note.docType ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);

  const toggle = (noteId: string) => {
    const next = new Set(selectedIds);
    if (next.has(noteId)) next.delete(noteId);
    else next.add(noteId);
    onChange([...next]);
  };

  return (
    <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{title}</p>
        <Badge tone="slate">{selectedIds.length} selected</Badge>
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="align-project-input mt-3" placeholder="Search docs..." />
      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {candidates.length ? candidates.map((note) => (
          <label key={note.id} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
            <input type="checkbox" checked={selected.has(note.id)} onChange={() => toggle(note.id)} />
            <span className="min-w-0 truncate">{note.title}</span>
          </label>
        )) : <p className="text-sm font-semibold text-[var(--text-muted)]">No matching notes.</p>}
      </div>
    </section>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</span>
      {children}
    </label>
  );
}

function noteToProjectDocForm(note: HubNote | null | undefined, projectName: string): ProjectDocFormState {
  if (note) {
    return {
      title: note.title,
      body: note.body,
      tags: note.tags ?? "",
      docType: note.docType ?? "general",
      docStatus: note.docStatus ?? "active",
      milestoneId: note.milestoneId ?? "",
      clientVisible: Boolean(note.clientVisible),
      favorite: Boolean(note.favorite),
      relatedNoteIds: note.relatedNoteIds ?? [],
    };
  }

  return {
    title: `${projectName} Brief`,
    body: getProjectDocTemplate("brief"),
    tags: "",
    docType: "brief",
    docStatus: "draft",
    milestoneId: "",
    clientVisible: false,
    favorite: false,
    relatedNoteIds: [],
  };
}

function emptyProjectPaletteForm(selectedNote: HubNote | null): ProjectPaletteFormState {
  return {
    name: selectedNote ? `${selectedNote.title} Palette` : "Project Palette",
    tags: "",
    noteIds: selectedNote ? [selectedNote.id] : [],
    colors: [
      { id: "color-1", name: "Primary", hex: "#1C1C1C", role: "Base" },
      { id: "color-2", name: "Text", hex: "#E5E5E5", role: "Foreground" },
      { id: "color-3", name: "Subtle", hex: "#A1A1A1", role: "Muted" },
    ],
  };
}

function updatePaletteFormColor(colors: ProjectPaletteFormState["colors"], colorId: string, updates: Partial<ProjectPaletteFormState["colors"][number]>) {
  return colors.map((color) => (color.id === colorId ? { ...color, ...updates } : color));
}

function getProjectDocStats(notes: HubNote[], palettes: HubPalette[]) {
  return {
    total: notes.length,
    active: notes.filter((note) => (note.docStatus ?? "active") === "active").length,
    review: notes.filter((note) => (note.docStatus ?? "active") === "review").length,
    clientVisible: notes.filter((note) => note.clientVisible).length,
    palettes: palettes.length,
  };
}

function getProjectDocTemplate(type: HubNoteDocType) {
  if (type === "brief") return "# Project Brief\n\n## Goal\n\n## Audience\n\n## Scope\n\n## Success Criteria\n\n## Open Questions\n";
  if (type === "strategy") return "# Strategy\n\n## Objective\n\n## Priorities\n\n## Risks\n\n## Next Moves\n";
  if (type === "research") return "# Research\n\n## Sources\n\n## Findings\n\n## Decisions\n";
  if (type === "palette") return "# Color Palette\n\n```align-palette\nProject Palette\nPrimary | #1C1C1C | Base\nText | #E5E5E5 | Foreground\nSubtle | #A1A1A1 | Muted\n```\n";
  if (type === "meeting") return "# Meeting Doc\n\n## Agenda\n\n## Decisions\n\n## Actions\n\n- [ ] \n";
  if (type === "prompt") return "# Prompt\n\n## Context\n\n## Prompt\n\n## Expected Output\n";
  if (type === "checklist") return "# Checklist\n\n- [ ] First item\n- [ ] Second item\n";
  if (type === "reference") return "# Reference\n\n## Link\n\n## Summary\n\n## Details\n";
  return "# Note\n\n";
}

function getRelatedProjectNotes(note: HubNote, allNotes: HubNote[]) {
  const relatedIds = new Set(note.relatedNoteIds ?? []);
  allNotes.forEach((candidate) => {
    if (candidate.id !== note.id && candidate.relatedNoteIds?.includes(note.id)) relatedIds.add(candidate.id);
  });
  return allNotes.filter((candidate) => relatedIds.has(candidate.id) && candidate.id !== note.id);
}

function getNoteExcerpt(body: string) {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^[-*+]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);
}

function getMarkdownHeadings(body: string) {
  return body
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      return match ? { level: match[1].length, title: match[2].trim(), line: index + 1 } : null;
    })
    .filter((heading): heading is { level: number; title: string; line: number } => Boolean(heading));
}

function toggleChecklistLineInMarkdown(body: string, lineIndex: number) {
  const lines = body.split("\n");
  const line = lines[lineIndex];
  if (typeof line !== "string") return body;
  if (!/^\s*- \[[ xX]\]\s+/.test(line)) return body;
  lines[lineIndex] = line.replace(/- \[([ xX])\]/, (_, state: string) => (state.toLowerCase() === "x" ? "- [ ]" : "- [x]"));
  return lines.join("\n");
}

function getReadTimeLabel(body: string) {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function docTypeLabel(value?: HubNoteDocType) {
  return projectDocTypeOptions.find((option) => option.value === (value ?? "general"))?.label ?? "General";
}

function docStatusLabel(value?: HubNoteDocStatus) {
  return projectDocStatusOptions.find((option) => option.value === (value ?? "active"))?.label ?? "Active";
}

function normalizeIdList(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function normalizeHexInput(value: string) {
  const raw = value.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return withHash.toUpperCase();
}

function validColorInputValue(value: string) {
  const normalized = normalizeHexInput(value);
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : "#A1A1A1";
}

function plainProjectDate(value?: string) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function OverviewStat({ icon, label, value, helper, tone = "neutral" }: { icon: ReactNode; label: string; value: string | number; helper: string; tone?: "neutral" | "danger" | "ok" }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "ok" ? "var(--success)" : "var(--project-accent)";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text)]">{value}</p>
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
    <button type="button" onClick={onOpen} className="block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
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

function getSavedProjectTaskView(): ProjectTaskView {
  if (typeof window === "undefined") return "overview";
  const saved = window.localStorage.getItem(PROJECT_TASK_VIEW_KEY);
  return saved === "cards" || saved === "table" || saved === "board" || saved === "kanban" || saved === "overview" || saved === "docs" ? saved : "overview";
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
      movesBody: "Keep the next action, blockers, and delivery path visible.",
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
