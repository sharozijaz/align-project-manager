import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Folder,
  Home,
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
import { NotificationCenter } from "../notifications/NotificationCenter";
import { SyncIndicator } from "../sync/SyncIndicator";
import { useConfirm } from "../ui/ConfirmProvider";
import { AccentColorPicker, ThemeToggle } from "../ui/ThemeToggle";
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
  { to: "/resources", label: "Resources", hint: "G U", icon: LibraryBig, feature: "personal_hub" },
];

const profileLinks: NavItem[] = [
  { to: "/settings", label: "Settings", hint: "", icon: Settings },
  { to: "/help", label: "Help", hint: "?", icon: CircleHelp },
  { to: "/trash", label: "Trash", hint: "", icon: Trash2, feature: "project_management" },
  { to: "/admin", label: "Admin", hint: "", icon: Shield, feature: "admin", ownerOnly: true },
];

export const appNavigationItems = [...primaryLinks, ...workspaceLinks, ...profileLinks];

const sidebarSpring = { type: "spring", stiffness: 340, damping: 36, mass: 0.82 } as const;
const sidebarTextMotion = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -6 },
  transition: { duration: 0.16, ease: "easeOut" },
} as const;

export function AppSidebar() {
  const confirm = useConfirm();
  const { access, hasFeature } = useFeatureAccess();
  const { session } = useSupabaseSession();
  const theme = useThemeStore((state) => state.theme);
  const projects = useProjectStore((state) => state.projects);
  const tasks = useTaskStore((state) => state.tasks);
  const events = useCalendarStore((state) => state.events);
  const resources = useStudioStore((state) => state.resources);
  const notes = useStudioStore((state) => state.notes);
  const noteSpaces = useStudioStore((state) => state.noteSpaces);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"profile" | null>(null);
  const desktopSidebarRef = useRef<HTMLElement | null>(null);
  const profileName = access?.profile.displayName || access?.profile.email?.split("@")[0] || "Profile";
  const profileEmail = access?.profile.email;
  const profileAvatarUrl = getProfileAvatarUrl(session?.user.user_metadata);
  const desktopExpanded = desktopOpen || openMenu !== null;
  const logoSrc = isLightThemeMode(theme) ? "/align-logo-light.png" : "/align-logo.png";
  const pinnedProjects = projects
    .filter((project) => project.pinnedAt && !project.deletedAt && (project.status === "active" || project.status === "paused"))
    .sort((a, b) => (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""));

  const handleSignOut = async () => {
    if (!supabase || !session) return;
    const shouldSignOut = await confirm({
      title: "Sign out of cloud sync?",
      description: "Align will save a local safety backup first, then isolate this device from the signed-in cloud workspace.",
      confirmLabel: "Sign Out",
    });
    if (!shouldSignOut) return;

    saveWorkspaceSafetyBackup("profile-menu-sign-out", { tasks, projects, events, resources, notes, noteSpaces });
    await supabase.auth.signOut();
    setOpenMenu(null);
    setDesktopOpen(false);
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
      setOpenMenu(null);
      setDesktopOpen(false);
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
        <NotificationCenter />
      </header>

      <motion.aside
        ref={desktopSidebarRef}
        className="relative z-30 hidden h-full min-h-0 shrink-0 overflow-visible bg-[#171717] lg:block"
        animate={{ width: desktopExpanded ? 248 : 88 }}
        transition={sidebarSpring}
        onPointerDown={() => setDesktopOpen(true)}
      >
        <div className="h-full w-full overflow-visible">
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
        </div>
      </motion.aside>

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
  openMenu: "profile" | null;
  setOpenMenu: (value: "profile" | null) => void;
  collapsed: boolean;
  pinnedProjects: Project[];
  onNavigate?: () => void;
  canSignOut?: boolean;
  onSignOut?: () => void;
}) {
  const isProfileMenuOpen = openMenu === "profile";
  const accentColor = useThemeStore((state) => state.accentColor);
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
    <div className="relative flex h-full min-h-0 flex-col bg-[#171717] text-white shadow-[var(--shadow-sm)]">
      <div className="pb-4">
        <div className="relative">
          <NavLink
            to="/"
            onClick={onNavigate}
            className="brand-logo-shell grid h-16 grid-cols-[88px_minmax(0,1fr)] items-center"
            aria-label="Align home"
          >
            <span className="grid h-16 w-[88px] place-items-center">
              <img src="/align-icon.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
            </span>
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.span {...sidebarTextMotion} className="min-w-0 truncate text-xl font-black tracking-normal text-white">
                  Align
                </motion.span>
              ) : null}
            </AnimatePresence>
          </NavLink>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-1">
        <NavSection items={links.primary} collapsed={collapsed} pinnedProjects={pinnedProjects} onNavigate={onNavigate} />
        {links.workspace.length ? <NavSection items={links.workspace} collapsed={collapsed} onNavigate={onNavigate} separated /> : null}
      </nav>

      <div className="space-y-4 border-t border-white/20 pb-4 pt-4">
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(isProfileMenuOpen ? null : "profile")}
            className="grid h-12 w-full cursor-pointer grid-cols-[88px_minmax(0,1fr)] items-center rounded-[var(--radius-sm)] text-left transition hover:bg-white/10"
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            title={profileName}
          >
            <span className="grid h-12 w-[88px] shrink-0 place-items-center">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white/90 text-[#171717] ring-1 ring-white/20">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={16} />
                )}
              </span>
            </span>
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.span {...sidebarTextMotion} className="min-w-0 overflow-hidden">
                  <span className="block truncate text-sm font-bold text-white">{profileName}</span>
                  <span className="block truncate text-xs text-white/60">{profileEmail ?? "Workspace profile"}</span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
          <AnimatePresence>
            {isProfileMenuOpen ? (
              <motion.div
                className={`absolute bottom-full z-[70] pb-3 ${collapsed ? "left-full ml-3 w-[280px]" : "left-4 w-[280px]"}`}
                data-theme="dark"
                data-accent={accentColor}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-[var(--text)] shadow-[var(--shadow-lg)]">
                  <div className="grid gap-2.5">
                    <SyncIndicator className="w-full justify-center rounded-md" />
                    <ThemeToggle showLabel className="w-full rounded-md" />
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                      <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">Accent</p>
                      <AccentColorPicker compact />
                    </div>
                    <div className="my-1.5 h-px bg-[var(--border)]" />
                    {links.profile.map(({ to, label, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => {
                          setOpenMenu(null);
                          onNavigate?.();
                        }}
                        className={({ isActive }) =>
                          `flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition ${
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
    <section className={`${separated ? "mt-3 pt-3" : ""}`}>
      {separated ? <div className={`${collapsed ? "mx-auto w-16" : "mx-4"} mb-3 h-px bg-white/20`} /> : null}
      <div className="grid gap-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <div key={to} className="grid gap-1">
            <NavLink
              to={to}
              end={to === "/"}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `align-sidebar-link group relative isolate grid h-10 min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center text-sm font-bold transition ${
                  isActive
                    ? collapsed
                      ? "align-sidebar-link-active text-white"
                      : "align-sidebar-link-active text-white"
                    : "text-[#c7c7c7] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <AnimatePresence initial={false}>
                    {!collapsed ? (
                      <motion.span
                        initial={{ opacity: 0, scaleX: 0.94 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0.94 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                      className={`pointer-events-none absolute inset-y-0 left-4 right-4 z-0 rounded-[var(--radius-sm)] transition ${
                        isActive ? "bg-[var(--brand-primary)] shadow-[var(--shadow-sm)]" : "group-hover:bg-white/10"
                      }`}
                      />
                    ) : null}
                  </AnimatePresence>
                  <span className="relative z-10 grid h-10 w-[88px] shrink-0 place-items-center">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] ${
                        collapsed && isActive
                          ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-sm)]"
                          : collapsed && !isActive
                            ? "group-hover:bg-white/10"
                            : ""
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                    </span>
                  </span>
                  <AnimatePresence initial={false}>
                    {!collapsed ? (
                      <motion.span {...sidebarTextMotion} className="relative z-10 min-w-0 truncate text-left">
                        {label}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
            {to === "/projects" && pinnedProjects.length ? (
              <div className="grid gap-1 pt-1">
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
        `group relative isolate grid h-9 min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center text-xs font-bold transition ${
          isActive
            ? collapsed
              ? "text-white"
              : "text-white"
            : "text-[#c7c7c7] hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.span
                initial={{ opacity: 0, scaleX: 0.94 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.94 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              className={`pointer-events-none absolute inset-y-0 left-4 right-4 z-0 rounded-[var(--radius-sm)] transition ${
                isActive ? "bg-white/10 ring-1 ring-white/20" : "group-hover:bg-white/10"
              }`}
              />
            ) : null}
          </AnimatePresence>
          <span className="relative z-10 grid h-9 w-[88px] shrink-0 place-items-center">
            <span
              className={`grid h-6 min-w-6 place-items-center rounded-[var(--radius-xs)] px-1.5 text-[10px] font-black text-white ring-1 ring-white/10 ${
                collapsed && isActive ? "bg-[var(--brand-primary)]" : collapsed ? "bg-[#2a2a2a] group-hover:bg-white/15" : "bg-[#2a2a2a]"
              }`}
            >
              {projectInitials(project.name)}
            </span>
          </span>
          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.span {...sidebarTextMotion} className="relative z-10 min-w-0 truncate">
                {project.name}
              </motion.span>
            ) : null}
          </AnimatePresence>
          {!collapsed ? <Pin size={12} className="absolute right-6 opacity-0 transition group-hover:opacity-60" /> : null}
        </>
      )}
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
