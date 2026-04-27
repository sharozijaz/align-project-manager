import {
  CalendarDays,
  CheckCircle2,
  Home,
  ListTodo,
  Settings,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { SyncIndicator } from "../sync/SyncIndicator";
import { ThemeToggle } from "../ui/ThemeToggle";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/projects", label: "Projects", icon: ListTodo },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
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
        <SyncIndicator />
        <ThemeToggle />
        <span className="hidden text-[var(--text-muted)] sm:inline">Sharoz</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)]">
          <UserRound size={16} />
        </span>
      </div>
    </header>
  );
}
