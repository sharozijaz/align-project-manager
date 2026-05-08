import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import { AuthGate } from "../components/auth/AuthGate";
import { DesktopTitleBar } from "../components/desktop/DesktopTitleBar";
import { AppShortcuts } from "../components/layout/AppShortcuts";
import { AppSidebar } from "../components/layout/AppSidebar";
import { GoogleCalendarAutoSync } from "../components/sync/GoogleCalendarAutoSync";
import { GoogleTasksBridgeAutoSync } from "../components/sync/GoogleTasksBridgeAutoSync";
import { WorkspaceAutoSync } from "../components/sync/WorkspaceAutoSync";
import { DesktopNotificationBridge } from "../components/notifications/DesktopNotificationBridge";
import { DeletedTaskToast } from "../components/tasks/DeletedTaskToast";
import { useThemeStore } from "../store/themeStore";
import { isTauriRuntime } from "../integrations/desktop/runtime";
import { cleanupTrash } from "../utils/trashCleanup";

export function App() {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();
  const isDesktop = isTauriRuntime();

  useEffect(() => {
    cleanupTrash();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("align-desktop-root", isDesktop);
    return () => document.documentElement.classList.remove("align-desktop-root");
  }, [isDesktop]);

  return (
    <AuthGate>
      <div data-theme={theme} className={isDesktop ? "align-desktop-shell" : undefined}>
        <DesktopTitleBar />
        <div className="align-app-scroll h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
          <div className="flex h-full w-full flex-col overflow-hidden lg:flex-row">
            <AppSidebar />
            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="min-h-full w-full p-3 sm:p-4 lg:p-5">
                <motion.main
                  key={location.pathname}
                  className="mx-auto min-w-0 max-w-[1760px]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.main>
              </div>
            </div>
            <WorkspaceAutoSync />
            <GoogleCalendarAutoSync />
            <GoogleTasksBridgeAutoSync />
            <DesktopNotificationBridge />
            <DeletedTaskToast />
            <AppShortcuts />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
