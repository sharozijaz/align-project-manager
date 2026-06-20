import { ArrowRight, CalendarDays, CheckCircle2, Command, FileText, Folder, Home, LibraryBig, Plus, Search, StickyNote } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useCalendarStore } from "../../store/calendarStore";
import { useProjectStore } from "../../store/projectStore";
import { useSearchStore } from "../../store/searchStore";
import { useStudioStore } from "../../store/studioStore";
import { useTaskStore } from "../../store/taskStore";
import { buildWorkspaceSearchResults, type WorkspaceSearchKind, type WorkspaceSearchResult } from "../../utils/workspaceSearch";
import { SearchBox } from "../ui/SearchBox";
import { ThemedPortal } from "../ui/ThemedPortal";

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const open = useSearchStore((state) => state.open);
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const closePalette = useSearchStore((state) => state.closePalette);
  const openPalette = useSearchStore((state) => state.openPalette);
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const notes = useStudioStore((state) => state.notes);
  const resources = useStudioStore((state) => state.resources);
  const events = useCalendarStore((state) => state.events);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => buildWorkspaceSearchResults({ query, pathname: location.pathname, projects, tasks, notes, resources, events, limit: 14 }),
    [events, location.pathname, notes, projects, query, resources, tasks],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.key === "Escape" && open) closePalette();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open, query]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const selectResult = (result: WorkspaceSearchResult | undefined) => {
    if (!result) return;
    clearQuery();
    closePalette();
    navigate(result.to);
  };

  return (
    <ThemedPortal>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/55 p-3 backdrop-blur-sm sm:p-6"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) closePalette();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <motion.section
              className="mx-auto mt-[8vh] max-h-[min(720px,82vh)] w-full max-w-3xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--shadow-lg)]"
              role="dialog"
              aria-modal="true"
              aria-label="Command search"
              onPointerDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
            >
              <div className="border-b border-[var(--border)] bg-[var(--panel-inset)] p-3">
                <SearchBox
                  value={query}
                  onChange={setQuery}
                  placeholder={searchPlaceholder(location.pathname)}
                  trailingLabel="Esc"
                  autoFocus
                  inputRef={inputRef}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveIndex((current) => Math.max(current - 1, 0));
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      selectResult(results[activeIndex]);
                    }
                  }}
                />
              </div>

              <div className="max-h-[calc(min(720px,82vh)-5rem)] overflow-y-auto p-2">
                {results.length ? (
                  <div className="grid gap-1">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectResult(result)}
                        className={`grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition ${
                          index === activeIndex ? "bg-[var(--accent-soft)] text-[var(--text)]" : "hover:bg-[var(--surface-hover)]"
                        }`}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
                          <ResultIcon kind={result.kind} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[var(--text)]">{result.title}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--text-muted)]">{result.subtitle}</span>
                        </span>
                        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                          {result.kind}
                          <ArrowRight size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid place-items-center gap-3 px-5 py-14 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
                      <Search size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">No matches</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">Try a project, task, note, resource, or route name.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--panel-inset)] px-4 py-2 text-[11px] font-bold text-[var(--text-soft)]">
                <span>Ctrl K opens search</span>
                <span>Arrow keys move · Enter opens · Esc closes</span>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ThemedPortal>
  );
}

function ResultIcon({ kind }: { kind: WorkspaceSearchKind }) {
  if (kind === "action") return <Plus size={16} />;
  if (kind === "command") return <Command size={16} />;
  if (kind === "project") return <Folder size={16} />;
  if (kind === "task") return <CheckCircle2 size={16} />;
  if (kind === "todo") return <Home size={16} />;
  if (kind === "note") return <StickyNote size={16} />;
  if (kind === "resource") return <LibraryBig size={16} />;
  if (kind === "event") return <CalendarDays size={16} />;
  return <FileText size={16} />;
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
