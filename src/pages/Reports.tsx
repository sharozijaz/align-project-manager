import type { ReactNode } from "react";
import { addDays, isAfter, isBefore, parseISO, subDays } from "date-fns";
import { BarChart3, CalendarClock, CheckCircle2, CircleAlert, Clock3, FolderKanban } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { OptionBadge } from "../components/ui/OptionBadge";
import { getTaskPriorityOption, isTerminalTaskStatus, taskPriorityOptions, taskStatusOptions } from "../config/taskOptions";
import { useProjectStore } from "../store/projectStore";
import { useTaskStore } from "../store/taskStore";
import type { Project } from "../types/project";
import type { Task } from "../types/task";
import { dateLabel, isOverdue } from "../utils/date";

export function Reports() {
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const activeTasks = tasks.filter((task) => !task.deletedAt);
  const openTasks = activeTasks.filter((task) => !isTerminalTaskStatus(task.status));
  const completedTasks = activeTasks.filter((task) => isTerminalTaskStatus(task.status));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.dueDate));
  const soon = addDays(new Date(), 14);
  const upcomingTasks = openTasks
    .filter((task) => isValidDate(task.dueDate) && !isOverdue(task.dueDate) && !isAfter(parseISO(task.dueDate!), soon))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 6);
  const recentCompleted = completedTasks.filter((task) => {
    const updatedAt = parseISO(task.updatedAt);
    return isAfter(updatedAt, subDays(new Date(), 30));
  });
  const completionRate = activeTasks.length ? Math.round((completedTasks.length / activeTasks.length) * 100) : 0;
  const projectRows = projects.map((project) => projectReport(project, activeTasks));

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Track progress, overdue work, project health, and upcoming deadlines." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={<FolderKanban size={18} />} label="Open Tasks" value={openTasks.length} helper={`${activeTasks.length} total active`} />
        <ReportMetric icon={<CheckCircle2 size={18} />} label="Completion Rate" value={`${completionRate}%`} helper={`${completedTasks.length} completed`} />
        <ReportMetric icon={<CircleAlert size={18} />} label="Overdue" value={overdueTasks.length} helper="Needs attention" tone="red" />
        <ReportMetric icon={<Clock3 size={18} />} label="Completed 30d" value={recentCompleted.length} helper="Recent shipped work" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
            <BarChart3 size={18} /> Project Progress
          </h2>
          <div className="mt-4 space-y-3">
            {projectRows.map((row) => (
              <div key={row.project.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{row.project.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{row.open} open · {row.completed} done · {dateLabel(row.project.dueDate)}</p>
                  </div>
                  <Badge tone={row.overdue ? "red" : row.progress === 100 ? "emerald" : "blue"}>{row.progress}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                  <div className="h-full align-gradient" style={{ width: `${row.progress}%` }} />
                </div>
              </div>
            ))}
            {!projectRows.length ? <EmptyReport message="Create projects to see progress reports." /> : null}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
            <CalendarClock size={18} /> Upcoming 14 Days
          </h2>
          <div className="mt-4 space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{task.title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{dateLabel(task.dueDate)}</p>
                  </div>
                  <OptionBadge option={getTaskPriorityOption(task.priority)} />
                </div>
              </div>
            ))}
            {!upcomingTasks.length ? <EmptyReport message="No upcoming dated tasks in the next 14 days." /> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Priority Load" items={taskPriorityOptions.map((option) => ({
          label: option.label,
          count: openTasks.filter((task) => task.priority === option.value).length,
          badge: <OptionBadge option={option} />,
        }))} />
        <BreakdownCard title="Status Mix" items={taskStatusOptions.map((option) => ({
          label: option.label,
          count: activeTasks.filter((task) => task.status === option.value).length,
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
                <div className="h-full align-gradient" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
        {!items.length ? <EmptyReport message="No matching tasks yet." /> : null}
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

  return { project, completed, open, progress, overdue };
}

function isValidDate(date?: string) {
  if (!date) return false;
  const parsed = parseISO(date);
  return !Number.isNaN(parsed.getTime()) && !isBefore(parsed, new Date("2000-01-01"));
}
