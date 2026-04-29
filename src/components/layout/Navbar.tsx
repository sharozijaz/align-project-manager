import {
  CalendarDays,
  BarChart3,
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
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export function Navbar() {
  const [menuPinned, setMenuPinned] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const isProfileMenuOpen = menuPinned || menuHovered;

  return (
    <header className="mx-auto grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-3 text-[var(--text)] shadow-[var(--shadow-sm)] md:flex md:flex-wrap md:justify-between md:px-4">
      <NavLink to="/" className="brand-logo-shell flex h-10 w-32 shrink-0 items-center rounded-[var(--radius-sm)] px-2 sm:w-40 md:h-11 md:w-44 md:px-3" aria-label="Align home">
        <img src="/align-logo.png" alt="Align" className="h-8 w-auto object-contain md:h-9" />
      </NavLink>
      <nav className="col-span-2 grid w-full min-w-0 grid-cols-5 gap-1 md:order-none md:col-span-1 md:flex md:w-auto md:justify-center md:gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `inline-flex min-w-0 shrink-0 flex-col items-center justify-center gap-1 rounded-md px-1.5 py-2 text-[11px] leading-none transition sm:flex-row sm:gap-2 sm:px-2 sm:text-sm md:px-3 ${
                isActive
                  ? "align-gradient text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`
            }
          >
            <Icon size={15} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center justify-end gap-1 text-sm sm:gap-2">
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
