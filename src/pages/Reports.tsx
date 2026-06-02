import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { addDays, isAfter, isBefore, parseISO } from "date-fns";
import { AlertTriangle, Archive, BarChart3, CalendarClock, CheckCircle2, CircleAlert, Clipboard, FolderKanban, Repeat2, Target } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { OptionBadge } from "../components/ui/OptionBadge";
import { getTaskPriorityOption, getTaskRecurrenceOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../config/taskOptions";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import { dateLabel, durationLabel, isOverdue, plainDateLabel, startDateLabel } from "../utils/date";

export function Reports() {
  const [copied, setCopied] = useState(false);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const liveProjects = projects.filter((project) => !project.deletedAt);
  const currentProjects = liveProjects.filter((project) => project.status === "active" || project.status === "paused");
  const completedProjects = liveProjects.filter((project) => project.status === "completed");
  const archivedProjects = liveProjects.filter((project) => project.status === "archived");
  const currentProjectIds = new Set(currentProjects.map((project) => project.id));
  const liveProjectIds = new Set(liveProjects.map((project) => project.id));
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const currentTasks = activeTasks.filter((task) => !task.projectId || currentProjectIds.has(task.projectId) || !liveProjectIds.has(task.projectId));
  const openTasks = currentTasks.filter((task) => !isTerminalTaskStatus(task.status));
  const completedTasks = currentTasks.filter((task) => isTerminalTaskStatus(task.status));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate));
  const soon = addDays(new Date(), 14);
  const upcomingTasks = openTasks
    .filter((task) => isValidDate(task.dueDate) && !isOverdue(task.dueDate) && !isAfter(parseISO(task.dueDate!), soon))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 6);
  const completionRate = currentTasks.length ? Math.round((completedTasks.length / currentTasks.length) * 100) : 0;
  const projectRows = currentProjects
    .map((project) => projectReport(project, activeTasks))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.openHighPriority - a.openHighPriority || a.progress - b.progress);
  const pausedProjectRows = projectRows.filter((row) => row.project.status === "paused");
  const openProjectTasks = openTasks.filter((task) => task.projectId && currentProjectIds.has(task.projectId)).length;
  const personalOpenTasks = openTasks.length - openProjectTasks;
  const finishedProjectRows = [...completedProjects, ...archivedProjects]
    .sort((a, b) => (b.completedAt ?? b.archivedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.archivedAt ?? a.updatedAt))
    .slice(0, 5);
  const recurringTasks = openTasks
    .filter((task) => task.recurrence && task.recurrence !== "none")
    .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"))
    .slice(0, 6);
  const atRiskProjects = projectRows
    .filter((row) => row.overdue || row.waitingReview || row.openHighPriority > 0)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.openHighPriority - a.openHighPriority)
    .slice(0, 5);
  const reportSummary = useMemo(
    () =>
      [
        "Align workspace summary",
        `${openTasks.length} open current tasks, ${completedTasks.length} completed current tasks, ${overdueTasks.length} overdue.`,
        `${currentProjects.length} active/paused projects. ${completedProjects.length} completed and ${archivedProjects.length} archived projects are excluded from active progress.`,
        `Current completion rate: ${completionRate}%.`,
        atRiskProjects.length
          ? `Needs attention: ${atRiskProjects.map((row) => row.project.name).join(", ")}.`
          : "No projects currently need attention.",
        upcomingTasks.length
          ? `Upcoming: ${upcomingTasks.map((task) => `${task.title} (${dateLabel(task.dueDate)})`).join(", ")}.`
          : "No upcoming dated tasks in the next 14 days.",
      ].join("\n"),
    [archivedProjects.length, atRiskProjects, completedProjects.length, completedTasks.length, completionRate, currentProjects.length, openTasks.length, overdueTasks.length, upcomingTasks],
  );

  const copySummary = async () => {
    await navigator.clipboard.writeText(reportSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Review active work, attention areas, workload, and upcoming deadlines."
        actions={
          <button
            type="button"
            onClick={() => void copySummary()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
          >
            <Clipboard size={16} />
            {copied ? "Copied" : "Copy Summary"}
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={<FolderKanban size={18} />} label="Open Work" value={openTasks.length} helper={`${openProjectTasks} project · ${personalOpenTasks} personal`} />
        <ReportMetric icon={<CheckCircle2 size={18} />} label="Current Completion" value={`${completionRate}%`} helper={`${completedTasks.length} completed in current scope`} />
        <ReportMetric icon={<CircleAlert size={18} />} label="Overdue" value={overdueTasks.length} helper="Needs attention" tone="red" />
        <ReportMetric icon={<Target size={18} />} label="Current Projects" value={currentProjects.length} helper={`${pausedProjectRows.length} paused · ${finishedProjectRows.length} recently finished`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                <BarChart3 size={18} /> Active Project Progress
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Only active and paused projects show here. Completed and archived work is kept out of the current workload.</p>
            </div>
            <Badge tone="blue">{projectRows.length} current</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {projectRows.map((row) => (
              <div key={row.project.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--text)]">{row.project.name}</h3>
                      {row.project.status === "paused" ? <Badge tone="amber">paused</Badge> : null}
                      {row.overdue ? <Badge tone="red">overdue</Badge> : null}
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {row.open} open · {row.completed} done · {dateLabel(row.project.dueDate)}
                      {row.project.startDate ? ` · ${durationLabel(row.project.startDate, row.project.dueDate)}` : ""}
                    </p>
                  </div>
                  <Badge tone={row.overdue ? "red" : row.progress === 100 ? "emerald" : "blue"}>{row.progress}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                  <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${row.progress}%` }} />
                </div>
              </div>
            ))}
            {!projectRows.length ? <EmptyReport message="No active or paused projects to report. Completed and archived projects are hidden from active progress." /> : null}
          </div>
        </Card>

        <div className="grid gap-4">
          <FinishedProjectsCard completed={completedProjects.length} archived={archivedProjects.length} projects={finishedProjectRows} />
          <TaskPreviewCard
            title="Upcoming 14 Days"
            icon={<CalendarClock size={18} />}
            tasks={upcomingTasks}
            empty="No upcoming dated tasks in the next 14 days."
          />
          <TaskPreviewCard
            title="Recurring Work"
            icon={<Repeat2 size={18} />}
            tasks={recurringTasks}
            empty="No active recurring tasks yet."
            showRecurrence
          />
        </div>
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
          <AlertTriangle size={18} /> Needs Attention
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Current projects with overdue, waiting/review, high, or urgent open work.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {atRiskProjects.map((row) => (
            <div key={row.project.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-[var(--text)]">{row.project.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {row.open} open · {row.openHighPriority} high/urgent · {row.waitingReview} waiting/review
                  </p>
                </div>
                <Badge tone={row.overdue ? "red" : row.waitingReview ? "amber" : "blue"}>
                  {row.overdue ? "overdue" : row.waitingReview ? "waiting" : "priority"}
                </Badge>
              </div>
            </div>
          ))}
          {!atRiskProjects.length ? <EmptyReport message="No overdue, waiting/review, or urgent project work right now." /> : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Priority Load" items={taskPriorityOptions.map((option) => ({
          label: option.label,
          count: openTasks.filter((task) => task.priority === option.value).length,
          badge: <OptionBadge option={option} />,
        }))} />
        <BreakdownCard title="Status Mix" items={taskStatusOptions.map((option) => ({
          label: option.label,
          count: currentTasks.filter((task) => task.status === option.value).length,
          badge: <OptionBadge option={option} />,
        })).filter((item) => item.count > 0)} />
      </div>
    </div>
  );
}

function ReportMetric({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: string | number; helper: string; tone?: "red" }) {
  return (
    <Card className="p-5">
      <div className={tone === "red" ? "text-[var(--danger)]" : "text-[var(--text-soft)]"}>{icon}</div>
      <div className="mt-4 text-3xl font-bold text-[var(--text)]">{value}</div>
      <div className="mt-1 font-semibold text-[var(--text)]">{label}</div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{helper}</p>
    </Card>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { label: string; count: number; badge: ReactNode }[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const width = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.label} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <div className="flex items-center justify-between gap-3">
                {item.badge}
                <span className="text-sm font-semibold text-[var(--text-muted)]">{item.count}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
        {!items.length ? <EmptyReport message="No matching tasks yet." /> : null}
      </div>
    </Card>
  );
}

function FinishedProjectsCard({ completed, archived, projects }: { completed: number; archived: number; projects: Project[] }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
            <Archive size={18} /> Finished Work
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Completed and archived projects stay here instead of cluttering active progress.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="emerald">{completed} completed</Badge>
          <Badge tone="slate">{archived} archived</Badge>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-[var(--text)]">{project.name}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {project.status === "completed" ? "Completed" : "Archived"}{" "}
                  {plainDateLabel((project.completedAt ?? project.archivedAt ?? project.updatedAt).slice(0, 10))}
                </p>
              </div>
              <Badge tone={project.status === "completed" ? "emerald" : "slate"}>{project.status}</Badge>
            </div>
          </div>
        ))}
        {!projects.length ? <EmptyReport message="No completed or archived projects yet." /> : null}
      </div>
    </Card>
  );
}

function TaskPreviewCard({
  title,
  icon,
  tasks,
  empty,
  showRecurrence = false,
}: {
  title: string;
  icon: ReactNode;
  tasks: Task[];
  empty: string;
  showRecurrence?: boolean;
}) {
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
        {icon} {title}
      </h2>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-[var(--text)]">{task.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{dateLabel(task.dueDate)}</p>
                {task.startDate ? (
                  <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">
                    {startDateLabel(task.startDate)} · {durationLabel(task.startDate, task.dueDate)}
                  </p>
                ) : null}
                {showRecurrence ? (
                  <p className="mt-1 text-xs font-semibold text-[var(--text-soft)]">
                    {getTaskRecurrenceLabel(task)}
                  </p>
                ) : null}
              </div>
              <OptionBadge option={getTaskPriorityOption(task.priority)} />
            </div>
          </div>
        ))}
        {!tasks.length ? <EmptyReport message={empty} /> : null}
      </div>
    </Card>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-6 text-center text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}

function projectReport(project: Project, tasks: Task[]) {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const completed = projectTasks.filter((task) => isTerminalTaskStatus(task.status)).length;
  const open = projectTasks.length - completed;
  const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
  const overdue = projectTasks.some((task) => !isTerminalTaskStatus(task.status) && isOverdue(task.dueDate));
  const waitingReview = projectTasks.filter((task) => task.status === "waiting" || task.status === "review").length;
  const openHighPriority = projectTasks.filter(
    (task) => !isTerminalTaskStatus(task.status) && (task.priority === "high" || task.priority === "urgent"),
  ).length;

  return { project, completed, open, progress, overdue, waitingReview, openHighPriority };
}

function getTaskRecurrenceLabel(task: Task) {
  const option = getTaskRecurrenceOption(task.recurrence);
  return task.dueDate ? `${option.label} after completion` : `${option.label} once a due date is set`;
}

function isValidDate(date?: string) {
  if (!date) return false;
  const parsed = parseISO(date);
  return !Number.isNaN(parsed.getTime()) && !isBefore(parsed, new Date("2000-01-01"));
}
