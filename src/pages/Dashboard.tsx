import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  FolderKanban,
  ListChecks,
  NotebookText,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, endOfWeek, format, formatISO, startOfWeek } from "date-fns";
import { ActiveProjects } from "../components/dashboard/ActiveProjects";
import { StatsCards } from "../components/dashboard/StatsCards";
import { TaskForm } from "../components/tasks/TaskForm";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { useCalendarStore } from "../store/calendarStore";
import { useProjectStore } from "../store/projectStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import type { CalendarEvent } from "../types/calendar";
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import { dateLabel, isOverdue, isToday } from "../utils/date";
import { priorityTone } from "../utils/taskVisuals";

type FocusPanel = "today" | "upcoming";
type DeadlineItem = Task | Project;
type ActivityItem = { id: string; title: string; meta: string; tone: "emerald" | "blue" | "amber" | "rose"; at: string };
type ProjectMetric = {
  project: Project;
  tasks: Task[];
  openTasks: Task[];
  completedTasks: Task[];
  highPriorityOpen: Task[];
  overdueOpen: Task[];
  progress: number;
  atRisk: boolean;
  dueSoon: boolean;
  nextDue?: string;
};

export function Dashboard() {
  const { projects } = useProjectStore();
  const { tasks, addTask, completeTask } = useTaskStore();
  const { events } = useCalendarStore();
  const notes = useStudioStore((state) => state.notes);
  const [addingTask, setAddingTask] = useState(false);
  const [focusPanel, setFocusPanel] = useState<FocusPanel>("today");

  const today = todayISO();
  const soon = formatISO(addDays(new Date(), 7), { representation: "date" });
  const weekRange = getCurrentWeekRange();
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks]);
  const openTasks = activeTasks.filter((task) => !isTerminalTaskStatus(task.status));
  const projectTasks = activeTasks.filter((task) => Boolean(task.projectId));
  const completedProjectTasks = projectTasks.filter((task) => isTerminalTaskStatus(task.status));
  const personalOpenTasks = openTasks.filter((task) => !task.projectId);
  const activeProjects = projects.filter((project) => project.status === "active" && !project.deletedAt);
  const projectMetrics = activeProjects.map((project) => buildProjectMetric(project, projectTasks, today, soon)).sort(sortProjectMetrics);
  const atRiskProjects = projectMetrics.filter((metric) => metric.atRisk);
  const dueSoonProjects = projectMetrics.filter((metric) => metric.dueSoon);
  const averageProjectProgress = projectMetrics.length ? Math.round(projectMetrics.reduce((sum, metric) => sum + metric.progress, 0) / projectMetrics.length) : 0;
  const priorityProject = projectMetrics[0];

  const todayTasks = openTasks.filter((task) => isToday(task.dueDate));
  const thisWeekTasks = openTasks
    .filter((task) => task.dueDate && task.dueDate >= weekRange.start && task.dueDate <= weekRange.end)
    .sort(sortTasksByFocus)
    .slice(0, 7);
  const todayEvents = events
    .filter((event) => isToday(event.startDate))
    .filter((event) => !todayTasks.some((task) => event.linkedTaskId === task.id || event.title.trim().toLowerCase() === task.title.trim().toLowerCase()))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);
  const upcomingDeadlines = [...openTasks, ...activeProjects]
    .filter((item) => Boolean(item.dueDate))
    .filter((item) => item.dueDate! >= today)
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"))
    .slice(0, 6);
  const activity = buildActivity(activeTasks, projects).slice(0, 5);
  const completedProjectTasksThisWeek = completedProjectTasks.filter((task) => task.updatedAt >= weekRange.start).length;

  return (
    <div className="space-y-5">
      <CommandHeader
        activeProjects={activeProjects.length}
        atRiskProjects={atRiskProjects.length}
        nextDeadline={projectMetrics.find((metric) => metric.nextDue)?.nextDue}
        onAddTask={() => setAddingTask(true)}
      />

      <StatsCards
        activeProjects={activeProjects.length}
        atRiskProjects={atRiskProjects.length}
        dueSoonProjects={dueSoonProjects.length}
        progress={averageProjectProgress}
        completedTasks={completedProjectTasks.length}
        openTasks={projectTasks.length - completedProjectTasks.length}
      />

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <PriorityProjectCard metric={priorityProject} onComplete={completeTask} />
            <ProjectMomentumCard
              averageProgress={averageProjectProgress}
              completedThisWeek={completedProjectTasksThisWeek}
              activeProjectCount={activeProjects.length}
              atRiskCount={atRiskProjects.length}
              personalOpenCount={personalOpenTasks.length}
            />
          </div>

          <ProjectPipeline metrics={projectMetrics.slice(0, 5)} />
          <ThisWeekPanel tasks={thisWeekTasks} projectById={projectById} weekRange={weekRange} onComplete={completeTask} />
          <ActiveProjects projects={projects} tasks={activeTasks} />
        </div>

        <div className="space-y-5">
          <AgendaPanel
            focusPanel={focusPanel}
            setFocusPanel={setFocusPanel}
            todayTasks={todayTasks}
            todayEvents={todayEvents}
            upcomingDeadlines={upcomingDeadlines}
            projectById={projectById}
            onComplete={completeTask}
          />
          <RecentActivityPanel activity={activity} notesCount={notes.length} />
        </div>
      </div>

      <Modal title="Add task" description="Capture a quick task or todo from the command center." open={addingTask} onClose={() => setAddingTask(false)}>
        <TaskForm
          projects={projects}
          onSubmit={(input) => {
            addTask(input);
            setAddingTask(false);
          }}
          compact
        />
      </Modal>
    </div>
  );
}

function CommandHeader({
  activeProjects,
  atRiskProjects,
  nextDeadline,
  onAddTask,
}: {
  activeProjects: number;
  atRiskProjects: number;
  nextDeadline?: string;
  onAddTask: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">{format(new Date(), "EEEE, MMM d")}</p>
          <h1 className="mt-1 text-3xl font-black tracking-normal text-[var(--text)]">Project Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{projectDashboardMessage(activeProjects, atRiskProjects, nextDeadline)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Plus size={17} />} onClick={onAddTask}>
            Add Task
          </Button>
          <Link
            to="/projects"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-bold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
          >
            New Project
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function PriorityProjectCard({ metric, onComplete }: { metric?: ProjectMetric; onComplete: (id: string) => void }) {
  const nextTask = metric?.openTasks.sort(sortTasksByFocus)[0];

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<Target size={18} />} title="Priority Project" helper="The project that deserves the next clean move" />
      </div>
      {metric ? (
        <div className="p-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--icon-tile-border)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">{projectReason(metric)}</p>
                <h2 className="mt-2 text-2xl font-black leading-8 text-[var(--text)]">{metric.project.name}</h2>
                <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
                  {metric.openTasks.length} open · {metric.highPriorityOpen.length} high priority
                  {metric.nextDue ? ` · next ${dateLabel(metric.nextDue)}` : ""}
                </p>
              </div>
              <ProgressDial value={metric.progress} label="Done" size="sm" />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
              <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${metric.progress}%` }} />
            </div>
            {nextTask ? (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg)] p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">Next task</p>
                <div className="mt-2 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onComplete(nextTask.id)}
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-transparent transition hover:border-[var(--brand-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--brand-primary)]"
                    aria-label={`Complete ${nextTask.title}`}
                  >
                    <Check size={15} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text)]">{nextTask.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{nextTask.dueDate ? dateLabel(nextTask.dueDate, nextTask.dueTime) : getTaskStatusOption(nextTask.status).label}</p>
                  </div>
                </div>
              </div>
            ) : null}
            <Link
              to={`/projects/${metric.project.id}`}
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-bold text-[var(--button-secondary-text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
            >
              Open Project
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <EmptyPanel icon={<Sparkles size={18} />} title="No priority project" body="Create or activate a project and this space will become your project launchpad." />
      )}
    </Card>
  );
}

function ProjectMomentumCard({
  averageProgress,
  completedThisWeek,
  activeProjectCount,
  atRiskCount,
  personalOpenCount,
}: {
  averageProgress: number;
  completedThisWeek: number;
  activeProjectCount: number;
  atRiskCount: number;
  personalOpenCount: number;
}) {
  return (
    <Card className="p-5">
      <SectionTitle icon={<Flame size={18} />} title="Project Momentum" helper="Progress across active project work" />
      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <ProgressDial value={averageProgress} label="Avg progress" />
        <div className="grid gap-3">
          <MomentumRow label="Project tasks done this week" value={completedThisWeek} tone="var(--success)" />
          <MomentumRow label="Active projects" value={activeProjectCount} tone="var(--brand-primary)" />
          <MomentumRow label="At-risk projects" value={atRiskCount} tone="var(--danger)" />
          <MomentumRow label="Personal open tasks" value={personalOpenCount} tone="var(--warning)" />
        </div>
      </div>
      <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3">
        <p className="text-sm font-bold text-[var(--text)]">{projectMomentumMessage(averageProgress, atRiskCount)}</p>
      </div>
    </Card>
  );
}

function ProjectPipeline({ metrics }: { metrics: ProjectMetric[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={<FolderKanban size={18} />} title="Project Pipeline" helper="Active projects, risk, and next deadlines" />
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]">
          View projects
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="grid gap-3 p-4 sm:p-5 xl:grid-cols-2">
        {metrics.length ? (
          metrics.map((metric) => (
            <Link
              key={metric.project.id}
              to={`/projects/${metric.project.id}`}
              className="group rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-4 transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-[var(--text)]">{metric.project.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                    {metric.openTasks.length} open · {metric.highPriorityOpen.length} high priority
                  </p>
                </div>
                <Badge tone={metric.atRisk ? "red" : metric.dueSoon ? "amber" : "emerald"}>{metric.atRisk ? "At risk" : metric.dueSoon ? "Due soon" : "On track"}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
                    <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${metric.progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-[var(--text-soft)]">{metric.nextDue ? `Next deadline ${dateLabel(metric.nextDue)}` : "No dated project work"}</p>
                </div>
                <strong className="text-sm font-black text-[var(--text)]">{metric.progress}%</strong>
              </div>
            </Link>
          ))
        ) : (
          <EmptyPanel icon={<FolderKanban size={18} />} title="No active projects" body="Projects you activate will appear here with progress and risk signals." />
        )}
      </div>
    </Card>
  );
}

function ThisWeekPanel({
  tasks,
  projectById,
  weekRange,
  onComplete,
}: {
  tasks: Task[];
  projectById: Map<string, Project>;
  weekRange: { start: string; end: string };
  onComplete: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={<ListChecks size={18} />} title="This Week's Execution" helper={`${dateLabel(weekRange.start)} to ${dateLabel(weekRange.end)}`} />
        <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]">
          View all
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {tasks.length ? (
          tasks.map((task) => <WorkRow key={task.id} task={task} project={projectById.get(task.projectId ?? "")} onComplete={onComplete} />)
        ) : (
          <EmptyPanel icon={<CheckCircle2 size={18} />} title="No dated work this week" body="Your week is clear unless you add a due date." />
        )}
      </div>
    </Card>
  );
}

function AgendaPanel({
  focusPanel,
  setFocusPanel,
  todayTasks,
  todayEvents,
  upcomingDeadlines,
  projectById,
  onComplete,
}: {
  focusPanel: FocusPanel;
  setFocusPanel: (panel: FocusPanel) => void;
  todayTasks: Task[];
  todayEvents: CalendarEvent[];
  upcomingDeadlines: DeadlineItem[];
  projectById: Map<string, Project>;
  onComplete: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-2 gap-1 border-b border-[var(--border)] bg-[var(--panel-inset)] p-1">
        {(["today", "upcoming"] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            onClick={() => setFocusPanel(panel)}
            className={`min-h-11 rounded-[var(--radius-sm)] px-3 text-sm font-black transition ${
              focusPanel === panel ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
          >
            {panel === "today" ? "Today" : "Upcoming"}
          </button>
        ))}
      </div>
      <div className="p-4 sm:p-5">
        {focusPanel === "today" ? (
          <GroupedTaskPanel tasks={todayTasks} events={todayEvents} projectById={projectById} onComplete={onComplete} />
        ) : (
          <UpcomingPanel items={upcomingDeadlines} projectById={projectById} />
        )}
      </div>
    </Card>
  );
}

function RecentActivityPanel({ activity, notesCount }: { activity: ActivityItem[]; notesCount: number }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<Zap size={18} />} title="Recent Activity" helper={`${notesCount} notes in your workspace`} />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {activity.length ? (
          activity.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activityToneClass(item.tone)}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--text)]">{item.title}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{item.meta}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel icon={<NotebookText size={18} />} title="No recent movement" body="Complete or update work and this panel will start telling the story." compact />
        )}
      </div>
    </Card>
  );
}

function GroupedTaskPanel({
  tasks,
  events,
  projectById,
  onComplete,
}: {
  tasks: Task[];
  events: CalendarEvent[];
  projectById: Map<string, Project>;
  onComplete: (id: string) => void;
}) {
  if (!tasks.length && !events.length) {
    return <EmptyPanel icon={<CalendarClock size={18} />} title="Nothing planned today" body="A quiet day is allowed. Capture a task when something appears." compact />;
  }

  const groups = groupTasksByProject(tasks, projectById);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">{group.label}</p>
          {group.tasks.map((task) => (
            <MiniTask key={task.id} task={task} meta={task.dueTime || getTaskStatusOption(task.status).label} onComplete={onComplete} />
          ))}
        </div>
      ))}
      {events.map((event) => (
        <div key={event.id} className="rounded-[var(--radius-md)] border border-[var(--border)] border-l-[3px] border-l-[var(--brand-primary)] bg-[var(--panel-bg-soft)] px-3 py-3">
          <p className="text-sm font-black text-[var(--text)]">{event.title}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{event.description || (event.source === "google" ? "Google Calendar" : "Local event")}</p>
        </div>
      ))}
    </div>
  );
}

function UpcomingPanel({ items, projectById }: { items: DeadlineItem[]; projectById: Map<string, Project> }) {
  if (!items.length) {
    return <EmptyPanel icon={<Clock3 size={18} />} title="No upcoming deadlines" body="No dated work is waiting in the queue." compact />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isProject = "name" in item;
        const title = isProject ? item.name : item.title;
        const meta = isProject ? "Project deadline" : projectById.get(item.projectId ?? "")?.name ?? "Personal task";

        return (
          <Link
            key={item.id}
            to={isProject ? `/projects/${item.id}` : "/tasks"}
            className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--text)]">{title}</p>
                <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">{meta}</p>
              </div>
              <Badge tone={priorityTone(item.priority)}>{getTaskPriorityOption(item.priority).label}</Badge>
            </div>
            <p className="mt-3 text-xs font-black text-[var(--text)]">
              <CalendarClock size={13} className="mr-1 inline-block align-[-2px] text-[var(--text-soft)]" />
              {dateLabel(item.dueDate)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function WorkRow({ task, project, onComplete }: { task: Task; project?: Project; onComplete: (id: string) => void }) {
  return (
    <div className="grid gap-3 px-5 py-4 transition hover:bg-[var(--surface-hover)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-transparent transition hover:border-[var(--brand-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--brand-primary)]"
          aria-label={`Complete ${task.title}`}
        >
          <Check size={15} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--text)]">{task.title}</p>
          <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">{project?.name ?? "Personal task"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Badge>{getTaskStatusOption(task.status).label}</Badge>
        <Badge tone={priorityTone(task.priority)}>{getTaskPriorityOption(task.priority).label}</Badge>
        <Badge tone={isOverdue(task.dueDate) ? "red" : "slate"}>{dateLabel(task.dueDate, task.dueTime)}</Badge>
      </div>
    </div>
  );
}

function MiniTask({ task, meta, onComplete }: { task: Task; meta: string; onComplete: (id: string) => void }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3">
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] text-transparent transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        aria-label={`Complete ${task.title}`}
      >
        <Check size={15} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="truncate text-sm font-black text-[var(--text)]">{task.title}</p>
          <Badge tone={priorityTone(task.priority)}>{getTaskPriorityOption(task.priority).label}</Badge>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-[var(--text-muted)]">{meta}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, helper }: { icon: React.ReactNode; title: string; helper: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-[var(--text)]">{title}</h2>
        <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">{helper}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ icon, title, body, compact = false }: { icon: React.ReactNode; title: string; body: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] px-4 text-center ${compact ? "py-7" : "m-5 py-10"}`}>
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
        {icon}
      </span>
      <p className="text-sm font-black text-[var(--text)]">{title}</p>
      <p className="max-w-sm text-xs font-semibold leading-5 text-[var(--text-muted)]">{body}</p>
    </div>
  );
}

function ProgressDial({ value, label, size = "md" }: { value: number; label: string; size?: "sm" | "md" }) {
  const background = `conic-gradient(var(--brand-primary) ${value * 3.6}deg, var(--ring-track) 0deg)`;
  const outer = size === "sm" ? "h-16 w-16" : "h-28 w-28";
  const inner = size === "sm" ? "h-12 w-12" : "h-20 w-20";

  return (
    <div className="grid justify-items-center gap-2">
      <span className={`grid place-items-center rounded-full ${outer}`} style={{ background }}>
        <span className={`grid place-items-center rounded-full bg-[var(--panel-bg)] text-center ${inner}`}>
          <span>
            <strong className={`${size === "sm" ? "text-sm" : "text-2xl"} block font-black text-[var(--text)]`}>{value}%</strong>
            <span className="block text-[10px] font-bold text-[var(--text-soft)]">{label}</span>
          </span>
        </span>
      </span>
    </div>
  );
}

function MomentumRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] px-3 py-2">
      <span className="text-sm font-bold text-[var(--text-muted)]">{label}</span>
      <strong className="text-base font-black text-[var(--text)]" style={{ color: tone }}>
        {value}
      </strong>
    </div>
  );
}

function buildProjectMetric(project: Project, tasks: Task[], today: string, soon: string): ProjectMetric {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const openTasks = projectTasks.filter((task) => !isTerminalTaskStatus(task.status));
  const completedTasks = projectTasks.filter((task) => isTerminalTaskStatus(task.status));
  const highPriorityOpen = openTasks.filter((task) => task.priority === "high" || task.priority === "urgent");
  const overdueOpen = openTasks.filter((task) => isOverdue(task.dueDate));
  const nextDue = [project.dueDate, ...openTasks.map((task) => task.dueDate)].filter((date): date is string => Boolean(date)).sort()[0];
  const projectDueSoon = Boolean(project.dueDate && project.dueDate >= today && project.dueDate <= soon && openTasks.length);
  const taskDueSoon = openTasks.some((task) => task.dueDate && task.dueDate >= today && task.dueDate <= soon);
  const dueSoon = projectDueSoon || taskDueSoon;
  const progress = projectTasks.length ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  return {
    project,
    tasks: projectTasks,
    openTasks,
    completedTasks,
    highPriorityOpen,
    overdueOpen,
    progress,
    atRisk: Boolean(overdueOpen.length || projectDueSoon),
    dueSoon,
    nextDue,
  };
}

function sortProjectMetrics(a: ProjectMetric, b: ProjectMetric) {
  return Number(b.atRisk) - Number(a.atRisk)
    || b.highPriorityOpen.length - a.highPriorityOpen.length
    || (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31")
    || b.openTasks.length - a.openTasks.length;
}

function groupTasksByProject(tasks: Task[], projectById: Map<string, Project>) {
  const groups = new Map<string, { key: string; label: string; tasks: Task[] }>();
  tasks.forEach((task) => {
    const project = task.projectId ? projectById.get(task.projectId) : undefined;
    const key = project?.id ?? "personal";
    const label = project?.name ?? "Personal";
    const group = groups.get(key) ?? { key, label, tasks: [] };
    group.tasks.push(task);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({ ...group, tasks: group.tasks.sort(sortTasksByFocus) }));
}

function sortTasksByFocus(a: Task, b: Task) {
  return focusRank(a) - focusRank(b) || getTaskPriorityOption(a.priority).rank - getTaskPriorityOption(b.priority).rank || (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
}

function focusRank(task: Task) {
  const urgent = task.priority === "urgent" || task.priority === "high";
  if (isOverdue(task.dueDate) && urgent) return 0;
  if (isOverdue(task.dueDate)) return 1;
  if (isToday(task.dueDate) && urgent) return 2;
  if (isToday(task.dueDate)) return 3;
  if (task.dueDate) return 4;
  return 5;
}

function projectReason(metric: ProjectMetric) {
  if (metric.overdueOpen.length) return "Overdue project work";
  if (metric.highPriorityOpen.length) return "High priority project";
  if (metric.nextDue) return "Nearest project deadline";
  return "Most active project";
}

function buildActivity(tasks: Task[], projects: Project[]): ActivityItem[] {
  const taskItems = tasks.map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    meta: isTerminalTaskStatus(task.status) ? `Completed · ${relativeDate(task.updatedAt)}` : `${getTaskStatusOption(task.status).label} · ${relativeDate(task.updatedAt)}`,
    tone: isTerminalTaskStatus(task.status) ? "emerald" as const : isOverdue(task.dueDate) ? "rose" as const : "blue" as const,
    at: task.updatedAt,
  }));
  const projectItems = projects
    .filter((project) => !project.deletedAt)
    .map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      meta: `${project.status} project · ${relativeDate(project.updatedAt)}`,
      tone: project.status === "completed" ? "emerald" as const : project.priority === "high" || project.priority === "urgent" ? "amber" as const : "blue" as const,
      at: project.updatedAt,
    }));

  return [...taskItems, ...projectItems].sort((a, b) => b.at.localeCompare(a.at));
}

function activityToneClass(tone: ActivityItem["tone"]) {
  if (tone === "emerald") return "bg-[var(--success)]";
  if (tone === "amber") return "bg-[var(--warning)]";
  if (tone === "rose") return "bg-[var(--danger)]";
  return "bg-[var(--brand-primary)]";
}

function projectDashboardMessage(activeProjects: number, atRiskProjects: number, nextDeadline?: string) {
  if (atRiskProjects) return `${atRiskProjects} project${atRiskProjects === 1 ? "" : "s"} need attention. Start with the project risk, then the task list gets simpler.`;
  if (nextDeadline) return `${activeProjects} active project${activeProjects === 1 ? "" : "s"} in motion. Next project deadline is ${dateLabel(nextDeadline)}.`;
  if (activeProjects) return `${activeProjects} active project${activeProjects === 1 ? "" : "s"} in motion. No project deadline is pressing right now.`;
  return "No active projects yet. Create a project and Align will turn it into a clear operating view.";
}

function projectMomentumMessage(progress: number, atRiskCount: number) {
  if (atRiskCount) return "One focused project recovery will improve the whole workspace.";
  if (progress >= 75) return "Projects are moving well. Keep the next deadline visible.";
  return "Progress is building. Pick the priority project and keep the pipeline warm.";
}

function relativeDate(value: string) {
  const date = value.slice(0, 10);
  if (date === todayISO()) return "today";
  return dateLabel(date);
}

function todayISO() {
  return formatISO(new Date(), { representation: "date" });
}

function getCurrentWeekRange() {
  const today = new Date();
  return {
    start: formatISO(startOfWeek(today, { weekStartsOn: 1 }), { representation: "date" }),
    end: formatISO(endOfWeek(today, { weekStartsOn: 1 }), { representation: "date" }),
  };
}
