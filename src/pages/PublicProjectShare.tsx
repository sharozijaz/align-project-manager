import { CalendarDays, CheckCircle2, Clock, ExternalLink, LockKeyhole, NotebookTabs, Repeat2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getTaskPriorityOption, getTaskRecurrenceOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { OptionBadge } from "../components/ui/OptionBadge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { dateLabel, durationLabel, startDateLabel } from "../utils/date";

interface SharedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  notes?: SharedProjectNote[];
}

interface SharedProjectNote {
  id: string;
  title: string;
  content: string;
  url?: string;
}

interface SharedTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  startDate?: string;
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
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");

  const loadShare = async (passwordValue = "") => {
    setError("");
    if (passwordValue) setUnlocking(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/project-share?token=${encodeURIComponent(token || "")}`, {
        method: passwordValue ? "POST" : "GET",
        headers: passwordValue ? { "Content-Type": "application/json" } : undefined,
        body: passwordValue ? JSON.stringify({ password: passwordValue }) : undefined,
      });
      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Share API is unavailable. Please redeploy Align and try again.");
      }

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401 && payload.passwordRequired) {
          setPasswordRequired(true);
          setData(null);
          setError(payload.error || "Password required.");
          return;
        }
        throw new Error(payload.error || "Share link not found.");
      }

      setPasswordRequired(false);
      setPassword("");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Share link not found.");
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  useEffect(() => {
    void loadShare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault();
    void loadShare(password);
  };

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
          ) : passwordRequired ? (
            <section className="mx-auto max-w-md rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <LockKeyhole size={18} className="text-[var(--text-muted)]" />
                <h1 className="text-xl font-bold text-[var(--text)]">Password required</h1>
              </div>
              <p className="mb-4 text-sm leading-6 text-[var(--text-muted)]">
                This read-only project is private. Enter the password shared by the project owner.
              </p>
              <form onSubmit={handleUnlock} className="space-y-3">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Share password"
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={!password.trim() || unlocking}>
                  {unlocking ? "Checking..." : "Unlock"}
                </Button>
              </form>
              {error ? <p className="mt-3 text-sm text-[var(--button-danger-text)]">{error}</p> : null}
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
                  <ShareStat label="Duration" value={durationLabel(data.project.startDate, data.project.dueDate)} icon={<Clock size={16} />} />
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--text)]">Client Summary</h2>
                  <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                    <SummaryRow label="Current status" value={getTaskStatusOption(data.project.status).label} />
                    <SummaryRow label="Started" value={startDateLabel(data.project.startDate)} />
                    <SummaryRow label="Duration" value={durationLabel(data.project.startDate, data.project.dueDate)} />
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

              {(data.project.notes ?? []).length ? (
                <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--text)]">
                    <NotebookTabs size={18} />
                    Shared Project Notes
                  </h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(data.project.notes ?? []).map((note) => (
                      <article key={note.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                        <h3 className="break-words font-bold text-[var(--text)]">{note.title}</h3>
                        {note.url ? (
                          <a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm font-semibold text-[var(--text-brand)] hover:underline" href={note.url} target="_blank" rel="noreferrer">
                            <ExternalLink size={14} />
                            <span className="truncate">{note.url}</span>
                          </a>
                        ) : null}
                        {note.content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{note.content}</p> : null}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

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
                        {task.startDate ? <span>{durationLabel(task.startDate, task.dueDate)}</span> : null}
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
