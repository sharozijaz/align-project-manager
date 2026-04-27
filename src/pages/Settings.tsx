import { CalendarDays, Cloud, Download, Palette, RotateCcw, Trash2, Upload, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useCalendarStore } from "../store/calendarStore";
import { useProjectStore } from "../store/projectStore";
import { useSyncStore } from "../store/syncStore";
import { useTaskStore } from "../store/taskStore";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase, supabaseConfigIssue, supabaseUrl } from "../integrations/supabase/client";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../integrations/supabase/useSupabaseSession";
import { dateLabel } from "../utils/date";
import { errorMessage } from "../utils/errors";
import { createWorkspaceBackup, downloadJson, parseWorkspaceBackup } from "../utils/storage";
import { priorityTone } from "../utils/taskVisuals";

export function Settings() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [dataMessage, setDataMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState("");
  const { session, loading: sessionLoading } = useSupabaseSession();
  const { projects, replaceProjects } = useProjectStore();
  const { tasks, restoreTask, permanentlyDeleteTask, replaceTasks } = useTaskStore();
  const { events, replaceEvents } = useCalendarStore();
  const syncState = useSyncStore();
  const deletedTasks = tasks.filter((task) => task.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

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
    if (!supabase || !email.trim()) return;

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
      setSyncMessage("Magic link sent. Open it to finish sign in.");
    } catch (error) {
      setSyncMessage(errorMessage(error, "Could not send magic link."));
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
          <p className="mt-3 text-sm text-[var(--text-muted)]">Dark workspace theme is enabled across the app.</p>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><CalendarDays size={18} /> Google Calendar</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">OAuth credentials and API calls will be added in `src/integrations/googleCalendar`.</p>
          <Button className="mt-4" variant="secondary">Connect Google Calendar</Button>
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
                  <Button onClick={() => void signIn()} disabled={syncing || sessionLoading || !email.trim()}>
                    Send Magic Link
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
