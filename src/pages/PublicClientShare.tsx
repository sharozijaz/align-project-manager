import { CalendarDays, CheckCircle2, Clock, LockKeyhole, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTaskPriorityOption, getTaskStatusOption, isTerminalTaskStatus } from "../config/taskOptions";
import { OptionBadge } from "../components/ui/OptionBadge";
import { dateLabel, durationLabel } from "../utils/date";

interface SharedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
}

interface SharedTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  startDate?: string;
  dueDate?: string;
}

interface SharePayload {
  project: SharedProject;
  tasks: SharedTask[];
}

export function PublicClientShare() {
  const [projects, setProjects] = useState<SharePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const params = new URLSearchParams(window.location.search);
  const clientName = params.get("client")?.trim() || "Client Project Overview";
  const tokens = (params.get("projects") || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        if (!tokens.length) throw new Error("No projects were included in this share link.");

        const results = await Promise.all(
          tokens.map(async (token) => {
            const response = await fetch(`/api/project-share?token=${encodeURIComponent(token)}`);
            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) throw new Error("Share API is unavailable.");
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "A project share link is unavailable.");
            return payload as SharePayload;
          }),
        );

        if (mounted) setProjects(results);
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Share link unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, [tokens.join(",")]);

  const stats = useMemo(() => {
    const allTasks = projects.flatMap((item) => item.tasks);
    const completed = allTasks.filter((task) => isTerminalTaskStatus(task.status)).length;
    const open = allTasks.length - completed;
    const progress = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    const upcoming = allTasks
      .filter((task) => !isTerminalTaskStatus(task.status))
      .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"))
      .slice(0, 5);

    return { completed, open, progress, total: allTasks.length, upcoming };
  }, [projects]);

  return (
    <div data-theme="dark">
      <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)] sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <header className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 shadow-[var(--shadow-sm)]">
            <img src="/align-logo.png" alt="Align" className="h-10 w-auto" />
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
              <LockKeyhole size={14} />
              Read-only
            </div>
          </header>

          {loading ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">
              Loading client overview...
            </section>
          ) : error ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <h1 className="text-2xl font-bold text-[var(--text)]">Client overview unavailable</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{error}</p>
            </section>
          ) : (
            <>
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]">
                <div className="bg-[var(--bg-soft)] p-6 sm:p-8">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    <UsersRound size={15} />
                    Agency / Client Workspace
                  </p>
                  <h1 className="mt-3 text-3xl font-bold text-[var(--text)] sm:text-4xl">{clientName}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                    A read-only overview of selected projects, current progress, and active work.
                  </p>
                  <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                    <div className="h-full align-gradient" style={{ width: `${stats.progress}%` }} />
                  </div>
                </div>
                <div className="grid gap-px bg-[var(--border)] sm:grid-cols-4">
                  <ShareStat label="Projects" value={projects.length} icon={<UsersRound size={16} />} />
                  <ShareStat label="Open Tasks" value={stats.open} icon={<Clock size={16} />} />
                  <ShareStat label="Completed" value={stats.completed} icon={<CheckCircle2 size={16} />} />
                  <ShareStat label="Progress" value={`${stats.progress}%`} icon={<CalendarDays size={16} />} />
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
                <div className="space-y-4">
                  {projects.map(({ project, tasks }) => {
                    const completed = tasks.filter((task) => isTerminalTaskStatus(task.status)).length;
                    const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
                    const open = tasks.length - completed;

                    return (
                      <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h2 className="break-words text-xl font-bold text-[var(--text)]">{project.name}</h2>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{project.description || "Project status and scheduled work."}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <OptionBadge option={getTaskPriorityOption(project.priority)} />
                            <OptionBadge option={getTaskStatusOption(project.status)} />
                          </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                          <div className="h-full align-gradient" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-3">
                          <span>{open} open</span>
                          <span>{completed} completed</span>
                          <span>{durationLabel(project.startDate, project.dueDate)}</span>
                        </div>
                        <Link to={`/share/${tokens[projects.findIndex((item) => item.project.id === project.id)]}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--text-brand)] hover:underline">
                          Open project details
                        </Link>
                      </article>
                    );
                  })}
                </div>

                <aside className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--text)]">Next Work</h2>
                  <div className="mt-4 space-y-3">
                    {stats.upcoming.map((task) => (
                      <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-[var(--text)]">{task.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">{dateLabel(task.dueDate)}</p>
                          </div>
                          <OptionBadge option={getTaskPriorityOption(task.priority)} />
                        </div>
                      </div>
                    ))}
                    {!stats.upcoming.length ? (
                      <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-6 text-center text-sm text-[var(--text-muted)]">
                        No open dated tasks are visible yet.
                      </div>
                    ) : null}
                  </div>
                </aside>
              </section>
            </>
          )}
        </div>
      </main>
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
