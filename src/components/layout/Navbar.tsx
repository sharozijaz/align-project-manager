import {
  CalendarDays,
  CheckCircle2,
  Home,
  ListTodo,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { InstallAppButton } from "../pwa/InstallAppButton";
import { SyncIndicator } from "../sync/SyncIndicator";
import { NotificationBell } from "../notifications/NotificationBell";
import { ThemeToggle } from "../ui/ThemeToggle";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/projects", label: "Projects", icon: ListTodo },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function Navbar() {
  const [menuPinned, setMenuPinned] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const isProfileMenuOpen = menuPinned || menuHovered;

  return (
    <header className="mx-auto flex w-full flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-3 text-[var(--text)] shadow-[var(--shadow-sm)]">
      <NavLink to="/" className="brand-logo-shell flex h-11 w-44 shrink-0 items-center rounded-[var(--radius-sm)] px-3" aria-label="Align home">
        <img src="/align-logo.png" alt="Align" className="h-9 w-auto object-contain" />
      </NavLink>
      <nav className="order-3 flex w-full min-w-0 items-center gap-2 overflow-x-auto md:order-none md:w-auto md:justify-center md:overflow-visible">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "align-gradient text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2 text-sm">
        <NotificationBell />
        <div
          className="relative"
          onMouseEnter={() => setMenuHovered(true)}
          onMouseLeave={() => setMenuHovered(false)}
        >
          <button
            type="button"
            onClick={() => setMenuPinned((current) => !current)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-transparent px-2 py-1 text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--button-secondary-bg)] hover:text-[var(--text)]"
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
          >
            <span className="hidden sm:inline">Sharoz</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)]">
              <UserRound size={16} />
            </span>
          </button>
          {isProfileMenuOpen ? (
          <div className="absolute right-0 top-full z-30 w-60 pt-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--dropdown-bg)] p-2 shadow-[var(--shadow-md)]">
            <div className="border-b border-[var(--border)] px-3 py-2">
              <p className="text-sm font-semibold text-[var(--text)]">Sharoz</p>
              <p className="text-xs text-[var(--text-soft)]">Workspace profile</p>
            </div>
            <div className="mt-2 grid gap-2">
              <SyncIndicator className="w-full justify-center rounded-md" />
              <ThemeToggle showLabel className="w-full rounded-md" />
            </div>
            <InstallAppButton className="mt-2 w-full" />
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "align-gradient text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)]"
                }`
              }
              onClick={() => setMenuPinned(false)}
            >
              <Settings size={16} />
              Settings
            </NavLink>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)]"
              onClick={() => setMenuPinned(false)}
            >
              <X size={16} />
              Close menu
            </button>
          </div>
          </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
