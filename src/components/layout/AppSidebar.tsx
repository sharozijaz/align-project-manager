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
  Menu,
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
import { isLightThemeMode, useThemeStore } from "../../store/themeStore";

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

export function AppSidebar() {
  const { access, hasFeature } = useFeatureAccess();
  const { session } = useSupabaseSession();
  const theme = useThemeStore((state) => state.theme);
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
        <div className={`absolute left-3 top-3 h-[calc(100%-1.5rem)] transition-[width] duration-200 ease-out ${desktopExpanded ? "w-[248px]" : "w-[64px]"}`}>
          <SidebarContent
            links={links}
            profileName={profileName}
            profileEmail={profileEmail}
            profileAvatarUrl={profileAvatarUrl}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            collapsed={!desktopExpanded}
            logoSrc={logoSrc}
          />
        </div>
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
                logoSrc={logoSrc}
                onNavigate={() => setMobileOpen(false)}
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
  logoSrc,
  onNavigate,
}: {
  links: { primary: NavItem[]; workspace: NavItem[]; profile: NavItem[] };
  profileName: string;
  profileEmail?: string;
  profileAvatarUrl?: string;
  openMenu: "notifications" | "profile" | null;
  setOpenMenu: (value: "notifications" | "profile" | null) => void;
  collapsed: boolean;
  logoSrc: string;
  onNavigate?: () => void;
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
      <div className={`border-b border-[var(--border)] ${collapsed ? "p-2" : "p-3"}`}>
        <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-start"}`}>
          <NavLink
            to="/"
            onClick={onNavigate}
            className={`brand-logo-shell flex items-center rounded-[var(--radius-sm)] ${collapsed ? "h-11 w-11 justify-center px-0" : "h-12 px-3"}`}
            aria-label="Align home"
          >
            <img src={collapsed ? "/align-icon.png" : logoSrc} alt="Align" className={`${collapsed ? "h-7 w-7" : "h-9 w-auto"} object-contain`} />
          </NavLink>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto p-3">
        <NavSection label="Workspace" items={links.primary} collapsed={collapsed} onNavigate={onNavigate} />
        {links.workspace.length ? <NavSection label="Tools" items={links.workspace} collapsed={collapsed} onNavigate={onNavigate} /> : null}
      </nav>

      <div className={`space-y-3 border-t border-[var(--border)] ${collapsed ? "p-2" : "p-3"}`}>
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          <NotificationBell align="left" placement="up" open={openMenu === "notifications"} onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "notifications" : null)} />
          <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 text-sm font-semibold text-[var(--button-secondary-text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)] ${collapsed ? "w-10 px-0" : "flex-1"}`}
            onClick={() => window.dispatchEvent(new CustomEvent("align:open-shortcuts"))}
            aria-label="Show keyboard shortcuts"
            title="Shortcuts"
          >
            <Keyboard size={16} />
            {collapsed ? null : "Shortcuts"}
          </button>
        </div>

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(isProfileMenuOpen ? null : "profile")}
            className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] ${collapsed ? "h-11 w-11 justify-center p-0" : "w-full px-3 py-2"}`}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            title={profileName}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)]">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={16} />
              )}
            </span>
            <span className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
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

function NavSection({ label, items, collapsed, onNavigate }: { label: string; items: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <section className="space-y-2">
      <p className={`px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)] ${collapsed ? "sr-only" : ""}`}>{label}</p>
      <div className="grid gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] py-2.5 text-sm font-bold transition ${collapsed ? "justify-center px-2" : "px-3"} ${
                isActive
                  ? "align-gradient text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--text)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "sr-only" : ""}`}>{label}</span>
          </NavLink>
        ))}
      </div>
    </section>
  );
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
