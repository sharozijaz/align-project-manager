import { Archive, CalendarDays, CheckCircle2, Clock, LockKeyhole, NotebookTabs, PauseCircle, PlayCircle, UsersRound } from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTaskPriorityOption, isTerminalTaskStatus } from "../config/taskOptions";
import { NoteReaderModal } from "../components/notes/NoteReaderModal";
import { OptionBadge } from "../components/ui/OptionBadge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { dateLabel, durationLabel } from "../utils/date";

interface SharedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  notes?: SharedProjectNote[];
  shareToken?: string;
}

interface SharedProjectNote {
  id: string;
  title: string;
  content: string;
  tags?: string;
  favorite?: boolean;
  updatedAt?: string;
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
  const { token } = useParams();
  const [projects, setProjects] = useState<SharePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [savedClientName, setSavedClientName] = useState("");
  const [selectedNote, setSelectedNote] = useState<SharedProjectNote | null>(null);
  const params = new URLSearchParams(window.location.search);
  const clientName = savedClientName || params.get("client")?.trim() || "Client Project Overview";
  const tokens = (params.get("projects") || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const loadProjects = async (passwordValue = "") => {
    setError("");
    if (passwordValue) setUnlocking(true);
    else setLoading(true);

    try {
      if (token) {
        const response = await fetch(`/api/client-share?token=${encodeURIComponent(token)}`, {
          method: passwordValue ? "POST" : "GET",
          headers: passwordValue ? { "Content-Type": "application/json" } : undefined,
          body: passwordValue ? JSON.stringify({ password: passwordValue }) : undefined,
        });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) throw new Error("Client overview API is unavailable.");
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 401 && payload.passwordRequired) {
            setPasswordRequired(true);
            setProjects([]);
            setError(payload.error || "Password required.");
            return;
          }
          throw new Error(payload.error || "Client overview link is unavailable.");
        }
        setPasswordRequired(false);
        setPassword("");
        setSavedClientName(payload.clientName || "");
        setProjects(payload.projects || []);
        return;
      }

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

      setProjects(results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Share link unavailable.");
    } finally {
      setLoading(false);
      setUnlocking(false);
    }
  };

  useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tokens.join(",")]);

  const handleUnlock = (event: FormEvent) => {
    event.preventDefault();
    void loadProjects(password);
  };

  const stats = useMemo(() => {
    const allTasks = projects.flatMap((item) => item.tasks);
    const completed = allTasks.filter((task) => isTerminalTaskStatus(task.status)).length;
    const open = allTasks.length - completed;
    const progress = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
    const upcoming = projects
      .flatMap(({ project, tasks }) => tasks.map((task) => ({ task, project })))
      .filter(({ task }) => !isTerminalTaskStatus(task.status))
      .sort((a, b) => (a.task.dueDate || "9999-12-31").localeCompare(b.task.dueDate || "9999-12-31"))
      .slice(0, 5);
    const statusCounts = projects.reduce<Record<string, number>>((counts, item) => {
      counts[item.project.status] = (counts[item.project.status] || 0) + 1;
      return counts;
    }, {});

    return { completed, open, progress, total: allTasks.length, upcoming, statusCounts };
  }, [projects]);

  return (
    <div data-theme="dark">
      <main className="min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text)] sm:px-6">
        <div className="mx-auto max-w-[1600px] space-y-5">
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
          ) : passwordRequired ? (
            <section className="mx-auto max-w-md rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center gap-2">
                <LockKeyhole size={18} className="text-[var(--text-muted)]" />
                <h1 className="text-xl font-bold text-[var(--text)]">Password required</h1>
              </div>
              <p className="mb-4 text-sm leading-6 text-[var(--text-muted)]">
                This client overview is private. Enter the password shared by the project owner.
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
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["active", "paused", "completed", "archived"].map((status) =>
                      stats.statusCounts[status] ? (
                        <span key={status} className="inline-flex items-center gap-2">
                          <ProjectStatusBadge status={status} />
                          <span className="text-xs font-bold text-[var(--text-muted)]">{stats.statusCounts[status]}</span>
                        </span>
                      ) : null,
                    )}
                  </div>
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

                    const projectToken = project.shareToken || tokens[projects.findIndex((item) => item.project.id === project.id)];

                    return (
                      <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h2 className="break-words text-xl font-bold text-[var(--text)]">{project.name}</h2>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{project.description || "Project status and scheduled work."}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <OptionBadge option={getTaskPriorityOption(project.priority)} />
                            <ProjectStatusBadge status={project.status} large />
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
                        {(project.notes ?? []).length ? (
                          <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              <NotebookTabs size={14} />
                              Project context
                            </p>
                            <div className="grid gap-2 xl:grid-cols-2">
                              {sortSharedNotes(project.notes ?? []).slice(0, 4).map((note) => (
                                <SharedNotePreview key={note.id} note={note} onOpen={setSelectedNote} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {projectToken ? (
                          <Link to={`/share/${projectToken}`} className="mt-4 inline-flex text-sm font-semibold text-[var(--text-brand)] hover:underline">
                            Open project details
                          </Link>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                <aside className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <h2 className="text-lg font-bold text-[var(--text)]">Next Work</h2>
                  <div className="mt-4 space-y-3">
                    {stats.upcoming.map(({ task, project }) => (
                      <div key={task.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-soft)]">{project.name}</p>
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
              <NoteReaderModal
                note={
                  selectedNote
                    ? {
                        title: selectedNote.title,
                        body: selectedNote.content,
                        tags: selectedNote.tags,
                        favorite: selectedNote.favorite,
                        updatedAt: selectedNote.updatedAt,
                      }
                    : null
                }
                onClose={() => setSelectedNote(null)}
              />
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

function SharedNotePreview({ note, onOpen }: { note: SharedProjectNote; onOpen: (note: SharedProjectNote) => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      className="group cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
      onClick={() => onOpen(note)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(note);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-semibold text-[var(--text)]">{note.title}</p>
        {note.favorite ? <span className="rounded-full bg-[var(--priority-urgent-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--priority-urgent-text)]">Pinned</span> : null}
      </div>
      <p className="mt-2 text-xs font-bold text-[var(--text-brand)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100">Open note</p>
    </article>
  );
}

function sortSharedNotes(notes: SharedProjectNote[]) {
  return [...notes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

type ProjectStatus = "active" | "paused" | "completed" | "archived";

interface ProjectStatusMeta {
  label: string;
  icon: typeof PlayCircle;
  bg: string;
  border: string;
  text: string;
}

const projectStatusStyles: Record<ProjectStatus, ProjectStatusMeta> = {
  active: {
    label: "Active",
    icon: PlayCircle,
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border, var(--status-completed-text))",
    text: "var(--status-completed-text)",
  },
  paused: {
    label: "Paused",
    icon: PauseCircle,
    bg: "var(--status-paused-bg)",
    border: "var(--status-paused-border, var(--status-paused-text))",
    text: "var(--status-paused-text)",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border, var(--status-completed-text))",
    text: "var(--status-completed-text)",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    bg: "var(--status-not-started-bg)",
    border: "var(--status-not-started-border, var(--border-strong))",
    text: "var(--status-not-started-text)",
  },
};

function ProjectStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const meta = getProjectStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded border font-bold ${large ? "px-3 py-2 text-sm" : "px-2.5 py-1 text-xs"}`}
      style={
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          color: meta.text,
        } as CSSProperties
      }
    >
      <Icon size={large ? 16 : 13} />
      {meta.label}
    </span>
  );
}

function getProjectStatusMeta(status: string): ProjectStatusMeta {
  return projectStatusStyles[status as ProjectStatus] ?? {
    label: titleizeStatus(status),
    icon: CheckCircle2,
    bg: "var(--status-not-started-bg)",
    border: "var(--status-not-started-border, var(--border-strong))",
    text: "var(--status-not-started-text)",
  };
}

function titleizeStatus(status: string) {
  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
