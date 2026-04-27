import { CalendarDays, Cloud, Download, Palette, RotateCcw, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useCalendarStore } from "../store/calendarStore";
import { useGoogleCalendarSyncStore } from "../store/googleCalendarSyncStore";
import { useProjectStore } from "../store/projectStore";
import { useSyncStore } from "../store/syncStore";
import { useTaskStore } from "../store/taskStore";
import { useThemeStore } from "../store/themeStore";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase, supabaseConfigIssue, supabaseUrl } from "../integrations/supabase/client";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../integrations/supabase/useSupabaseSession";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarConnection,
  getGoogleCalendarReadiness,
} from "../integrations/googleCalendar/googleCalendarClient";
import type { GoogleCalendarConnection } from "../integrations/googleCalendar/types";
import { previewGoogleCalendarSync, syncLocalTasksWithGoogleCalendar } from "../integrations/googleCalendar/sync";
import { isRateLimitMessage, useMagicLinkCooldown } from "../hooks/useMagicLinkCooldown";
import { dateLabel } from "../utils/date";
import { errorMessage } from "../utils/errors";
import { createWorkspaceBackup, downloadJson, parseWorkspaceBackup } from "../utils/storage";
import { priorityTone } from "../utils/taskVisuals";

export function Settings() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [dataMessage, setDataMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnection | null>(null);
  const [checkingGoogleConnection, setCheckingGoogleConnection] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState("");
  const magicLinkCooldown = useMagicLinkCooldown();
  const { session, loading: sessionLoading } = useSupabaseSession();
  const { projects, replaceProjects } = useProjectStore();
  const { tasks, restoreTask, permanentlyDeleteTask, replaceTasks } = useTaskStore();
  const { events, replaceEvents } = useCalendarStore();
  const syncState = useSyncStore();
  const googleSyncState = useGoogleCalendarSyncStore();
  const theme = useThemeStore((state) => state.theme);
  const googleReadiness = getGoogleCalendarReadiness();
  const googlePreview = previewGoogleCalendarSync(tasks);
  const deletedTasks = tasks.filter((task) => task.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("googleCalendar");

    if (calendarStatus === "connected") {
      setCalendarMessage("Google Calendar connected.");
      window.history.replaceState({}, "", "/settings");
    } else if (calendarStatus) {
      setCalendarMessage("Google Calendar connection did not complete.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    if (!session || !googleReadiness.ready) return;

    let cancelled = false;
    setCheckingGoogleConnection(true);

    void getGoogleCalendarConnection()
      .then((connection) => {
        if (!cancelled) setGoogleConnection(connection);
      })
      .catch((error) => {
        if (!cancelled) setCalendarMessage(errorMessage(error, "Could not check Google Calendar connection."));
      })
      .finally(() => {
        if (!cancelled) setCheckingGoogleConnection(false);
      });

    return () => {
      cancelled = true;
    };
  }, [googleReadiness.ready, session]);

  const exportData = () => {
    const backup = createWorkspaceBackup({ tasks, projects, events });
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadJson(`align-workspace-${dateStamp}.json`, backup);
    setDataMessage("Workspace backup exported.");
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;

    try {
      const backup = parseWorkspaceBackup(await file.text());
      const shouldImport = window.confirm("Importing this backup will replace current tasks, projects, and calendar events. Continue?");

      if (!shouldImport) return;

      replaceTasks(backup.tasks);
      replaceProjects(backup.projects);
      replaceEvents(backup.events);
      setDataMessage(`Imported backup from ${dateLabel(backup.exportedAt.slice(0, 10))}.`);
    } catch (error) {
      setDataMessage(errorMessage(error, "Could not import this backup."));
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  const signIn = async () => {
    if (!supabase || !email.trim() || magicLinkCooldown.isCoolingDown) return;

    setSyncing(true);
    setSyncMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;
      magicLinkCooldown.startCooldown();
      setSyncMessage("Magic link sent. Open it to finish sign in.");
    } catch (error) {
      const message = errorMessage(error, "Could not send magic link.");
      if (isRateLimitMessage(message)) {
        magicLinkCooldown.startRateLimitCooldown();
      }
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSyncMessage("Signed out.");
  };

  const uploadWorkspace = async () => {
    setSyncing(true);
    setSyncMessage("");
    syncState.setSyncState("pushing", "Uploading local workspace...");

    try {
      await pushWorkspaceToSupabase({ tasks, projects, events });
      syncState.setSynced("Local workspace uploaded to cloud.");
      setSyncMessage("Local workspace uploaded to Supabase.");
    } catch (error) {
      const message = errorMessage(error, "Could not upload workspace.");
      syncState.setSyncState("error", message);
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const downloadWorkspace = async () => {
    const shouldReplace = window.confirm("Download from Supabase and replace local tasks, projects, and events?");
    if (!shouldReplace) return;

    setSyncing(true);
    setSyncMessage("");
    syncState.setSyncState("pulling", "Downloading cloud workspace...");

    try {
      const workspace = await pullWorkspaceFromSupabase();
      replaceTasks(workspace.tasks);
      replaceProjects(workspace.projects);
      replaceEvents(workspace.events);
      syncState.setSynced("Workspace downloaded from cloud.");
      setSyncMessage("Workspace downloaded from Supabase.");
    } catch (error) {
      const message = errorMessage(error, "Could not download workspace.");
      syncState.setSyncState("error", message);
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleGoogleCalendarConnect = async () => {
    setCalendarMessage("");

    try {
      await connectGoogleCalendar();
    } catch (error) {
      setCalendarMessage(errorMessage(error, "Google Calendar is not ready yet."));
    }
  };

  const handleGoogleCalendarSync = async () => {
    setSyncingCalendar(true);
    setCalendarMessage("");

    try {
      const result = await syncLocalTasksWithGoogleCalendar(tasks);
      const localEvents = events.filter((event) => event.source !== "google");
      replaceEvents([...result.googleEvents, ...localEvents]);
      googleSyncState.recordSuccess(
        {
          created: result.created,
          updated: result.updated,
          removed: result.removed,
          importedEvents: result.importedEvents,
          conflicts: result.conflicts,
        },
        "manual",
      );
      setCalendarMessage(
        `Calendar synced. ${result.created} created, ${result.updated} updated, ${result.removed} removed, ${result.importedEvents} imported, ${result.conflicts.length} conflicts.`,
      );
    } catch (error) {
      const message = errorMessage(error, "Could not sync Google Calendar.");
      googleSyncState.recordError(message);
      setCalendarMessage(message);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleGoogleCalendarDisconnect = async () => {
    const shouldDisconnect = window.confirm("Disconnect Google Calendar from Align?");
    if (!shouldDisconnect) return;

    setSyncingCalendar(true);
    setCalendarMessage("");

    try {
      await disconnectGoogleCalendar();
      setGoogleConnection({ connected: false });
      replaceEvents(events.filter((event) => event.source !== "google"));
      googleSyncState.setStatus("idle", "Google Calendar disconnected.");
      setCalendarMessage("Google Calendar disconnected.");
    } catch (error) {
      setCalendarMessage(errorMessage(error, "Could not disconnect Google Calendar."));
    } finally {
      setSyncingCalendar(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Preferences and integration placeholders for the next version." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><UserRound size={18} /> Profile</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">User name</p>
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text)]">Sharoz</div>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><Palette size={18} /> Theme</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {theme === "dark" ? "Dark theme is active." : "Light theme is active."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ThemeToggle showLabel />
            <span className="text-sm text-[var(--text-soft)]">Saved on this device.</span>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><CalendarDays size={18} /> Google Calendar</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {googlePreview.reason}
          </p>
          <div className="mt-4 space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">OAuth config</span>
              <Badge tone={googleReadiness.ready ? "emerald" : "amber"}>{googleReadiness.ready ? "ready" : "missing"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Connection</span>
              <Badge tone={googleConnection?.connected ? "emerald" : "slate"}>
                {checkingGoogleConnection ? "checking" : googleConnection?.connected ? "connected" : "not connected"}
              </Badge>
            </div>
            <p className="text-[var(--text-soft)]">
              Scope: <span className="text-[var(--text-muted)]">{googleReadiness.config.scopes[0]}</span>
            </p>
            <p className="text-[var(--text-soft)]">
              Calendar: <span className="text-[var(--text-muted)]">{googleReadiness.config.calendarId}</span>
            </p>
            {googleReadiness.missing.length ? (
              <p className="text-[var(--warning)]">Missing {googleReadiness.missing.join(", ")}.</p>
            ) : null}
          </div>
          {googleConnection?.connected ? (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">Sync status</p>
                  <p className="text-[var(--text-muted)]">{googleSyncState.message}</p>
                </div>
                <Badge tone={googleSyncState.status === "error" ? "red" : googleSyncState.status === "syncing" ? "blue" : "emerald"}>
                  {googleSyncState.status}
                </Badge>
              </div>
              {googleSyncState.lastSyncedAt ? (
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Last synced {new Date(googleSyncState.lastSyncedAt).toLocaleString()}
                </p>
              ) : null}
              {googleSyncState.lastSummary?.conflicts.length ? (
                <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--priority-medium-bg)] bg-[var(--priority-medium-bg)] p-3 text-[var(--priority-medium-text)]">
                  <p className="font-semibold">Google edits were not overwritten</p>
                  <p className="mt-1">
                    {googleSyncState.lastSummary.conflicts.map((conflict) => conflict.taskTitle).join(", ")}
                  </p>
                </div>
              ) : null}
              {googleSyncState.history.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Recent syncs</p>
                  {googleSyncState.history.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[var(--text-muted)]">
                        {item.mode} · {item.created} created · {item.updated} updated · {item.importedEvents} imported
                      </span>
                      <span className="text-xs text-[var(--text-soft)]">{new Date(item.syncedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {googleConnection?.connected ? (
              <>
                <Button variant="secondary" onClick={() => void handleGoogleCalendarSync()} disabled={syncingCalendar}>
                  {syncingCalendar ? "Syncing..." : "Sync Calendar Now"}
                </Button>
                <Button variant="danger" onClick={() => void handleGoogleCalendarDisconnect()} disabled={syncingCalendar}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => void handleGoogleCalendarConnect()}>
                Connect Google Calendar
              </Button>
            )}
          </div>
          {calendarMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{calendarMessage}</p> : null}
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-[var(--text)]">Data</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Back up or restore tasks, projects, and local calendar events.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" icon={<Download size={16} />} onClick={exportData}>Export</Button>
            <Button variant="secondary" icon={<Upload size={16} />} onClick={() => importInputRef.current?.click()}>Import</Button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
          {dataMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{dataMessage}</p> : null}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
            <Cloud size={18} /> Supabase Sync
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Prepare multi-device sync before the subdomain is ready. LocalStorage stays active as the offline fallback.
          </p>
          {isSupabaseConfigured ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  Connected config: <span className="font-semibold text-[var(--text)]">{supabaseUrl.replace(/^https:\/\//u, "")}</span>
                  {supabaseConfigIssue ? <p className="mt-2 text-[var(--warning)]">{supabaseConfigIssue}</p> : null}
                </div>
                <Badge tone={syncState.state === "error" ? "red" : syncState.state === "synced" ? "emerald" : "blue"}>
                  {syncState.state}
                </Badge>
              </div>
              <p className="mt-3 text-[var(--text-muted)]">{syncState.message}</p>
              {syncState.lastSyncedAt ? (
                <p className="mt-1 text-xs text-[var(--text-soft)]">Last synced {new Date(syncState.lastSyncedAt).toLocaleString()}</p>
              ) : null}
            </div>
          ) : null}
          {!isSupabaseConfigured ? (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
              Supabase is not configured yet. Create a Supabase project, run `supabase/schema.sql`, then add values to `.env.local`.
              {supabaseConfigIssue ? <p className="mt-2 text-[var(--warning)]">{supabaseConfigIssue}</p> : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {session ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{session.user.email}</p>
                    <p className="text-sm text-[var(--text-muted)]">Signed in for hosted sync.</p>
                  </div>
                  <Button variant="secondary" onClick={() => void signOut()}>Sign Out</Button>
                </div>
              ) : (
                <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 md:grid-cols-[1fr_auto]">
                  <input
                    className="min-h-11 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium text-[var(--text)] placeholder:text-[var(--input-placeholder)]"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email for magic link"
                    type="email"
                  />
                  <Button onClick={() => void signIn()} disabled={syncing || sessionLoading || magicLinkCooldown.isCoolingDown || !email.trim()}>
                    {magicLinkCooldown.label}
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void uploadWorkspace()} disabled={!session || syncing}>
                  Upload Now
                </Button>
                <Button variant="secondary" onClick={() => void downloadWorkspace()} disabled={!session || syncing}>
                  Download Now
                </Button>
              </div>
              <p className="text-xs text-[var(--text-soft)]">
                After sign-in, the app downloads cloud data automatically. Local edits are saved to Supabase after a short delay.
              </p>
            </div>
          )}
          {syncMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{syncMessage}</p> : null}
        </Card>
      </div>
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
              <Trash2 size={18} /> Deleted Tasks
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Restore accidentally deleted tasks or permanently remove them from this workspace.
            </p>
          </div>
          <Badge tone={deletedTasks.length ? "red" : "slate"}>{deletedTasks.length} in bin</Badge>
        </div>
        <div className="mt-5 space-y-3">
          {deletedTasks.length ? (
            deletedTasks.map((task) => {
              const project = projects.find((item) => item.id === task.projectId);

              return (
                <div
                  key={task.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{task.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                      <Badge>{project?.name ?? task.category}</Badge>
                      <Badge>{dateLabel(task.dueDate)}</Badge>
                      <Badge tone="red">Deleted {task.deletedAt ? dateLabel(task.deletedAt.slice(0, 10)) : ""}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => restoreTask(task.id)}>
                      Restore
                    </Button>
                    <Button
                      variant="danger"
                      icon={<Trash2 size={16} />}
                      onClick={() => {
                        if (window.confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
                          permanentlyDeleteTask(task.id);
                        }
                      }}
                    >
                      Delete Forever
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center text-sm text-[var(--text-muted)]">
              No deleted tasks. When you delete a task, it will appear here for recovery.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
