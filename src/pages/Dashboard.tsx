import {
  ArrowUpRight,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Flame,
  FolderKanban,
  NotebookText,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addDays, endOfWeek, format, formatISO, startOfWeek } from "date-fns";
import { ActiveProjects } from "../components/dashboard/ActiveProjects";
import { StatsCards } from "../components/dashboard/StatsCards";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { useProjectStore } from "../store/projectStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import type { Project } from "../types/project";
import type { HubNote } from "../types/studio";
import type { Task } from "../types/task";
import { dateLabel, isOverdue } from "../utils/date";
import { priorityTone } from "../utils/taskVisuals";

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
  stale: boolean;
  attentionScore: number;
  nextDue?: string;
};

export function Dashboard() {
  const { projects } = useProjectStore();
  const { tasks } = useTaskStore();
  const notes = useStudioStore((state) => state.notes);

  const today = todayISO();
  const soon = formatISO(addDays(new Date(), 7), { representation: "date" });
  const weekRange = getCurrentWeekRange();
  const activeTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks]);
  const projectTasks = activeTasks.filter((task) => Boolean(task.projectId));
  const completedProjectTasks = projectTasks.filter((task) => isTerminalTaskStatus(task.status));
  const activeProjects = projects.filter((project) => project.status === "active" && !project.deletedAt);
  const projectMetrics = activeProjects.map((project) => buildProjectMetric(project, projectTasks, today, soon)).sort(sortProjectMetrics);
  const atRiskProjects = projectMetrics.filter((metric) => metric.atRisk);
  const dueSoonProjects = projectMetrics.filter((metric) => metric.dueSoon);
  const averageProjectProgress = projectMetrics.length ? Math.round(projectMetrics.reduce((sum, metric) => sum + metric.progress, 0) / projectMetrics.length) : 0;
  const watchProject = projectMetrics[0];
  const upcomingProjectDeadlines = activeProjects
    .filter((item) => Boolean(item.dueDate))
    .filter((item) => item.dueDate! >= today)
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"))
    .slice(0, 6);
  const activity = buildActivity(activeTasks, projects).slice(0, 5);
  const completedProjectTasksThisWeek = completedProjectTasks.filter((task) => task.updatedAt >= weekRange.start).length;
  const docStats = buildDocStats(notes, activeProjects);

  return (
    <div className="space-y-5">
      <CommandHeader
        activeProjects={activeProjects.length}
        atRiskProjects={atRiskProjects.length}
        nextDeadline={projectMetrics.find((metric) => metric.nextDue)?.nextDue}
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
            <WatchProjectCard metric={watchProject} />
            <ProjectMomentumCard
              averageProgress={averageProjectProgress}
              completedThisWeek={completedProjectTasksThisWeek}
              activeProjectCount={activeProjects.length}
              atRiskCount={atRiskProjects.length}
              staleCount={projectMetrics.filter((metric) => metric.stale).length}
            />
          </div>

          <ProjectPipeline metrics={projectMetrics.slice(0, 5)} />
          <ActiveProjects projects={projects} tasks={activeTasks} />
        </div>

        <div className="space-y-5">
          <ProjectsNeedingAttention metrics={projectMetrics.filter((metric) => metric.atRisk || metric.stale || metric.highPriorityOpen.length).slice(0, 5)} />
          <ProjectDeadlinesPanel projects={upcomingProjectDeadlines} />
          <DocumentationLoadPanel stats={docStats} />
          <RecentActivityPanel activity={activity} notesCount={notes.length} />
        </div>
      </div>
    </div>
  );
}

function CommandHeader({
  activeProjects,
  atRiskProjects,
  nextDeadline,
}: {
  activeProjects: number;
  atRiskProjects: number;
  nextDeadline?: string;
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
          <Link
            to="/today"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-bold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
          >
            Open Today
            <ArrowUpRight size={15} />
          </Link>
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

function WatchProjectCard({ metric }: { metric?: ProjectMetric }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<Target size={18} />} title="Watch Project" helper="The project most worth inspecting from a portfolio view" />
      </div>
      {metric ? (
        <div className="p-5">
          <div className="rounded-[var(--radius-lg)] border border-[var(--icon-tile-border)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand-primary)]">{projectReason(metric)}</p>
                <h2 className="mt-2 text-2xl font-black leading-8 text-[var(--text)]">{metric.project.name}</h2>
                <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
                  {metric.openTasks.length} open tasks · {metric.highPriorityOpen.length} high priority
                  {metric.nextDue ? ` · next ${dateLabel(metric.nextDue)}` : ""}
                </p>
              </div>
              <ProgressDotStrip value={metric.progress} label="Delivery progress" compact />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--progress-track)]">
              <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${metric.progress}%` }} />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <PortfolioSignal label="Status" value={metric.project.status} />
              <PortfolioSignal label="Overdue" value={metric.overdueOpen.length} />
              <PortfolioSignal label="Stale" value={metric.stale ? "Yes" : "No" } />
            </div>
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
        <EmptyPanel icon={<Sparkles size={18} />} title="No project to watch" body="Active projects will appear here when there is delivery pressure, stale work, or upcoming deadlines." />
      )}
    </Card>
  );
}

function ProjectMomentumCard({
  averageProgress,
  completedThisWeek,
  activeProjectCount,
  atRiskCount,
  staleCount,
}: {
  averageProgress: number;
  completedThisWeek: number;
  activeProjectCount: number;
  atRiskCount: number;
  staleCount: number;
}) {
  return (
    <Card className="p-5">
      <SectionTitle icon={<Flame size={18} />} title="Delivery Momentum" helper="How active project work is moving" />
      <div className="mt-5 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <ProgressDotStrip value={averageProgress} label="Average delivery progress" />
        <div className="grid gap-3">
          <MomentumRow label="Project tasks completed this week" value={completedThisWeek} tone="var(--success)" />
          <MomentumRow label="Active projects" value={activeProjectCount} tone="var(--brand-primary)" />
          <MomentumRow label="Projects needing attention" value={atRiskCount} tone="var(--danger)" />
          <MomentumRow label="Projects with stale movement" value={staleCount} tone="var(--warning)" />
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
        <SectionTitle icon={<FolderKanban size={18} />} title="Project Pipeline" helper="Active projects, attention points, and next deadlines" />
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
                <Badge tone={metric.atRisk ? "red" : metric.dueSoon ? "amber" : "emerald"}>{metric.atRisk ? "Needs attention" : metric.dueSoon ? "Due soon" : "On track"}</Badge>
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
          <EmptyPanel icon={<FolderKanban size={18} />} title="No active projects" body="Active projects will appear here with progress and delivery signals." />
        )}
      </div>
    </Card>
  );
}

function ProjectsNeedingAttention({ metrics }: { metrics: ProjectMetric[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<AlertTriangle size={18} />} title="Projects Needing Attention" helper="Risk, stale movement, and high-priority pressure" />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {metrics.length ? metrics.map((metric) => (
          <Link key={metric.project.id} to={`/projects/${metric.project.id}`} className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--text)]">{metric.project.name}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{attentionReason(metric)}</p>
              </div>
              <Badge tone={metric.atRisk ? "red" : metric.stale ? "amber" : "slate"}>{metric.atRisk ? "Risk" : metric.stale ? "Stale" : "Priority"}</Badge>
            </div>
          </Link>
        )) : (
          <EmptyPanel icon={<CheckCircle2 size={18} />} title="No attention points" body="Active projects do not show overdue, stale, or high-priority pressure right now." compact />
        )}
      </div>
    </Card>
  );
}

function ProjectDeadlinesPanel({ projects }: { projects: Project[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<CalendarClock size={18} />} title="Upcoming Project Deadlines" helper="Project-level deadlines only" />
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {projects.length ? projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--panel-bg-soft)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--text)]">{project.name}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{project.description || "Project deadline"}</p>
              </div>
              <Badge tone={priorityTone(project.priority)}>{getTaskPriorityOption(project.priority).label}</Badge>
            </div>
            <p className="mt-3 text-xs font-black text-[var(--text)]">
              <CalendarClock size={13} className="mr-1 inline-block align-[-2px] text-[var(--text-soft)]" />
              {dateLabel(project.dueDate)}
            </p>
          </Link>
        )) : (
          <EmptyPanel icon={<Clock3 size={18} />} title="No project deadlines" body="Add project due dates when portfolio timing matters." compact />
        )}
      </div>
    </Card>
  );
}

function DocumentationLoadPanel({ stats }: { stats: ReturnType<typeof buildDocStats> }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<FileText size={18} />} title="Documentation Load" helper="Planning, review, and client-safe context" />
      </div>
      <div className="grid gap-2 p-4 sm:p-5">
        <MomentumRow label="Project docs" value={stats.projectDocs} tone="var(--brand-primary)" />
        <MomentumRow label="Needs review" value={stats.needsReview} tone="var(--warning)" />
        <MomentumRow label="Client-visible" value={stats.clientVisible} tone="var(--success)" />
        <MomentumRow label="Unfiled docs" value={stats.unfiled} tone="var(--danger)" />
      </div>
      <div className="border-t border-[var(--border)] px-5 py-3">
        <Link to="/notes" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]">
          Inspect docs
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </Card>
  );
}

function RecentActivityPanel({ activity, notesCount }: { activity: ActivityItem[]; notesCount: number }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <SectionTitle icon={<Zap size={18} />} title="Latest Project Updates" helper={`${notesCount} docs in your workspace`} />
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

function PortfolioSignal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--panel-bg)] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 truncate text-sm font-black capitalize text-[var(--text)]">{value}</p>
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

function ProgressDotStrip({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  const filled = Math.round(value / 10);
  return (
    <div className={`grid min-w-[150px] gap-2 ${compact ? "max-w-[170px]" : "max-w-[260px]"}`}>
      <div className="flex items-end justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</span>
        <strong className={`${compact ? "text-lg" : "text-2xl"} font-black text-[var(--text)]`}>{value}%</strong>
      </div>
      <div className="grid grid-cols-10 gap-1" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={`h-2.5 rounded-full transition-colors ${index < filled ? "bg-[var(--brand-primary)]" : "bg-[var(--ring-track)]"}`}
          />
        ))}
      </div>
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
  const activityDates = [project.updatedAt, ...projectTasks.map((task) => task.updatedAt)].sort();
  const latestActivity = activityDates[activityDates.length - 1] ?? project.updatedAt;
  const stale = Boolean(openTasks.length && daysSince(latestActivity, today) >= 14);
  const attentionScore = overdueOpen.length * 50
    + (projectDueSoon ? 35 : 0)
    + highPriorityOpen.length * 20
    + (stale ? 18 : 0)
    + (dueSoon ? 10 : 0)
    + (openTasks.length ? Math.max(0, 25 - progress) : 0);

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
    stale,
    attentionScore,
    nextDue,
  };
}

function sortProjectMetrics(a: ProjectMetric, b: ProjectMetric) {
  return b.attentionScore - a.attentionScore
    || Number(b.atRisk) - Number(a.atRisk)
    || b.highPriorityOpen.length - a.highPriorityOpen.length
    || (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31")
    || b.openTasks.length - a.openTasks.length;
}

function projectReason(metric: ProjectMetric) {
  if (metric.overdueOpen.length) return "Overdue project work";
  if (metric.dueSoon) return "Deadline pressure";
  if (metric.highPriorityOpen.length) return "High-priority work open";
  if (metric.stale) return "No recent movement";
  if (metric.nextDue) return "Nearest project deadline";
  return "Portfolio watch project";
}

function attentionReason(metric: ProjectMetric) {
  const reasons = [
    metric.overdueOpen.length ? `${metric.overdueOpen.length} overdue` : "",
    metric.highPriorityOpen.length ? `${metric.highPriorityOpen.length} high-priority` : "",
    metric.stale ? "stale movement" : "",
    metric.nextDue ? `next ${dateLabel(metric.nextDue)}` : "",
  ].filter(Boolean);
  return reasons.length ? reasons.join(" · ") : "Worth inspecting";
}

function buildDocStats(notes: HubNote[], activeProjects: Project[]) {
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const projectDocs = notes.filter((note) => note.projectIds?.some((projectId) => activeProjectIds.has(projectId)));
  const unfiled = notes.filter((note) => !(note.projectIds?.length) && (note.docStatus ?? "active") !== "archived").length;

  return {
    projectDocs: projectDocs.length,
    needsReview: projectDocs.filter((note) => note.docStatus === "review").length,
    clientVisible: projectDocs.filter((note) => note.clientVisible).length,
    unfiled,
  };
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
  if (atRiskProjects) return `${atRiskProjects} project${atRiskProjects === 1 ? "" : "s"} need attention. Inspect delivery risk, stale movement, and deadline pressure across the portfolio.`;
  if (nextDeadline) return `${activeProjects} active project${activeProjects === 1 ? "" : "s"} in motion. Next project deadline is ${dateLabel(nextDeadline)}.`;
  if (activeProjects) return `${activeProjects} active project${activeProjects === 1 ? "" : "s"} in motion. Use this view to inspect health before choosing where to work.`;
  return "No active projects yet. Create a project and Align will turn it into a clear operating view.";
}

function projectMomentumMessage(progress: number, atRiskCount: number) {
  if (atRiskCount) return "Attention points are visible. Inspect the riskiest project before planning new work.";
  if (progress >= 75) return "Portfolio delivery is healthy. Keep deadlines and client-facing docs current.";
  return "Portfolio progress is still building. Watch stale projects and deadline pressure.";
}

function relativeDate(value: string) {
  const date = value.slice(0, 10);
  if (date === todayISO()) return "today";
  return dateLabel(date);
}

function todayISO() {
  return formatISO(new Date(), { representation: "date" });
}

function daysSince(value: string, today: string) {
  const start = new Date(`${value.slice(0, 10)}T00:00:00`);
  const end = new Date(`${today}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function getCurrentWeekRange() {
  const today = new Date();
  return {
    start: formatISO(startOfWeek(today, { weekStartsOn: 1 }), { representation: "date" }),
    end: formatISO(endOfWeek(today, { weekStartsOn: 1 }), { representation: "date" }),
  };
}
