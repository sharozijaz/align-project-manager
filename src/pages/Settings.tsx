import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Cloud,
  DatabaseBackup,
  Download,
  HardDrive,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useConfirm } from "../components/ui/ConfirmProvider";
import { AccentColorPicker, ThemeToggle } from "../components/ui/ThemeToggle";
import { useCalendarStore } from "../store/calendarStore";
import { useGoogleCalendarSyncStore } from "../store/googleCalendarSyncStore";
import { useProjectStore } from "../store/projectStore";
import { syncModeOptions, useSyncStore } from "../store/syncStore";
import { useStudioStore } from "../store/studioStore";
import { useTaskStore } from "../store/taskStore";
import { accentOptions, themeOptions, useThemeStore } from "../store/themeStore";
import { canUseMagicLinkAuth, getAuthRedirectUrl, isSupabaseConfigured, supabase, supabaseConfigIssue, supabaseUrl } from "../integrations/supabase/client";
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
import { clearWorkspaceInSupabase, pullWorkspaceFromSupabase, pushWorkspaceToSupabase, syncTasksWithSupabase } from "../integrations/supabase/workspaceSync";
import { useSupabaseSession } from "../integrations/supabase/useSupabaseSession";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarReadiness,
} from "../integrations/googleCalendar/googleCalendarClient";
import type { GoogleCalendarConnection } from "../integrations/googleCalendar/types";
import { previewGoogleCalendarSync } from "../integrations/googleCalendar/sync";
import { clearGoogleSyncStatusCache, getGoogleSyncStatus, syncGoogleWorkspace } from "../integrations/googleSync/googleSyncClient";
import { isRateLimitMessage, useMagicLinkCooldown } from "../hooks/useMagicLinkCooldown";
import { plainDateLabel } from "../utils/date";
import { errorMessage } from "../utils/errors";
import { createWorkspaceBackup, downloadJson, parseWorkspaceBackup, saveWorkspaceSafetyBackup } from "../utils/storage";
import { getWorkspaceOwnerId, setWorkspaceOwnerId } from "../utils/workspaceIdentity";
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

const LAST_WORKSPACE_EXPORT_KEY = "align-last-workspace-export-v2";
const IMPORT_SAFETY_BACKUP_KEY = "align-import-safety-backup-v2";

const hasWorkspaceData = (workspace: { tasks: unknown[]; projects: unknown[]; events: unknown[]; resources: unknown[]; notes: unknown[]; noteSpaces?: unknown[] }) =>
  workspace.tasks.length > 0 || workspace.projects.length > 0 || workspace.events.length > 0 || workspace.resources.length > 0 || workspace.notes.length > 0 || Boolean(workspace.noteSpaces?.length);

function getSessionDisplayName(session: ReturnType<typeof useSupabaseSession>["session"]) {
  const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
  const metadataName = [metadata?.full_name, metadata?.name, metadata?.user_name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim();

  return metadataName || session?.user.email?.split("@")[0] || "Local user";
}

export function Settings() {
  const confirm = useConfirm();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [dataMessage, setDataMessage] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [googleConnection, setGoogleConnection] = useState<GoogleCalendarConnection | null>(null);
  const [checkingGoogleConnection, setCheckingGoogleConnection] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
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
  const [showCloudResetControls, setShowCloudResetControls] = useState(false);
  const [lastWorkspaceExport, setLastWorkspaceExport] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(LAST_WORKSPACE_EXPORT_KEY) ?? "",
  );
  const magicLinkCooldown = useMagicLinkCooldown();
  const { session, loading: sessionLoading } = useSupabaseSession();
  const profileDisplayName = getSessionDisplayName(session);
  const { projects, replaceProjects } = useProjectStore();
  const { tasks, replaceTasks } = useTaskStore();
  const { events, replaceEvents } = useCalendarStore();
  const { resources, notes, noteSpaces, replaceResources, replaceNotes, replaceNoteSpaces } = useStudioStore();
  const syncState = useSyncStore();
  const syncMode = syncState.mode;
  const googleSyncState = useGoogleCalendarSyncStore();
  const theme = useThemeStore((state) => state.theme);
  const accentColor = useThemeStore((state) => state.accentColor);
  const setTheme = useThemeStore((state) => state.setTheme);
  const setAccentColor = useThemeStore((state) => state.setAccentColor);
  const activeTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const googleReadiness = getGoogleCalendarReadiness();
  const googlePreview = previewGoogleCalendarSync(tasks);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("google");
  const workspaceMode = syncMode === "local"
    ? {
        label: "Local only",
        tone: "slate" as const,
        title: "Your data is stored on this device.",
        description: "Cloud upload and download are disabled. Backups and local storage continue to work.",
      }
    : syncMode === "paused"
      ? {
          label: "Sync paused",
          tone: "amber" as const,
          title: "Cloud sync paused",
          description: "Automatic Supabase sync is paused. Manual upload and download remain available.",
        }
      : !isSupabaseConfigured
        ? {
            label: "Local only",
            tone: "slate" as const,
            title: "Your data is stored on this device.",
            description: "Cloud sync is optional. Backups and local storage continue to work without Supabase.",
          }
    : !session
      ? {
          label: "Local, signed out",
          tone: "amber" as const,
          title: "Local workspace",
          description: "Supabase is configured, but this device is using local data until you sign in.",
        }
      : syncState.state === "error"
        ? {
            label: "Sync issue",
            tone: "red" as const,
            title: "Cloud connected with an error",
            description: syncState.message,
          }
        : {
            label: syncState.state === "synced" ? "Cloud synced" : syncState.state === "idle" ? "Cloud connected" : "Syncing",
            tone: syncState.state === "synced" ? ("emerald" as const) : ("blue" as const),
            title: "Cloud workspace",
            description: syncState.message,
          };
  const allSettingsSections: Array<{ id: SettingsSection; label: string; description: string }> = [
    { id: "account", label: "Account", description: "Profile and sign-in" },
    { id: "appearance", label: "Appearance", description: "Theme and accent color" },
    { id: "google", label: "Calendar Sync", description: "Google Calendar only" },
    { id: "notifications", label: "Notifications", description: "Email and desktop reminders" },
    { id: "data", label: "Data", description: "Backup, cloud sync, and cleanup" },
  ];
  const settingsSections = allSettingsSections;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("googleCalendar");

    if (calendarStatus === "connected") {
      clearGoogleSyncStatusCache();
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

    void getGoogleSyncStatus({ maxAgeMs: 5 * 60_000 })
      .then((status) => {
        if (cancelled) return;
        setGoogleConnection(status.calendar);
      })
      .catch((error) => {
        if (!cancelled) {
          const message = errorMessage(error, "Could not check Google sync.");
          setCalendarMessage(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingGoogleConnection(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleReadiness.ready, session]);

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

  const buildWorkspaceBackup = () =>
    createWorkspaceBackup({
      tasks,
      projects,
      events,
      resources,
      notes,
      noteSpaces,
      preferences: {
        theme,
        accentColor,
        autoCleanTasks,
        autoCleanProjects,
      },
    });

  const saveSafetyBackup = (reason: string) =>
    saveWorkspaceSafetyBackup(reason, {
      tasks,
      projects,
      events,
      resources,
      notes,
      noteSpaces,
      preferences: {
        theme,
        accentColor,
        autoCleanTasks,
        autoCleanProjects,
      },
    });

  const exportData = () => {
    const backup = buildWorkspaceBackup();
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadJson(`align-workspace-${dateStamp}.json`, backup);
    window.localStorage.setItem(LAST_WORKSPACE_EXPORT_KEY, backup.exportedAt);
    setLastWorkspaceExport(backup.exportedAt);
    setDataMessage("Full workspace backup exported.");
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;

    try {
      const backup = parseWorkspaceBackup(await file.text());
      const shouldImport = await confirm({
        title: "Import backup?",
        description:
          "Importing this backup will replace local tasks, projects, calendar events, notes, resources, and supported preferences. Align will save a safety copy first.",
        confirmLabel: "Import Backup",
      });

      if (!shouldImport) return;

      window.localStorage.setItem(IMPORT_SAFETY_BACKUP_KEY, JSON.stringify(buildWorkspaceBackup()));
      replaceTasks(backup.tasks);
      replaceProjects(backup.projects);
      replaceEvents(backup.events);
      replaceResources(backup.resources);
      replaceNotes(backup.notes);
      replaceNoteSpaces(backup.noteSpaces);

      const restoredTheme = themeOptions.find((option) => option.value === backup.preferences.theme);
      if (restoredTheme) {
        setTheme(restoredTheme.value);
      }

      const restoredAccent = accentOptions.find((option) => option.value === backup.preferences.accentColor);
      if (restoredAccent) {
        setAccentColor(restoredAccent.value);
      }

      if (typeof backup.preferences.autoCleanTasks === "boolean") {
        setTrashCleanupPreference(AUTO_CLEANUP_DELETED_TASKS_KEY, backup.preferences.autoCleanTasks);
        setAutoCleanTasks(backup.preferences.autoCleanTasks);
      }

      if (typeof backup.preferences.autoCleanProjects === "boolean") {
        setTrashCleanupPreference(AUTO_CLEANUP_DELETED_PROJECTS_KEY, backup.preferences.autoCleanProjects);
        setAutoCleanProjects(backup.preferences.autoCleanProjects);
      }

      setDataMessage(
        `Imported backup from ${plainDateLabel(backup.exportedAt.slice(0, 10))}. Safety copy saved on this device.`,
      );
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
    const shouldSignOut = await confirm({
      title: "Sign out of cloud sync?",
      description: "Align will save a local safety backup first, then isolate this device from the signed-in cloud workspace.",
      confirmLabel: "Sign Out",
    });
    if (!shouldSignOut) return;

    saveSafetyBackup("manual-sign-out");
    await supabase.auth.signOut();
    setSyncMessage("Signed out. Local safety backup saved on this device.");
  };

  const uploadWorkspace = async () => {
    if (syncMode === "local") {
      setSyncMessage("Switch Sync Mode to Cloud sync or Paused before uploading to Supabase.");
      return;
    }

    const ownerId = getWorkspaceOwnerId();
    const currentWorkspaceHasData = hasWorkspaceData({ tasks, projects, events, resources, notes, noteSpaces });
    if (session?.user.id && ownerId && ownerId !== session.user.id) {
      saveSafetyBackup("blocked-cross-account-upload");
      const message = "Upload blocked because this local workspace belongs to another account. A safety backup was saved.";
      syncState.setSyncState("error", message);
      setSyncMessage(message);
      return;
    }
    if (session?.user.id && !ownerId && currentWorkspaceHasData) {
      const shouldClaimWorkspace = await confirm({
        title: "Attach local workspace to this account?",
        description:
          "This local workspace is not linked to the signed-in account yet. Uploading will attach this device data to this account. Continue only if this is your workspace.",
        confirmLabel: "Attach and Upload",
      });
      if (!shouldClaimWorkspace) {
        saveSafetyBackup("blocked-unowned-upload");
        const message = "Upload cancelled. A safety backup was saved and no cloud data was changed.";
        syncState.setSyncState("idle", message);
        setSyncMessage(message);
        return;
      }
      setWorkspaceOwnerId(session.user.id);
    }

    setSyncing(true);
    setSyncMessage("");
    syncState.setSyncState("pushing", "Uploading local workspace...");

    try {
      saveSafetyBackup("manual-cloud-upload");
      const result = await pushWorkspaceToSupabase({ tasks, projects, events, resources, notes, noteSpaces });
      replaceTasks(result.tasks);
      syncState.setTaskDiagnostics(result.taskSync);
      syncState.setSynced("Local workspace merged with cloud.");
      setSyncMessage(`Tasks synced: ${result.taskSync.localCount} local, ${result.taskSync.remoteCount} cloud, ${result.taskSync.mergedCount} merged.`);
    } catch (error) {
      const message = errorMessage(error, "Could not upload workspace.");
      syncState.setSyncState("error", message);
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const downloadWorkspace = async () => {
    if (syncMode === "local") {
      setSyncMessage("Switch Sync Mode to Cloud sync or Paused before downloading from Supabase.");
      return;
    }

    const shouldReplace = await confirm({
      title: "Merge cloud workspace?",
      description: "Download from Supabase and merge cloud tasks into this device. Align will save a local safety backup first.",
      confirmLabel: "Download and Merge",
    });
    if (!shouldReplace) return;

    setSyncing(true);
    setSyncMessage("");
    syncState.setSyncState("pulling", "Downloading cloud workspace...");

    try {
      saveSafetyBackup("manual-cloud-download");
      const workspace = await pullWorkspaceFromSupabase();
      const ownerId = getWorkspaceOwnerId();
      const isSameAccountWorkspace = Boolean(session?.user.id && ownerId === session.user.id);
      if (!hasWorkspaceData(workspace) && isSameAccountWorkspace && hasWorkspaceData({ tasks, projects, events, resources, notes, noteSpaces })) {
        const message = "Cloud sync unavailable. Local data is safe on this device.";
        syncState.setSyncState("error", message);
        setSyncMessage(`${message} Supabase returned an empty workspace, so Align did not replace your local data.`);
        return;
      }

      const taskSync = await syncTasksWithSupabase(tasks, workspace.projects.length ? workspace.projects : projects);
      replaceTasks(taskSync.tasks);
      syncState.setTaskDiagnostics(taskSync);
      replaceProjects(workspace.projects);
      replaceEvents(workspace.events);
      replaceResources(workspace.resources);
      replaceNotes(workspace.notes);
      if (!workspace.noteSpacesUnavailable) replaceNoteSpaces(workspace.noteSpaces);
      if (session?.user.id) setWorkspaceOwnerId(session.user.id);
      syncState.setSynced("Workspace merged from cloud.");
      setSyncMessage(`Workspace downloaded from Supabase. Tasks: ${taskSync.localCount} local, ${taskSync.remoteCount} cloud, ${taskSync.mergedCount} merged.`);
    } catch (error) {
      const message = errorMessage(error, "Could not download workspace.");
      syncState.setSyncState("error", message);
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  };

  const resetCurrentCloudWorkspace = async () => {
    if (!session) {
      setSyncMessage("Sign in before resetting cloud workspace data.");
      return;
    }

    const shouldReset = await confirm({
      title: "Reset cloud workspace?",
      description: `Reset cloud workspace for ${session.user.email ?? "this signed-in account"}? Align will save a local safety backup first. This only clears this account's cloud workspace.`,
      confirmLabel: "Reset Cloud",
      tone: "danger",
    });
    if (!shouldReset) return;

    const shouldAlsoClearLocal = await confirm({
      title: "Also clear local workspace?",
      description: "This is optional. If you choose no, only the cloud copy is reset and local data stays on this device.",
      confirmLabel: "Clear Local Too",
      cancelLabel: "Keep Local",
      tone: "danger",
    });

    setSyncing(true);
    setSyncMessage("");
    syncState.setSyncState("pushing", "Resetting current cloud workspace...");

    try {
      saveSafetyBackup("reset-current-cloud-workspace");
      await clearWorkspaceInSupabase();

      if (shouldAlsoClearLocal) {
        replaceTasks([]);
        replaceProjects([]);
        replaceEvents([]);
        replaceResources([]);
        replaceNotes([]);
        replaceNoteSpaces([]);
        setWorkspaceOwnerId(session.user.id);
      }

      syncState.setSynced("Current account cloud workspace reset.");
      setSyncMessage(
        shouldAlsoClearLocal
          ? "Cloud and local workspace reset for the signed-in account."
          : "Cloud workspace reset for the signed-in account. Local data stayed on this device.",
      );
    } catch (error) {
      const message = errorMessage(error, "Could not reset cloud workspace.");
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

    const shouldOverwrite = await confirm({
      title: "Overwrite calendar conflicts?",
      description: "Conflicting Google Calendar events will be overwritten with Align task details.",
      confirmLabel: "Overwrite",
    });
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
    const shouldDisconnect = await confirm({
      title: "Disconnect Google Calendar?",
      description: "Align will stop syncing Google Calendar and remove imported Google events from the local calendar view.",
      confirmLabel: "Disconnect",
    });
    if (!shouldDisconnect) return;

    setSyncingCalendar(true);
    setCalendarMessage("");

    try {
      await disconnectGoogleCalendar();
      clearGoogleSyncStatusCache();
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
                    ? "border-[var(--brand-primary)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[var(--shadow-focus)]"
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
        <>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><UserRound size={18} /> Profile</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Your local display name and signed-in identity.</p>
            </div>
            <Badge tone={session ? "emerald" : "slate"}>{sessionLoading ? "Checking" : session ? "Signed in" : "Local only"}</Badge>
          </div>
          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Display name</label>
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm font-semibold text-[var(--text)]">
            {sessionLoading ? "Checking session..." : profileDisplayName}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Account email</p>
              <p className="mt-2 break-all text-sm font-semibold text-[var(--text)]">
                {session?.user.email ?? "No cloud account connected"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Workspace mode</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text)]">{workspaceMode.label}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><ShieldCheck size={18} /> Workspace Safety</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{workspaceMode.description}</p>
            </div>
            <Badge tone={workspaceMode.tone}>{workspaceMode.label}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <HardDrive className="mt-0.5 text-[var(--brand-primary)]" size={18} />
              <div>
                <p className="font-semibold text-[var(--text)]">Local copy is primary</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Backups and safety snapshots protect this device if cloud sync has trouble.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
              <Cloud className="mt-0.5 text-[var(--brand-primary)]" size={18} />
              <div>
                <p className="font-semibold text-[var(--text)]">Cloud status</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {session && syncState.lastSyncedAt
                    ? `Last synced ${new Date(syncState.lastSyncedAt).toLocaleString()}`
                    : session
                      ? syncState.message
                      : "Sign in only when you want hosted sync."}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-[var(--text)]">Account actions</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Quick access to the things that protect or disconnect this workspace.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Download size={16} />} onClick={exportData}>Export Backup</Button>
              <Button variant="secondary" icon={<Upload size={16} />} onClick={() => importInputRef.current?.click()}>Import Backup</Button>
              {session ? (
                <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => void signOut()}>Sign Out</Button>
              ) : null}
            </div>
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
        </>
        ) : null}
        {settingsSection === "appearance" ? (
        <>
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold text-[var(--text)]"><Palette size={18} /> Appearance</h2>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {activeTheme.label} is active. Accent colors affect buttons, selected navigation, focus states, and progress.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {themeOptions.map((option) => {
              const isActive = option.value === theme;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`rounded-[var(--radius-md)] border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-[var(--brand-primary)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[var(--shadow-focus)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs text-[var(--text-soft)]">{option.description}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--text)]">Quick theme switch</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Saved on this device.</p>
              </div>
              <ThemeToggle showLabel />
            </div>
          </div>
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="font-semibold text-[var(--text)]">Accent color</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Current accent: {accentOptions.find((option) => option.value === accentColor)?.label ?? "Blue"}.</p>
            </div>
              <AccentColorPicker />
          </div>
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
        </>
        ) : null}
        {settingsSection === "data" ? (
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-bold text-[var(--text)]">
                <DatabaseBackup size={18} /> Data Protection
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
                Back up, restore, and recover your full local workspace. Cloud sync is convenient, but this device copy and your JSON backups are the recovery path.
              </p>
            </div>
            <Badge tone={workspaceMode.tone}>{workspaceMode.label}</Badge>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-[var(--text)]">Workspace backup</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Exports include tasks, projects, calendar events, notes, resources, and supported preferences.
                  </p>
                </div>
                <Badge tone="slate">Backup v2</Badge>
              </div>
              <p className="mt-3 text-xs text-[var(--text-soft)]">
                {lastWorkspaceExport ? `Last exported ${new Date(lastWorkspaceExport).toLocaleString()}` : "No full workspace export recorded on this device yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" icon={<Download size={16} />} onClick={exportData}>Export Full Backup</Button>
                <Button variant="secondary" icon={<Upload size={16} />} onClick={() => importInputRef.current?.click()}>Import Backup</Button>
              </div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-[var(--success)]" size={18} />
                <div>
                  <p className="font-semibold text-[var(--text)]">Recovery rule</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    If Supabase is unavailable or returns an unexpected empty workspace, Align keeps local data on this device.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--text-soft)]">
                Restore from a full JSON backup first, then reconnect or upload to Supabase after the backend is healthy.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--text)]">{workspaceMode.title}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{workspaceMode.description}</p>
              </div>
              <Badge tone={workspaceMode.tone}>{workspaceMode.label}</Badge>
            </div>
            {syncState.lastSyncedAt && session ? (
              <p className="mt-2 text-xs text-[var(--text-soft)]">Last cloud sync {new Date(syncState.lastSyncedAt).toLocaleString()}</p>
            ) : null}
          </div>
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--surface-raised)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 text-[var(--danger-text)]" size={18} />
                <div>
                  <p className="font-semibold text-[var(--text)]">Advanced reset</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Only use this when a test account accidentally received copied cloud data. A local safety backup is saved first.
                  </p>
                </div>
              </div>
              <Button
                variant={showCloudResetControls ? "ghost" : "secondary"}
                onClick={() => setShowCloudResetControls((isVisible) => !isVisible)}
              >
                {showCloudResetControls ? "Hide reset controls" : "Show reset controls"}
              </Button>
            </div>
            {showCloudResetControls ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-bg)] p-3">
                <p className="text-sm font-semibold text-[var(--danger-text)]">Reset current account cloud workspace</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  This clears only the signed-in account's cloud rows. Your local workspace stays unless you confirm the second prompt.
                </p>
                <Button
                  className="mt-3"
                  variant="danger"
                  onClick={() => void resetCurrentCloudWorkspace()}
                  disabled={!session || syncing || syncMode === "local"}
                >
                  Reset Cloud Workspace
                </Button>
              </div>
            ) : null}
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
            Optional hosted sync for your own devices. Align stays usable in local-only mode when this is not configured.
          </p>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm sm:p-4">
            <p className="font-semibold text-[var(--text)]">Which mode should I use?</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="font-semibold text-[var(--text)]">Most private</p>
                <p className="mt-1 text-[var(--text-muted)]">Use Local only when you want Align to stay on this device with manual JSON backups.</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="font-semibold text-[var(--text)]">Most controlled</p>
                <p className="mt-1 text-[var(--text-muted)]">Use Paused when signed in, but you want to upload or download only when you choose.</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="font-semibold text-[var(--text)]">Multi-device</p>
                <p className="mt-1 text-[var(--text-muted)]">Use Cloud sync only with your own configured Supabase project or trusted hosted deployment.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--text-soft)]">Export a full backup before changing modes if this workspace has important active work.</p>
          </div>
          <div className="mt-4 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-[var(--text)]">Sync Mode</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Choose whether this device auto-syncs, stays signed in for manual sync, or remains local-only.
                </p>
              </div>
              <Badge tone={workspaceMode.tone}>{workspaceMode.label}</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {syncModeOptions.map((option) => {
                const isActive = option.value === syncMode;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => syncState.setMode(option.value)}
                    className={`rounded-[var(--radius-md)] border p-3 text-left transition ${
                      isActive
                        ? "border-[var(--brand-primary)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[var(--shadow-focus)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="mt-1 block text-xs text-[var(--text-soft)]">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
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
              ) : canUseMagicLinkAuth ? (
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
              ) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-muted)]">
                  Sign in from the secure access screen with Google to use hosted sync.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void uploadWorkspace()} disabled={!session || syncing || syncMode === "local"}>
                  Upload Now
                </Button>
                <Button variant="secondary" onClick={() => void downloadWorkspace()} disabled={!session || syncing || syncMode === "local"}>
                  Download Now
                </Button>
              </div>
              <p className="text-xs text-[var(--text-soft)]">
                {syncMode === "cloud"
                  ? "After sign-in, the app downloads cloud data automatically. Local edits are saved to Supabase after a short delay."
                  : syncMode === "paused"
                    ? "Automatic sync is paused. Use Upload Now or Download Now when you want to move data."
                    : "Local-only mode blocks Supabase upload and download from this device."}
              </p>
              {syncState.taskDiagnostics ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--text-muted)]">
                  <p className="font-semibold text-[var(--text)]">Task sync</p>
                  <p className="mt-1">
                    {syncState.taskDiagnostics.localCount} local · {syncState.taskDiagnostics.remoteCount} cloud ·{" "}
                    {syncState.taskDiagnostics.mergedCount} merged
                  </p>
                  <p className="mt-1">Last sync: {new Date(syncState.taskDiagnostics.lastSyncedAt).toLocaleString()}</p>
                </div>
              ) : null}
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
