import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import { AuthGate } from "../components/auth/AuthGate";
import { Navbar } from "../components/layout/Navbar";
import { GoogleCalendarAutoSync } from "../components/sync/GoogleCalendarAutoSync";
import { WorkspaceAutoSync } from "../components/sync/WorkspaceAutoSync";
import { DesktopNotificationBridge } from "../components/notifications/DesktopNotificationBridge";
import { DeletedTaskToast } from "../components/tasks/DeletedTaskToast";
import { useThemeStore } from "../store/themeStore";
import { cleanupTrash } from "../utils/trashCleanup";

export function App() {
  const theme = useThemeStore((state) => state.theme);
  const location = useLocation();

  useEffect(() => {
    cleanupTrash();
  }, []);

  return (
    <AuthGate>
      <div data-theme={theme}>
        <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
          <div className="w-full overflow-x-hidden p-2 sm:p-4">
            <div className="mx-auto max-w-[1760px] space-y-4">
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-2 shadow-[var(--shadow-sm)] sm:p-3">
                <Navbar />
              </div>
            </div>
            <motion.main
              key={location.pathname}
              className="mx-auto mt-4 min-w-0 max-w-[1760px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.main>
            <WorkspaceAutoSync />
            <GoogleCalendarAutoSync />
            <DesktopNotificationBridge />
            <DeletedTaskToast />
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
