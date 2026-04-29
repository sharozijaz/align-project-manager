import { CalendarDays, CheckCircle2, Clock, LockKeyhole, Repeat2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getTaskPriorityOption, getTaskRecurrenceOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { OptionBadge } from "../components/ui/OptionBadge";
import { dateLabel } from "../utils/date";

interface SharedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface SharedTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  recurrence?: string;
  updatedAt?: string;
}

interface SharePayload {
  project: SharedProject;
  tasks: SharedTask[];
}

export function PublicProjectShare() {
  const { token } = useParams();
  const [data, setData] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadShare() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/project-share?token=${encodeURIComponent(token || "")}`);
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error("Share API is unavailable. Please redeploy Align and try again.");
        }

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Share link not found.");
        }

        if (mounted) setData(payload);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Share link not found.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadShare();

    return () => {
      mounted = false;
    };
  }, [token]);

  const stats = useMemo(() => {
    const tasks = data?.tasks ?? [];
    const completed = tasks.filter((task) => isTerminalTaskStatus(task.status)).length;
    const open = tasks.length - completed;
    const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    return { completed, open, progress, total: tasks.length };
  }, [data?.tasks]);
  const visibleTasks = useMemo(
    () =>
      [...(data?.tasks ?? [])].sort((a, b) => {
        const terminalDelta = Number(isTerminalTaskStatus(a.status)) - Number(isTerminalTaskStatus(b.status));
        if (terminalDelta !== 0) return terminalDelta;
        return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
      }),
    [data?.tasks],
  );
  const upcomingTasks = visibleTasks.filter((task) => !isTerminalTaskStatus(task.status)).slice(0, 5);
  const sortedUpdates = visibleTasks
    .map((task) => task.updatedAt)
    .filter(Boolean)
    .sort();
  const lastUpdated = sortedUpdates[sortedUpdates.length - 1];

  return (
    <div data-theme="dark">
      <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)] sm:px-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <header className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-sm)]">
            <img src="/align-logo.png" alt="Align" className="h-10 w-auto" />
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
              <LockKeyhole size={14} />
              Read-only
            </div>
          </header>

          {loading ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
              Loading project view...
            </section>
          ) : error ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <h1 className="text-2xl font-bold text-[var(--text)]">Share link unavailable</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
            </section>
          ) : data ? (
            <>
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]">
                <div className="bg-[var(--bg-soft)] p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">Client Project View</p>
                      <h1 className="mt-3 text-3xl font-bold text-[var(--text)] sm:text-4xl">{data.project.name}</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                        {data.project.description || "Project status and scheduled work."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <OptionBadge option={getTaskPriorityOption(data.project.priority)} />
                      <OptionBadge option={getTaskStatusOption(data.project.status)} />
                    </div>
                  </div>

                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                    <div className="h-full align-gradient" style={{ width: `${stats.progress}%` }} />
                  </div>
                </div>
                <div className="grid gap-px bg-[var(--border)] sm:grid-cols-4">
                  <ShareStat label="Progress" value={`${stats.progress}%`} icon={<CheckCircle2 size={16} />} />
                  <ShareStat label="Open Tasks" value={stats.open} icon={<Clock size={16} />} />
                  <ShareStat label="Completed" value={stats.completed} icon={<CheckCircle2 size={16} />} />
                  <ShareStat label="Due Date" value={dateLabel(data.project.dueDate)} icon={<CalendarDays size={16} />} />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--text)]">Client Summary</h2>
                  <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                    <SummaryRow label="Current status" value={getTaskStatusOption(data.project.status).label} />
                    <SummaryRow label="Progress" value={`${stats.progress}% complete`} />
                    <SummaryRow label="Open work" value={`${stats.open} tasks remaining`} />
                    <SummaryRow label="Last updated" value={lastUpdated ? dateLabel(lastUpdated.slice(0, 10)) : "No task updates yet"} />
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--text)]">Next Work</h2>
                  <div className="mt-4 space-y-2">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-[var(--text)]">{task.title}</p>
                          <span className="text-xs font-semibold text-[var(--text-soft)]">{dateLabel(task.dueDate)}</span>
                        </div>
                      </div>
                    ))}
                    {!upcomingTasks.length ? (
                      <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-5 text-center text-sm text-[var(--text-muted)]">
                        No open dated tasks are visible yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[var(--text)]">Project Tasks</h2>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">{stats.total} total</span>
                </div>
                <div className="space-y-3">
                  {visibleTasks.map((task) => (
                    <article key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <h3 className="font-semibold text-[var(--text)]">{task.title}</h3>
                          {task.description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{task.description}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <OptionBadge option={getTaskPriorityOption(task.priority)} />
                          <OptionBadge option={getTaskStatusOption(task.status)} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--text-soft)]">
                        <span>{dateLabel(task.dueDate)}</span>
                        {task.recurrence && task.recurrence !== "none" ? (
                          <span className="inline-flex items-center gap-1">
                            <Repeat2 size={12} />
                            {getTaskRecurrenceOption(task.recurrence).label}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {!visibleTasks.length ? (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-8 text-center text-sm text-[var(--text-muted)]">
                      No visible tasks yet.
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <strong className="text-right text-[var(--text)]">{value}</strong>
    </div>
  );
}

function ShareStat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-soft)]">{icon}</div>
      <div className="mt-3 text-2xl font-bold text-[var(--text)]">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
