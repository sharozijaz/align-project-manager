import { Command, Keyboard } from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { SyncIndicator } from "../sync/SyncIndicator";
import { SearchBox } from "../ui/SearchBox";
import { useProjectStore } from "../../store/projectStore";
import { useSearchStore } from "../../store/searchStore";
import { useStudioStore } from "../../store/studioStore";
import { useTaskStore } from "../../store/taskStore";

export function AppTopBar() {
  const location = useLocation();
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useStudioStore((state) => state.notes);
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const placeholder = searchPlaceholder(location.pathname);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const projectResults = projects
      .filter((project) => !project.deletedAt && `${project.name} ${project.description ?? ""}`.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map((project) => ({ id: `project-${project.id}`, title: project.name, meta: "Project", to: `/projects/${project.id}` }));
    const taskResults = tasks
      .filter((task) => !task.deletedAt && `${task.title} ${task.description ?? ""}`.toLowerCase().includes(normalized))
      .slice(0, 5)
      .map((task) => ({ id: `task-${task.id}`, title: task.title, meta: task.projectId ? "Project task" : "Task", to: "/tasks" }));
    const noteResults = notes
      .filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map((note) => ({ id: `note-${note.id}`, title: note.title, meta: "Note", to: "/notes" }));

    return [...projectResults, ...taskResults, ...noteResults].slice(0, 8);
  }, [notes, projects, query, tasks]);

  return (
    <div className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 py-3 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-[2200px] items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--brand-primary)] shadow-[var(--shadow-sm)]">
            <Command size={17} />
          </div>
          <div className="relative w-full max-w-xl">
            <SearchBox value={query} onChange={setQuery} placeholder={placeholder} trailingLabel="Search" />
            {query ? (
              <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--shadow-lg)]">
                {results.length ? (
                  <div className="max-h-96 overflow-y-auto p-2">
                    {results.map((result) => (
                      <Link key={result.id} to={result.to} onClick={clearQuery} className="block rounded-[var(--radius-md)] px-3 py-2 transition hover:bg-[var(--surface-hover)]">
                        <span className="block truncate text-sm font-black text-[var(--text)]">{result.title}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-[var(--text-muted)]">{result.meta}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm font-semibold text-[var(--text-muted)]">No results found.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SyncIndicator className="hidden rounded-[var(--radius-sm)] xl:inline-flex" />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("align:open-shortcuts"))}
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
            aria-label="Show keyboard shortcuts"
            title="Shortcuts"
          >
            <Keyboard size={16} />
          </button>
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
}

function searchPlaceholder(pathname: string) {
  if (pathname.startsWith("/projects/")) return "Search this project, tasks, notes...";
  if (pathname.startsWith("/projects")) return "Search projects, clients, work...";
  if (pathname.startsWith("/tasks")) return "Search tasks...";
  if (pathname.startsWith("/todos")) return "Search todos...";
  if (pathname.startsWith("/notes")) return "Search notes, tags, linked projects...";
  if (pathname.startsWith("/resources")) return "Search resources, tags, collections...";
  return "Search tasks, projects, notes...";
}
