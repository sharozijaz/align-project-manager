import { BellRing, CalendarDays, Cloud, Download, ImageIcon, ListTodo, Mail, Palette, RefreshCw, Smartphone, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useCalendarStore } from "../store/calendarStore";
import { useGoogleCalendarSyncStore } from "../store/googleCalendarSyncStore";
import { useProjectStore } from "../store/projectStore";
import { useSyncStore } from "../store/syncStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import { themeOptions, useThemeStore } from "../store/themeStore";
import { getHeroOption, heroOptions, useHeroStore } from "../store/heroStore";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase, supabaseConfigIssue, supabaseUrl } from "../integrations/supabase/client";
import { getUserPreferences, saveUserPreferences } from "../integrations/supabase/preferences";
import {
  canUseDesktopNotifications,
  getDesktopReminderHeartbeat,
  getDesktopNotificationsEnabled,
  requestDesktopNotificationPermission,
  sendDesktopNotification,
  setDesktopNotificationsEnabled,
  type DesktopReminderHeartbeat,
} from "../integrations/desktop/notifications";
import { canUseDesktopAutostart, getDesktopAutostartEnabled, setDesktopAutostartEnabled } from "../integrations/desktop/autostart";
import { pullWorkspaceFromSupabase, pushWorkspaceToSupabase } from "../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../integrations/supabase/useSupabaseSession";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarReadiness,
} from "../integrations/googleCalendar/googleCalendarClient";
import type { GoogleCalendarConnection } from "../integrations/googleCalendar/types";
import { previewGoogleCalendarSync } from "../integrations/googleCalendar/sync";
import { clearGoogleSyncStatusCache, getGoogleSyncStatus, saveGoogleSyncSettings, syncGoogleWorkspace } from "../integrations/googleSync/googleSyncClient";
import { getGoogleTodoSyncReadiness } from "../integrations/googleTasks/googleTasksClient";
import type { GoogleTodoSyncSettings, GoogleTodoSyncStatus } from "../integrations/googleTasks/types";
import { isRateLimitMessage, useMagicLinkCooldown } from "../hooks/useMagicLinkCooldown";
import { plainDateLabel } from "../utils/date";
import { errorMessage } from "../utils/errors";
import { createWorkspaceBackup, downloadJson, parseWorkspaceBackup } from "../utils/storage";
import { appBuild, appVersion } from "../utils/appVersion";
import {
  AUTO_CLEANUP_DELETED_PROJECTS_KEY,
  AUTO_CLEANUP_DELETED_TASKS_KEY,
  getTrashCleanupPreference,
  setTrashCleanupPreference,
  TRASH_PROJECT_RETENTION_DAYS,
  TRASH_TASK_RETENTION_DAYS,
} from "../utils/trash";

type SettingsSection = "account" | "appearance" | "google" | "notifications" | "data";

export function Settings() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [dataMessage, setDataMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnection | null>(null);
  const [checkingGoogleConnection, setCheckingGoogleConnection] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [googleTasksMessage, setGoogleTasksMessage] = useState("");
  const [googleTasksStatus, setGoogleTasksStatus] = useState<GoogleTodoSyncStatus | null>(null);
  const [googleTasksSettings, setGoogleTasksSettings] = useState<GoogleTodoSyncSettings>({
    enabled: false,
    todoListId: "",
  });
  const [checkingGoogleTasks, setCheckingGoogleTasks] = useState(false);
  const [savingGoogleTasks, setSavingGoogleTasks] = useState(false);
  const [syncingGoogleTasks, setSyncingGoogleTasks] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [email, setEmail] = useState("");
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabledState] = useState(false);
  const [desktopAutostartEnabled, setDesktopAutostartEnabledState] = useState(false);
  const [autoCleanTasks, setAutoCleanTasks] = useState(() => getTrashCleanupPreference(AUTO_CLEANUP_DELETED_TASKS_KEY));
  const [autoCleanProjects, setAutoCleanProjects] = useState(() => getTrashCleanupPreference(AUTO_CLEANUP_DELETED_PROJECTS_KEY));
  const [desktopNotificationMessage, setDesktopNotificationMessage] = useState("");
  const [desktopReminderHeartbeat, setDesktopReminderHeartbeatState] = useState<DesktopReminderHeartbeat | null>(null);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const magicLinkCooldown = useMagicLinkCooldown();
  const { session, loading: sessionLoading } = useSupabaseSession();
  const { projects, replaceProjects } = useProjectStore();
  const { tasks, replaceTasks, upsertTasks } = useTaskStore();
  const { events, replaceEvents } = useCalendarStore();
  const { resources, notes, replaceResources, replaceNotes } = useStudioStore();
  const syncState = useSyncStore();
  const googleSyncState = useGoogleCalendarSyncStore();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const activeTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const heroImage = useHeroStore((state) => state.heroImage);
  const setHeroImage = useHeroStore((state) => state.setHeroImage);
  const activeHero = getHeroOption(heroImage);
  const googleReadiness = getGoogleCalendarReadiness();
  const googleTasksReadiness = getGoogleTodoSyncReadiness();
  const googlePreview = previewGoogleCalendarSync(tasks);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("google");
  const settingsSections: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: "account", label: "Account", description: "Profile and sign-in" },
    { id: "appearance", label: "Appearance", description: "Theme and dashboard image" },
    { id: "google", label: "Google Sync", description: "Calendar and Todo sync" },
    { id: "notifications", label: "Notifications", description: "Email and desktop reminders" },
    { id: "data", label: "Data", description: "Backup, cloud sync, and cleanup" },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("googleCalendar");

    if (calendarStatus === "connected") {
      clearGoogleSyncStatusCache();
      setCalendarMessage("Google Calendar connected.");
      setGoogleTasksMessage("Google account connected. You can enable Todo sync below.");
      window.history.replaceState({}, "", "/settings");
    } else if (calendarStatus) {
      setCalendarMessage("Google Calendar connection did not complete.");
      setGoogleTasksMessage("Google account connection did not complete.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    if (!session || !googleReadiness.ready || !googleTasksReadiness.ready) return;

    let cancelled = false;
    setCheckingGoogleConnection(true);
    setCheckingGoogleTasks(true);

    void getGoogleSyncStatus({ includeLists: true, maxAgeMs: 5 * 60_000 })
      .then((status) => {
        if (cancelled) return;
        setGoogleConnection(status.calendar);
        setGoogleTasksStatus(status.todos);
        setGoogleTasksSettings(status.todos.settings);
        if (status.todos.needsReconnect) {
          setGoogleTasksMessage("Reconnect Google so Align can use the Tasks scope.");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = errorMessage(error, "Could not check Google sync.");
          setCalendarMessage(message);
          setGoogleTasksMessage(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingGoogleConnection(false);
          setCheckingGoogleTasks(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleReadiness.ready, googleTasksReadiness.ready, session]);

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;

    let cancelled = false;
    void getUserPreferences()
      .then((preferences) => {
        if (!cancelled) setEmailRemindersEnabled(preferences.emailRemindersEnabled);
      })
      .catch((error) => {
        if (!cancelled) setPreferenceMessage(errorMessage(error, "Could not load reminder preferences."));
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    setDesktopNotificationsEnabledState(getDesktopNotificationsEnabled());
    setDesktopReminderHeartbeatState(getDesktopReminderHeartbeat());
    if (canUseDesktopAutostart()) {
      void getDesktopAutostartEnabled()
        .then(setDesktopAutostartEnabledState)
        .catch(() => setDesktopAutostartEnabledState(false));
    }
  }, []);

  useEffect(() => {
    const updateHeartbeat = () => setDesktopReminderHeartbeatState(getDesktopReminderHeartbeat());

    window.addEventListener("align:desktop-reminder-heartbeat", updateHeartbeat);
    window.addEventListener("storage", updateHeartbeat);
    return () => {
      window.removeEventListener("align:desktop-reminder-heartbeat", updateHeartbeat);
      window.removeEventListener("storage", updateHeartbeat);
    };
  }, []);

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
      setDataMessage(`Imported backup from ${plainDateLabel(backup.exportedAt.slice(0, 10))}.`);
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
      await pushWorkspaceToSupabase({ tasks, projects, events, resources, notes });
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
      replaceResources(workspace.resources);
      replaceNotes(workspace.notes);
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
    clearGoogleSyncStatusCache();

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
      const syncResult = await syncGoogleWorkspace({ tasks, calendar: true });
      const result = syncResult.calendar;
      if (!result) throw new Error("Google Calendar sync did not return a result.");
      const localEvents = events.filter((event) => event.source !== "google");
      replaceEvents([...result.events, ...localEvents]);
      googleSyncState.recordSuccess(
        {
          created: result.created,
          updated: result.updated,
          removed: result.removed,
          importedEvents: result.events.length,
          conflicts: result.conflicts,
        },
        "manual",
      );
      setCalendarMessage(
        `Calendar synced. ${result.created} created, ${result.updated} updated, ${result.removed} removed, ${result.events.length} imported, ${result.conflicts.length} conflicts.`,
      );
    } catch (error) {
      const message = errorMessage(error, "Could not sync Google Calendar.");
      googleSyncState.recordError(message);
      setCalendarMessage(message);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleGoogleCalendarOverwriteConflicts = async () => {
    const forceTaskIds = googleSyncState.lastSummary?.conflicts.map((conflict) => conflict.taskId) ?? [];
    if (!forceTaskIds.length) return;

    const shouldOverwrite = window.confirm("Overwrite the conflicting Google Calendar events with Align task details?");
    if (!shouldOverwrite) return;

    setSyncingCalendar(true);
    setCalendarMessage("");

    try {
      const syncResult = await syncGoogleWorkspace({ tasks, calendar: true, forceTaskIds });
      const result = syncResult.calendar;
      if (!result) throw new Error("Google Calendar sync did not return a result.");
      const localEvents = events.filter((event) => event.source !== "google");
      replaceEvents([...result.events, ...localEvents]);
      googleSyncState.recordSuccess(
        {
          created: result.created,
          updated: result.updated,
          removed: result.removed,
          importedEvents: result.events.length,
          conflicts: result.conflicts,
        },
        "manual",
      );
      setCalendarMessage(
        `Conflicts overwritten. ${result.created} created, ${result.updated} updated, ${result.removed} removed, ${result.events.length} imported.`,
      );
    } catch (error) {
      const message = errorMessage(error, "Could not overwrite Google Calendar conflicts.");
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
      clearGoogleSyncStatusCache();
      setGoogleConnection({ connected: false });
      setGoogleTasksStatus(null);
      setGoogleTasksSettings({ enabled: false, todoListId: "" });
      replaceEvents(events.filter((event) => event.source !== "google"));
      googleSyncState.setStatus("idle", "Google Calendar disconnected.");
      setCalendarMessage("Google Calendar disconnected.");
    } catch (error) {
      setCalendarMessage(errorMessage(error, "Could not disconnect Google Calendar."));
    } finally {
      setSyncingCalendar(false);
    }
  };

  const refreshGoogleTodoSyncStatus = async () => {
    setCheckingGoogleConnection(true);
    setCheckingGoogleTasks(true);
    setGoogleTasksMessage("");

    try {
      clearGoogleSyncStatusCache();
      const status = await getGoogleSyncStatus({ includeLists: true });
      setGoogleConnection(status.calendar);
      setGoogleTasksStatus(status.todos);
      setGoogleTasksSettings(status.todos.settings);
      if (status.todos.needsReconnect) {
        setGoogleTasksMessage("Reconnect Google so Align can use the Tasks scope.");
      }
    } catch (error) {
      setGoogleTasksMessage(errorMessage(error, "Could not check Google sync."));
    } finally {
      setCheckingGoogleConnection(false);
      setCheckingGoogleTasks(false);
    }
  };

  const handleGoogleTasksSettingsSave = async (settings = googleTasksSettings) => {
    setSavingGoogleTasks(true);
    setGoogleTasksMessage("");

    try {
      const savedSettings = await saveGoogleSyncSettings(settings);
      setGoogleTasksSettings(savedSettings);
      setGoogleTasksStatus((current) => (current ? { ...current, settings: savedSettings } : current));
      setGoogleTasksMessage(savedSettings.enabled ? "Google Todo sync enabled." : "Google Todo sync paused.");
    } catch (error) {
      setGoogleTasksMessage(errorMessage(error, "Could not save Google Todo sync settings."));
    } finally {
      setSavingGoogleTasks(false);
    }
  };

  const handleGoogleTasksEnabledChange = async (enabled: boolean) => {
    const nextSettings = { ...googleTasksSettings, enabled };
    setGoogleTasksSettings(nextSettings);
    await handleGoogleTasksSettingsSave(nextSettings);
  };

  const handleGoogleTasksSync = async () => {
    setSyncingGoogleTasks(true);
    setGoogleTasksMessage("");

    try {
      const syncResult = await syncGoogleWorkspace({
        tasks,
        settings: googleTasksSettings,
        todos: true,
      });
      const result = syncResult.todos;
      if (!result) throw new Error("Google Todo sync did not return a result.");

      setGoogleTasksSettings(result.settings);
      setGoogleTasksStatus((current) =>
        current
          ? {
              ...current,
              lists: result.lists,
              settings: result.settings,
            }
          : current,
      );
      if (result.changedTasks.length) {
        upsertTasks(result.changedTasks);
      }
      setGoogleTasksMessage(
        `Google Todos synced. ${result.created} created, ${result.updated} updated, ${result.removed} removed, ${result.imported} imported.`,
      );
    } catch (error) {
      setGoogleTasksMessage(errorMessage(error, "Could not sync Google Todos."));
    } finally {
      setSyncingGoogleTasks(false);
    }
  };

  const updateEmailReminderPreference = async (enabled: boolean) => {
    setEmailRemindersEnabled(enabled);
    setPreferenceMessage("");

    try {
      await saveUserPreferences({ emailRemindersEnabled: enabled });
      setPreferenceMessage(enabled ? "Email reminders enabled." : "Email reminders paused.");
    } catch (error) {
      setEmailRemindersEnabled(!enabled);
      setPreferenceMessage(errorMessage(error, "Could not save reminder preference."));
    }
  };

  const updateDesktopNotificationPreference = async (enabled: boolean) => {
    setDesktopNotificationMessage("");

    if (enabled) {
      const permissionGranted = await requestDesktopNotificationPermission();
      if (!permissionGranted) {
        setDesktopNotificationMessage("Windows notification permission was not granted.");
        return;
      }
    }

    setDesktopNotificationsEnabled(enabled);
    setDesktopNotificationsEnabledState(enabled);
    setDesktopReminderHeartbeatState(getDesktopReminderHeartbeat());
    setDesktopNotificationMessage(enabled ? "Desktop notifications enabled on this PC." : "Desktop notifications paused on this PC.");
  };

  const sendTestDesktopNotification = async () => {
    setDesktopNotificationMessage("");
    const sent = await sendDesktopNotification("Align test notification", "Desktop reminders are working on this PC.");
    setDesktopNotificationMessage(sent ? "Test notification sent." : "Could not send test notification. Check Windows notification permissions.");
  };

  const updateDesktopAutostartPreference = async (enabled: boolean) => {
    setDesktopNotificationMessage("");

    try {
      const saved = await setDesktopAutostartEnabled(enabled);
      if (!saved) {
        setDesktopNotificationMessage("Startup reminders are available in the installed desktop app.");
        return;
      }

      setDesktopAutostartEnabledState(enabled);
      setDesktopNotificationMessage(
        enabled
          ? "Align will start with Windows in the tray so desktop reminders can run after login."
          : "Align will no longer start with Windows.",
      );
    } catch (error) {
      setDesktopNotificationMessage(errorMessage(error, "Could not update Windows startup preference."));
    }
  };

  const updateTrashCleanupPreference = (
    key: string,
    enabled: boolean,
    setter: (value: boolean) => void,
  ) => {
    setTrashCleanupPreference(key, enabled);
    setter(enabled);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Organized controls for your workspace, sync, notifications, and app appearance." />
      <Card className="p-2">
        <div className="grid gap-2 md:grid-cols-5">
          {settingsSections.map((section) => {
            const isActive = section.id === settingsSection;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setSettingsSection(section.id)}
                className={`rounded-[var(--radius-md)] border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)] shadow-[var(--shadow-focus)]"
                    : "border-transparent bg-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                }`}
              >
                <span className="block text-sm font-bold">{section.label}</span>
                <span className="mt-1 block text-xs text-[var(--text-soft)]">{section.description}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {settingsSection === "account" ? (
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><UserRound size={18} /> Profile</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">User name</p>
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text)]">Sharoz</div>
        </Card>
        ) : null}
        {settingsSection === "appearance" ? (
        <>
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><Palette size={18} /> Theme</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {activeTheme.label} is active.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const isActive = option.value === theme;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`rounded-[var(--radius-md)] border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)] shadow-[var(--shadow-focus)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs text-[var(--text-soft)]">{option.description}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ThemeToggle showLabel />
            <span className="text-sm text-[var(--text-soft)]">Saved on this device.</span>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
                <ImageIcon size={18} /> Dashboard Image
              </h2>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                {activeHero.label} is active on the home dashboard.
              </p>
            </div>
            <Badge tone="slate">Saved on this device</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {heroOptions.map((option) => {
              const isActive = option.value === heroImage;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setHeroImage(option.value)}
                  className={`group rounded-[var(--radius-md)] border p-2 text-left transition active:scale-[0.99] ${
                    isActive
                      ? "border-[var(--brand-primary)] bg-[var(--brand-50)] text-[var(--text)] shadow-[var(--shadow-focus)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="relative block aspect-[3/1] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]">
                    <img
                      src={option.src}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-r from-[#050817]/35 via-transparent to-[#050817]/35" />
                    {isActive ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[var(--surface)] px-2 py-1 text-[11px] font-bold text-[var(--text)] shadow-[var(--shadow-soft)]">
                        Selected
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs text-[var(--text-soft)]">{option.description}</span>
                </button>
              );
            })}
          </div>
        </Card>
        </>
        ) : null}
        {settingsSection === "google" ? (
        <>
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><CalendarDays size={18} /> Google Calendar</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {googlePreview.reason}
          </p>
          <div className="mt-4 space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm sm:p-4">
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
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm sm:p-4">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={googleSyncState.clearConflicts}>
                      Keep Google
                    </Button>
                    <Button onClick={() => void handleGoogleCalendarOverwriteConflicts()} disabled={syncingCalendar}>
                      Overwrite with Align
                    </Button>
                  </div>
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
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><Smartphone size={18} /> Google Todo Sync</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Sync your Align Todos with one Google Tasks list for phone widgets and quick capture.
          </p>
          <div className="mt-4 space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Google account</span>
              <Badge tone={googleTasksStatus?.connected ? "emerald" : "slate"}>
                {checkingGoogleTasks ? "checking" : googleTasksStatus?.connected ? "connected" : "not connected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Tasks scope</span>
              <Badge tone={googleTasksStatus?.needsReconnect ? "amber" : googleTasksStatus?.connected ? "emerald" : "slate"}>
                {googleTasksStatus?.needsReconnect ? "reconnect needed" : googleTasksStatus?.connected ? "ready" : "not connected"}
              </Badge>
            </div>
            <p className="text-[var(--text-soft)]">
              Scope: <span className="text-[var(--text-muted)]">{googleTasksReadiness.scope}</span>
            </p>
            <p className="text-[var(--text-soft)]">
              Project tasks stay in Align. Google Tasks only creates and updates personal Todos.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <p className="font-semibold text-[var(--text)]">Enable Todo sync</p>
                <p className="text-sm text-[var(--text-muted)]">Runs automatically while Align is open. Sync Now still works when you want an immediate refresh.</p>
              </div>
              <Button
                variant={googleTasksSettings.enabled ? "secondary" : "ghost"}
                onClick={() => void handleGoogleTasksEnabledChange(!googleTasksSettings.enabled)}
                disabled={!session || !googleTasksStatus?.connected || googleTasksStatus.needsReconnect || savingGoogleTasks}
              >
                {googleTasksSettings.enabled ? "Enabled" : "Paused"}
              </Button>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-[var(--text)]">
                <span className="flex items-center gap-2"><ListTodo size={16} /> Google Todo list</span>
                <select
                  className="min-h-11 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-sm font-medium text-[var(--text)]"
                  value={googleTasksSettings.todoListId}
                  onChange={(event) => setGoogleTasksSettings((current) => ({ ...current, todoListId: event.target.value }))}
                  disabled={!googleTasksStatus?.connected || googleTasksStatus.needsReconnect}
                >
                  <option value="">Auto-create Align Todos</option>
                  {(googleTasksStatus?.lists ?? []).map((list) => (
                    <option key={list.id} value={list.id}>{list.title}</option>
                  ))}
                </select>
              </label>
            </div>
            {googleTasksSettings.lastSyncedAt ? (
              <p className="text-xs text-[var(--text-soft)]">Last synced {new Date(googleTasksSettings.lastSyncedAt).toLocaleString()}</p>
            ) : null}
            {googleTasksSettings.lastError ? (
              <p className="text-sm text-[var(--danger)]">{googleTasksSettings.lastError}</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!googleTasksStatus?.connected || googleTasksStatus.needsReconnect ? (
              <Button variant="secondary" onClick={() => void handleGoogleCalendarConnect()}>
                {googleTasksStatus?.needsReconnect ? "Reconnect Google" : "Connect Google"}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} />}
              onClick={() => void refreshGoogleTodoSyncStatus()}
              disabled={!session || checkingGoogleTasks}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleGoogleTasksSettingsSave()}
              disabled={!session || !googleTasksStatus?.connected || googleTasksStatus.needsReconnect || savingGoogleTasks}
            >
              {savingGoogleTasks ? "Saving..." : "Save Sync"}
            </Button>
            <Button
              onClick={() => void handleGoogleTasksSync()}
              disabled={!session || !googleTasksSettings.enabled || !googleTasksStatus?.connected || googleTasksStatus.needsReconnect || syncingGoogleTasks}
            >
              {syncingGoogleTasks ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
          {googleTasksMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{googleTasksMessage}</p> : null}
        </Card>
        </>
        ) : null}
        {settingsSection === "data" ? (
        <Card className="p-4 sm:p-5">
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
        ) : null}
        {settingsSection === "notifications" ? (
        <>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><Mail size={18} /> Reminder Email</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Email reminders use the same due reminder rules as the notification bell. The template is branded for Align and links back to your workspace.
          </p>
          <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="font-semibold text-[var(--text)]">Send reminder emails</p>
              <p className="text-sm text-[var(--text-muted)]">
                {session ? "Saved to Supabase for cron delivery." : "Sign in to save email delivery preferences."}
              </p>
            </div>
            <Button
              variant={emailRemindersEnabled ? "secondary" : "ghost"}
              onClick={() => void updateEmailReminderPreference(!emailRemindersEnabled)}
              disabled={!session}
            >
              {emailRemindersEnabled ? "Enabled" : "Paused"}
            </Button>
          </div>
          {preferenceMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{preferenceMessage}</p> : null}
        </Card>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><BellRing size={18} /> Desktop Notifications</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Windows toast notifications mirror the same reminder bell items while the desktop app is open.
          </p>
          <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="font-semibold text-[var(--text)]">Show Windows reminders</p>
              <p className="text-sm text-[var(--text-muted)]">
                {canUseDesktopNotifications() ? "Saved on this device." : "Available in the installed desktop app."}
              </p>
            </div>
            <Button
              variant={desktopNotificationsEnabled ? "secondary" : "ghost"}
              onClick={() => void updateDesktopNotificationPreference(!desktopNotificationsEnabled)}
              disabled={!canUseDesktopNotifications()}
            >
              {desktopNotificationsEnabled ? "Enabled" : "Paused"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => void sendTestDesktopNotification()}
              disabled={!canUseDesktopNotifications() || !desktopNotificationsEnabled}
            >
              Send test
            </Button>
          </div>
          <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--text)]">Reminder check</p>
                <p className="text-[var(--text-muted)]">
                  {desktopReminderHeartbeat?.message ?? (canUseDesktopNotifications() ? "Waiting for the next reminder check." : "Desktop checks run inside the installed app.")}
                </p>
              </div>
              <Badge tone={desktopReminderHeartbeatTone(desktopReminderHeartbeat)}>
                {desktopReminderHeartbeat?.status ?? (canUseDesktopNotifications() ? "waiting" : "unavailable")}
              </Badge>
            </div>
            {desktopReminderHeartbeat?.checkedAt ? (
              <p className="mt-2 text-xs text-[var(--text-soft)]">
                Last checked {new Date(desktopReminderHeartbeat.checkedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="font-semibold text-[var(--text)]">Start with Windows</p>
              <p className="text-sm text-[var(--text-muted)]">
                {canUseDesktopAutostart()
                  ? "Launches Align hidden to tray after login so reminder checks keep running."
                  : "Available in the installed desktop app."}
              </p>
            </div>
            <Button
              variant={desktopAutostartEnabled ? "secondary" : "ghost"}
              onClick={() => void updateDesktopAutostartPreference(!desktopAutostartEnabled)}
              disabled={!canUseDesktopAutostart()}
            >
              {desktopAutostartEnabled ? "Enabled" : "Paused"}
            </Button>
          </div>
          {desktopNotificationMessage ? <p className="mt-3 text-sm text-[var(--text-muted)]">{desktopNotificationMessage}</p> : null}
        </Card>
        </>
        ) : null}
        {settingsSection === "data" ? (
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
            <Cloud size={18} /> Supabase Sync
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Prepare multi-device sync before the subdomain is ready. LocalStorage stays active as the offline fallback.
          </p>
          {isSupabaseConfigured ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)] sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  Connected config: <span className="break-all font-semibold text-[var(--text)]">{supabaseUrl.replace(/^https:\/\//u, "")}</span>
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
            <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)] sm:p-4">
              Supabase is not configured yet. Create a Supabase project, run `supabase/schema.sql`, then add values to `.env.local`.
              {supabaseConfigIssue ? <p className="mt-2 text-[var(--warning)]">{supabaseConfigIssue}</p> : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {session ? (
                <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-[var(--text)]">{session.user.email}</p>
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
        ) : null}
      </div>
      {settingsSection === "data" ? (
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
              <Trash2 size={18} /> Data Cleanup Settings
            </h2>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Trash keeps deleted projects and tasks recoverable before permanent cleanup.
            </p>
          </div>
          <Link
            to="/trash"
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
          >
            Open Trash
          </Link>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <CleanupToggle
            label={`Auto-delete deleted tasks after ${TRASH_TASK_RETENTION_DAYS} days`}
            description="Keeps accidental task deletes recoverable for a month."
            enabled={autoCleanTasks}
            onToggle={(enabled) => updateTrashCleanupPreference(AUTO_CLEANUP_DELETED_TASKS_KEY, enabled, setAutoCleanTasks)}
          />
          <CleanupToggle
            label={`Auto-delete deleted projects after ${TRASH_PROJECT_RETENTION_DAYS} days`}
            description="Projects stay in Trash longer because they carry more context."
            enabled={autoCleanProjects}
            onToggle={(enabled) => updateTrashCleanupPreference(AUTO_CLEANUP_DELETED_PROJECTS_KEY, enabled, setAutoCleanProjects)}
          />
        </div>
      </Card>
      ) : null}
      <p className="pb-2 text-center text-xs text-[var(--text-soft)]">
        Align v{appVersion} · Build {appBuild}
      </p>
    </div>
  );
}

function desktopReminderHeartbeatTone(heartbeat: DesktopReminderHeartbeat | null) {
  if (!heartbeat) return "slate";
  if (heartbeat.status === "sent") return "emerald";
  if (heartbeat.status === "error") return "red";
  if (heartbeat.status === "disabled") return "amber";
  return "blue";
}

function CleanupToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[var(--text)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <Button variant={enabled ? "secondary" : "ghost"} onClick={() => onToggle(!enabled)}>
        {enabled ? "Enabled" : "Paused"}
      </Button>
    </div>
  );
}
