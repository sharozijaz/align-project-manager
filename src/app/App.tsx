import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { MotionConfig, motion } from "motion/react";
import { AuthGate } from "../components/auth/AuthGate";
import { DesktopTitleBar } from "../components/desktop/DesktopTitleBar";
import { AppShortcuts } from "../components/layout/AppShortcuts";
import { AppSidebar } from "../components/layout/AppSidebar";
import { AppTopBar } from "../components/layout/AppTopBar";
import { CommandPalette } from "../components/layout/CommandPalette";
import { GoogleCalendarAutoSync } from "../components/sync/GoogleCalendarAutoSync";
import { GoogleTodoAutoSync } from "../components/sync/GoogleTodoAutoSync";
import { WorkspaceAutoSync } from "../components/sync/WorkspaceAutoSync";
import { DesktopNotificationBridge } from "../components/notifications/DesktopNotificationBridge";
import { DeletedTaskToast } from "../components/tasks/DeletedTaskToast";
import { ConfirmProvider } from "../components/ui/ConfirmProvider";
import { ReminderEmailBridge } from "../components/notifications/ReminderEmailBridge";
import { useThemeStore } from "../store/themeStore";
import { useProjectStore } from "../store/projectStore";
import { useStudioStore } from "../store/studioStore";
import { isTauriRuntime } from "../integrations/desktop/runtime";
import { cleanupTrash } from "../utils/trashCleanup";

export function App() {
  const theme = useThemeStore((state) => state.theme);
  const accentColor = useThemeStore((state) => state.accentColor);
  const projects = useProjectStore((state) => state.projects);
  const noteCount = useStudioStore((state) => state.notes.length);
  const migrateLegacyProjectNotes = useStudioStore((state) => state.migrateLegacyProjectNotes);
  const location = useLocation();
  const isDesktop = isTauriRuntime();

  useEffect(() => {
    cleanupTrash();
  }, []);

  useEffect(() => {
    migrateLegacyProjectNotes(projects);
  }, [migrateLegacyProjectNotes, noteCount, projects]);

  useEffect(() => {
    document.documentElement.classList.toggle("align-desktop-root", isDesktop);
    return () => document.documentElement.classList.remove("align-desktop-root");
  }, [isDesktop]);

  return (
    <AuthGate>
      <MotionConfig reducedMotion="user">
        <div data-theme={theme} data-accent={accentColor} className={isDesktop ? "align-desktop-shell" : undefined}>
          <ConfirmProvider>
            <DesktopTitleBar />
            <div className="align-app-scroll h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
              <div className="flex h-full w-full flex-col overflow-hidden lg:flex-row">
                <AppSidebar />
                <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <AppTopBar />
                  <div className="min-h-full w-full p-3 sm:p-4 lg:p-5">
                    <motion.main
                      key={location.pathname}
                      className="mx-auto min-w-0 max-w-[2200px]"
                      initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Outlet />
                    </motion.main>
                  </div>
                </div>
                <WorkspaceAutoSync />
                <GoogleCalendarAutoSync />
                <GoogleTodoAutoSync />
                <DesktopNotificationBridge />
                <ReminderEmailBridge />
                <DeletedTaskToast />
                <AppShortcuts />
                <CommandPalette />
              </div>
            </div>
          </ConfirmProvider>
        </div>
      </MotionConfig>
    </AuthGate>
  );
}
