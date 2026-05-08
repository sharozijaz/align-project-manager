import { useEffect, useMemo, useRef, useState } from "react";
import {
  getGoogleTasksBridgeReadiness,
  getGoogleTasksBridgeStatus,
  syncGoogleTasksBridge,
} from "../../integrations/googleTasks/googleTasksClient";
import type { GoogleTasksBridgeSettings } from "../../integrations/googleTasks/types";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";

const CHANGE_DEBOUNCE_MS = 30_000;
const AUTO_INTERVAL_MS = 15 * 60_000;
const MIN_SYNC_GAP_MS = 90_000;
const STARTUP_DELAY_MS = 12_000;
const STATUS_REFRESH_MS = 60_000;

export function GoogleTasksBridgeAutoSync() {
  const { session } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const importTasks = useTaskStore((state) => state.importTasks);
  const projects = useProjectStore((state) => state.projects);
  const [settings, setSettings] = useState<GoogleTasksBridgeSettings | null>(null);
  const [ready, setReady] = useState(false);
  const tasksRef = useRef(tasks);
  const projectsRef = useRef(projects);
  const settingsRef = useRef<GoogleTasksBridgeSettings | null>(settings);
  const syncingRef = useRef(false);
  const lastSyncedAtRef = useRef(0);
  const didPrimeRef = useRef(false);
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          projectId: task.projectId,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          status: task.status,
          priority: task.priority,
          deletedAt: task.deletedAt,
          updatedAt: task.updatedAt,
        })),
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          updatedAt: project.updatedAt,
        })),
      }),
    [projects, tasks],
  );

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!session || !getGoogleTasksBridgeReadiness().ready) {
      setReady(false);
      setSettings(null);
      didPrimeRef.current = false;
      return;
    }

    let cancelled = false;

    const refreshStatus = () =>
      getGoogleTasksBridgeStatus()
        .then((status) => {
          if (cancelled) return;
          setSettings(status.settings);
          setReady(Boolean(status.connected && !status.needsReconnect && status.settings.enabled));
        })
        .catch(() => {
          if (!cancelled) {
            setReady(false);
            setSettings(null);
          }
        });

    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, STATUS_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session]);

  useEffect(() => {
    if (!session || !ready || !settings) return;

    if (!didPrimeRef.current) {
      didPrimeRef.current = true;
      const startupTimeout = window.setTimeout(() => {
        void runSync("startup");
      }, STARTUP_DELAY_MS);
      return () => window.clearTimeout(startupTimeout);
    }

    const timeout = window.setTimeout(() => {
      void runSync("change");
    }, CHANGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [ready, session, settings, snapshot]);

  useEffect(() => {
    if (!session || !ready) return;

    const interval = window.setInterval(() => {
      void runSync("interval");
    }, AUTO_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync("visible");
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, session]);

  async function runSync(_reason: "startup" | "change" | "interval" | "visible") {
    const currentSettings = settingsRef.current;
    if (!session || !ready || !currentSettings?.enabled || syncingRef.current) return;
    if (Date.now() - lastSyncedAtRef.current < MIN_SYNC_GAP_MS) return;

    syncingRef.current = true;
    try {
      const result = await syncGoogleTasksBridge({
        tasks: tasksRef.current,
        projects: projectsRef.current,
        settings: currentSettings,
      });
      lastSyncedAtRef.current = Date.now();
      setSettings(result.settings);
      if (result.importedTasks.length) importTasks(result.importedTasks);
    } catch {
      setReady(false);
      didPrimeRef.current = false;
    } finally {
      syncingRef.current = false;
    }
  }

  return null;
}
