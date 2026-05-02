import {
  CalendarDays,
  BarChart3,
  CheckCircle2,
  Home,
  ListTodo,
  Settings,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { InstallAppButton } from "../pwa/InstallAppButton";
import { SyncIndicator } from "../sync/SyncIndicator";
import { NotificationBell } from "../notifications/NotificationBell";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useFeatureAccess } from "../../features/access/FeatureAccessProvider";
import type { FeatureKey } from "../../features/access/featureRegistry";

const links = [
  { to: "/", label: "Home", icon: Home, feature: "project_management" },
  { to: "/projects", label: "Projects", icon: ListTodo, feature: "project_management" },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2, feature: "project_management" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, feature: "project_management" },
  { to: "/reports", label: "Reports", icon: BarChart3, feature: "project_management" },
] satisfies Array<{ to: string; label: string; icon: typeof Home; feature: FeatureKey }>;

export function Navbar() {
  const { access, hasFeature } = useFeatureAccess();
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const isProfileMenuOpen = openMenu === "profile";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header ref={shellRef} className="mx-auto grid w-full min-w-0 grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-3 text-[var(--text)] shadow-[var(--shadow-sm)] md:flex md:flex-wrap md:justify-between md:px-4">
      <NavLink to="/" className="brand-logo-shell flex h-10 w-32 shrink-0 items-center rounded-[var(--radius-sm)] px-2 sm:w-40 md:h-11 md:w-44 md:px-3" aria-label="Align home">
        <img src="/align-logo.png" alt="Align" className="h-8 w-auto object-contain md:h-9" />
      </NavLink>
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 text-sm sm:gap-2 md:order-3">
        <NotificationBell open={openMenu === "notifications"} onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "notifications" : null)} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((current) => (current === "profile" ? null : "profile"))}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-transparent px-2 py-1 text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--button-secondary-bg)] hover:text-[var(--text)]"
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
          >
            <span className="hidden sm:inline">Sharoz</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)]">
              <UserRound size={16} />
            </span>
          </button>
          <AnimatePresence>
            {isProfileMenuOpen ? (
            <motion.div
              className="absolute right-0 top-full z-30 w-[min(15rem,calc(100vw-2rem))] pt-2"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
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
                  onClick={() => setOpenMenu(null)}
                >
                  <Settings size={16} />
                  Settings
                </NavLink>
                {access?.profile.role === "owner" && hasFeature("admin") ? (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "align-gradient text-white"
                          : "text-[var(--text-muted)] hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)]"
                      }`
                    }
                    onClick={() => setOpenMenu(null)}
                  >
                    <Shield size={16} />
                    Admin
                  </NavLink>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)]"
                  onClick={() => setOpenMenu(null)}
                >
                  <X size={16} />
                  Close menu
                </button>
              </div>
            </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <nav className="col-span-2 row-start-2 grid w-full min-w-0 grid-cols-5 gap-1 md:order-none md:col-span-1 md:row-start-auto md:flex md:w-auto md:justify-center md:gap-2">
        {links.filter((link) => hasFeature(link.feature)).map(({ to, label, icon: Icon }) => (
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
            onClick={() => setOpenMenu(null)}
          >
            <Icon size={15} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
