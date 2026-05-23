import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Folder,
  Home,
  Keyboard,
  LibraryBig,
  ListTodo,
  LogOut,
  Menu,
  Pin,
  StickyNote,
  Settings,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { InstallAppButton } from "../pwa/InstallAppButton";
import { NotificationBell } from "../notifications/NotificationBell";
import { SyncIndicator } from "../sync/SyncIndicator";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useFeatureAccess } from "../../features/access/FeatureAccessProvider";
import type { FeatureKey } from "../../features/access/featureRegistry";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { supabase } from "../../integrations/supabase/client";
import { useCalendarStore } from "../../store/calendarStore";
import { useProjectStore } from "../../store/projectStore";
import { useStudioStore } from "../../store/studioStore";
import { useTaskStore } from "../../store/taskStore";
import { isLightThemeMode, useThemeStore } from "../../store/themeStore";
import type { Project } from "../../types/project";
import { saveWorkspaceSafetyBackup } from "../../utils/storage";

interface NavItem {
  to: string;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  feature?: FeatureKey;
  ownerOnly?: boolean;
}

const primaryLinks: NavItem[] = [
  { to: "/", label: "Home", hint: "G H", icon: Home, feature: "project_management" },
  { to: "/projects", label: "Projects", hint: "G P", icon: Folder, feature: "project_management" },
  { to: "/tasks", label: "Tasks", hint: "G T", icon: CheckCircle2, feature: "project_management" },
  { to: "/todos", label: "Todos", hint: "G D", icon: ListTodo, feature: "project_management" },
  { to: "/calendar", label: "Calendar", hint: "G C", icon: CalendarDays, feature: "project_management" },
  { to: "/reports", label: "Reports", hint: "G R", icon: BarChart3, feature: "project_management" },
];

const workspaceLinks: NavItem[] = [
  { to: "/notes", label: "Notes", hint: "G N", icon: StickyNote, feature: "personal_hub" },
  { to: "/hub", label: "Personal Hub", hint: "G U", icon: LibraryBig, feature: "personal_hub" },
];

const profileLinks: NavItem[] = [
  { to: "/settings", label: "Settings", hint: "", icon: Settings },
  { to: "/help", label: "Help", hint: "?", icon: CircleHelp },
  { to: "/trash", label: "Trash", hint: "", icon: Trash2, feature: "project_management" },
  { to: "/admin", label: "Admin", hint: "", icon: Shield, feature: "admin", ownerOnly: true },
];

export const appNavigationItems = [...primaryLinks, ...workspaceLinks, ...profileLinks];

const sidebarSpring = { type: "spring", stiffness: 520, damping: 44, mass: 0.72 } as const;

export function AppSidebar() {
  const { access, hasFeature } = useFeatureAccess();
  const { session } = useSupabaseSession();
  const theme = useThemeStore((state) => state.theme);
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const events = useCalendarStore((state) => state.events);
  const resources = useStudioStore((state) => state.resources);
  const notes = useStudioStore((state) => state.notes);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [railHovered, setRailHovered] = useState(false);
  const [railPinned, setRailPinned] = useState(false);
  const [openMenu, setOpenMenu] = useState<"notifications" | "profile" | null>(null);
  const desktopSidebarRef = useRef<HTMLElement | null>(null);
  const profileName = access?.profile.displayName || access?.profile.email?.split("@")[0] || "Profile";
  const profileEmail = access?.profile.email;
  const profileAvatarUrl = getProfileAvatarUrl(session?.user.user_metadata);
  const desktopExpanded = railHovered || railPinned || openMenu !== null;
  const logoSrc = isLightThemeMode(theme) ? "/align-logo-light.png" : "/align-logo.png";
  const pinnedProjects = projects
    .filter((project) => project.pinnedAt && !project.deletedAt && (project.status === "active" || project.status === "paused"))
    .sort((a, b) => (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""));

  const handleSignOut = async () => {
    if (!supabase || !session) return;
    const shouldSignOut = window.confirm(
      "Sign out of cloud sync? Align will save a local safety backup first, then isolate this device from the signed-in cloud workspace.",
    );
    if (!shouldSignOut) return;

    saveWorkspaceSafetyBackup("profile-menu-sign-out", { tasks, projects, events, resources, notes });
    await supabase.auth.signOut();
    setOpenMenu(null);
    setRailHovered(false);
    setRailPinned(false);
  };

  const links = {
    primary: primaryLinks.filter((link) => canShowLink(link, hasFeature, access?.profile.role)),
    workspace: workspaceLinks.filter((link) => canShowLink(link, hasFeature, access?.profile.role)),
    profile: profileLinks.filter((link) => canShowLink(link, hasFeature, access?.profile.role)),
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!desktopExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (desktopSidebarRef.current?.contains(event.target as Node)) return;
      setRailPinned(false);
      setRailHovered(false);
      setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [desktopExpanded]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 px-3 py-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <NavLink to="/" className="brand-logo-shell flex h-11 w-36 items-center rounded-[var(--radius-sm)] px-2" aria-label="Align home">
          <img src={logoSrc} alt="Align" className="h-8 w-auto object-contain" />
        </NavLink>
        <NotificationBell open={openMenu === "notifications"} onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "notifications" : null)} />
      </header>

      <aside
        ref={desktopSidebarRef}
        className="relative z-30 hidden h-full min-h-0 w-[88px] shrink-0 bg-transparent lg:block"
        onMouseEnter={() => setRailHovered(true)}
        onMouseLeave={() => {
          if (!railPinned && !openMenu) setRailHovered(false);
        }}
        onPointerDown={() => setRailPinned(true)}
      >
        <motion.div
          className="absolute left-3 top-3 h-[calc(100%-1.5rem)] overflow-visible will-change-[width]"
          animate={{ width: desktopExpanded ? 248 : 64 }}
          transition={sidebarSpring}
        >
          <SidebarContent
            links={links}
            profileName={profileName}
            profileEmail={profileEmail}
            profileAvatarUrl={profileAvatarUrl}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            collapsed={!desktopExpanded}
            pinnedProjects={pinnedProjects}
            canSignOut={Boolean(session && supabase)}
            onSignOut={() => void handleSignOut()}
          />
        </motion.div>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <motion.aside
              className="h-full w-[min(21rem,calc(100vw-2rem))] border-r border-[var(--border)] bg-[var(--bg-soft)] p-3 shadow-[var(--shadow-md)]"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}
            >
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent
                links={links}
                profileName={profileName}
                profileEmail={profileEmail}
                profileAvatarUrl={profileAvatarUrl}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                collapsed={false}
                pinnedProjects={pinnedProjects}
                onNavigate={() => setMobileOpen(false)}
                canSignOut={Boolean(session && supabase)}
                onSignOut={() => void handleSignOut()}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({
  links,
  profileName,
  profileEmail,
  profileAvatarUrl,
  openMenu,
  setOpenMenu,
  collapsed,
  pinnedProjects,
  onNavigate,
  canSignOut,
  onSignOut,
}: {
  links: { primary: NavItem[]; workspace: NavItem[]; profile: NavItem[] };
  profileName: string;
  profileEmail?: string;
  profileAvatarUrl?: string;
  openMenu: "notifications" | "profile" | null;
  setOpenMenu: (value: "notifications" | "profile" | null) => void;
  collapsed: boolean;
  pinnedProjects: Project[];
  onNavigate?: () => void;
  canSignOut?: boolean;
  onSignOut?: () => void;
}) {
  const isProfileMenuOpen = openMenu === "profile";
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isProfileMenuOpen, setOpenMenu]);

  return (
    <div className="relative flex h-full min-h-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border)] p-2">
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-start"}`}>
          <NavLink
            to="/"
            onClick={onNavigate}
            className={`brand-logo-shell grid h-11 grid-cols-[28px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] px-2 ${collapsed ? "w-11" : "w-full"}`}
            aria-label="Align home"
          >
            <img src="/align-icon.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
            <span
              className={`min-w-0 truncate text-xl font-black tracking-[-0.02em] text-[var(--text)] transition duration-150 ${
                collapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              Align
            </span>
          </NavLink>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        <NavSection items={links.primary} collapsed={collapsed} pinnedProjects={pinnedProjects} onNavigate={onNavigate} />
        {links.workspace.length ? <NavSection items={links.workspace} collapsed={collapsed} onNavigate={onNavigate} separated /> : null}
      </nav>

      <div className="space-y-3 border-t border-[var(--border)] p-2.5">
        <div className="grid gap-1">
          <div className={`grid min-h-10 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] ${collapsed ? "w-10" : "px-0"}`}>
            <NotificationBell align="left" placement="up" open={openMenu === "notifications"} onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "notifications" : null)} />
            <span
              className={`truncate text-sm font-bold text-[var(--text)] transition duration-150 ${
                collapsed ? "translate-x-[-4px] opacity-0" : "translate-x-0 opacity-100"
              }`}
            >
              Notifications
            </span>
          </div>
          <button
            type="button"
            className={`grid min-h-10 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] text-sm font-bold text-[var(--text)] transition hover:bg-[var(--surface-hover)] ${collapsed ? "w-10" : ""}`}
            onClick={() => window.dispatchEvent(new CustomEvent("align:open-shortcuts"))}
            aria-label="Show keyboard shortcuts"
            title="Shortcuts"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)]">
              <Keyboard size={16} />
            </span>
            <span
              className={`truncate text-left transition duration-150 ${
                collapsed ? "translate-x-[-4px] opacity-0" : "translate-x-0 opacity-100"
              }`}
            >
              Shortcuts
            </span>
          </button>
        </div>

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(isProfileMenuOpen ? null : "profile")}
            className={`grid h-11 cursor-pointer grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] text-left transition hover:bg-[var(--surface-hover)] ${collapsed ? "w-10" : "w-full"}`}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            title={profileName}
          >
            <span className="grid h-11 w-10 shrink-0 place-items-center">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] ring-1 ring-[var(--border)]">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={16} />
              )}
              </span>
            </span>
            <span
              className={`min-w-0 transition duration-150 ${
                collapsed ? "translate-x-[-4px] opacity-0" : "translate-x-0 opacity-100"
              }`}
            >
              <span className="block truncate text-sm font-bold text-[var(--text)]">{profileName}</span>
              <span className="block truncate text-xs text-[var(--text-soft)]">{profileEmail ?? "Workspace profile"}</span>
            </span>
          </button>
          <AnimatePresence>
            {isProfileMenuOpen ? (
              <motion.div
                className={`absolute bottom-full z-30 pb-2 ${collapsed ? "left-full ml-2 w-56" : "left-0 w-full"}`}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--dropdown-bg)] p-2 shadow-[var(--shadow-md)]">
                  <div className="grid gap-2">
                    <SyncIndicator className="w-full justify-center rounded-md" />
                    <ThemeToggle showLabel className="w-full rounded-md" />
                    <div className="my-1 h-px bg-[var(--border)]" />
                    {links.profile.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => {
                          setOpenMenu(null);
                          onNavigate?.();
                        }}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                            isActive
                              ? "bg-[var(--button-secondary-hover)] text-[var(--text)]"
                              : "text-[var(--text-muted)] hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)]"
                          }`
                        }
                      >
                        <Icon size={15} />
                        {label}
                      </NavLink>
                    ))}
                    <InstallAppButton className="w-full" />
                    {canSignOut ? (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-bg)]"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavSection({
  items,
  collapsed,
  pinnedProjects = [],
  onNavigate,
  separated = false,
}: {
  items: NavItem[];
  collapsed: boolean;
  pinnedProjects?: Project[];
  onNavigate?: () => void;
  separated?: boolean;
}) {
  return (
    <section className={`${separated ? "mt-3 border-t border-[var(--border)] pt-3" : ""}`}>
      <div className="grid gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <div key={to} className="grid gap-1">
            <NavLink
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `align-sidebar-link group grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2.5 text-sm font-bold transition ${collapsed ? "w-10" : ""} ${
                  isActive
                    ? "align-sidebar-link-active align-gradient text-white shadow-[var(--shadow-sm)]"
                    : "text-[var(--text)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                }`
              }
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center">
                <Icon size={17} className="shrink-0" />
              </span>
              <span
                className={`min-w-0 flex-1 truncate transition duration-150 ${
                  collapsed ? "translate-x-[-4px] opacity-0" : "translate-x-0 opacity-100"
                }`}
              >
                {label}
              </span>
            </NavLink>
            {to === "/projects" && pinnedProjects.length ? (
              <div className={`grid gap-1 ${collapsed ? "pl-0" : "pl-4"}`}>
                {pinnedProjects.map((project) => (
                  <PinnedProjectLink key={project.id} project={project} collapsed={collapsed} onNavigate={onNavigate} />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function PinnedProjectLink({ project, collapsed, onNavigate }: { project: Project; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to={`/projects/${project.id}`}
      onClick={onNavigate}
      title={project.name}
      className={({ isActive }) =>
        `group relative grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-xs font-bold transition ${collapsed ? "w-10" : ""} ${
          isActive
            ? "bg-[var(--brand-50)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        }`
      }
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-[var(--button-secondary-bg)] text-[10px] font-black text-[var(--button-secondary-text)] ring-1 ring-[var(--border)]">
        {projectInitials(project.name)}
      </span>
      <span className={`min-w-0 truncate transition duration-150 ${collapsed ? "translate-x-[-4px] opacity-0" : "translate-x-0 opacity-100"}`}>
        {project.name}
      </span>
      <Pin size={12} className={`absolute right-2 ${collapsed ? "hidden" : "opacity-0 transition group-hover:opacity-60"}`} />
    </NavLink>
  );
}

function projectInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "P";
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function canShowLink(link: NavItem, hasFeature: (feature: FeatureKey) => boolean, role?: string) {
  if (link.ownerOnly && role !== "owner") return false;
  return link.feature ? hasFeature(link.feature) : true;
}

function getProfileAvatarUrl(metadata?: Record<string, unknown>) {
  if (!metadata) return undefined;

  const value = metadata.avatar_url ?? metadata.picture;
  return typeof value === "string" && value.trim() ? value : undefined;
}
