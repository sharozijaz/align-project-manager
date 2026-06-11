import { Keyboard, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { SyncIndicator } from "../sync/SyncIndicator";
import { SearchBox } from "../ui/SearchBox";
import { useSearchStore } from "../../store/searchStore";

export function AppTopBar() {
  const location = useLocation();
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const openPalette = useSearchStore((state) => state.openPalette);
  const placeholder = searchPlaceholder(location.pathname);

  return (
    <div className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 py-3 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-[2200px] items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--brand-primary)] shadow-[var(--shadow-sm)]">
            <Search size={17} />
          </div>
          <SearchBox
            value={query}
            onChange={(value) => {
              setQuery(value);
              openPalette(value);
            }}
            onFocus={() => openPalette(query)}
            placeholder={placeholder}
            trailingLabel="Ctrl K"
            className="w-full max-w-xl"
          />
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
