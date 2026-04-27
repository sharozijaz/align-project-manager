import { Outlet } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { WorkspaceAutoSync } from "../components/sync/WorkspaceAutoSync";
import { DeletedTaskToast } from "../components/tasks/DeletedTaskToast";

export function App() {
  return (
    <div data-theme="dark">
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="w-full p-3 sm:p-4">
          <div className="mx-auto max-w-[1440px] space-y-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-soft)] p-3 shadow-[var(--shadow-sm)]">
              <Navbar />
            </div>
          </div>
          <main className="mx-auto mt-4 min-w-0 max-w-[1440px]">
            <Outlet />
          </main>
          <WorkspaceAutoSync />
          <DeletedTaskToast />
        </div>
      </div>
    </div>
  );
}
