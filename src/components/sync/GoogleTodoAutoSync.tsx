import { useEffect, useMemo, useRef, useState } from "react";
import { getGoogleTodoSyncReadiness } from "../../integrations/googleTasks/googleTasksClient";
import { getGoogleSyncStatus, syncGoogleWorkspace } from "../../integrations/googleSync/googleSyncClient";
import type { GoogleTodoSyncSettings } from "../../integrations/googleTasks/types";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useTaskStore } from "../../store/taskStore";

const CHANGE_DEBOUNCE_MS = 30_000;
const AUTO_INTERVAL_MS = 15 * 60_000;
const MIN_SYNC_GAP_MS = 90_000;
const STARTUP_DELAY_MS = 12_000;

export function GoogleTodoAutoSync() {
  const { session } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const upsertTasks = useTaskStore((state) => state.upsertTasks);
  const [settings, setSettings] = useState<GoogleTodoSyncSettings | null>(null);
  const [ready, setReady] = useState(false);
  const tasksRef = useRef(tasks);
  const settingsRef = useRef<GoogleTodoSyncSettings | null>(settings);
  const syncingRef = useRef(false);
  const lastSyncedAtRef = useRef(0);
  const didPrimeRef = useRef(false);
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        tasks: tasks
          .filter((task) => task.category === "personal" && !task.projectId)
          .map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            priority: task.priority,
            deletedAt: task.deletedAt,
            updatedAt: task.updatedAt,
          })),
      }),
    [tasks],
  );

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!session || !getGoogleTodoSyncReadiness().ready) {
      setReady(false);
      setSettings(null);
      didPrimeRef.current = false;
      return;
    }

    let cancelled = false;

    void getGoogleSyncStatus({ maxAgeMs: 5 * 60_000 })
      .then((status) => {
        if (cancelled) return;
        setSettings(status.todos.settings);
        setReady(Boolean(status.todos.connected && !status.todos.needsReconnect && status.todos.settings.enabled));
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          setSettings(null);
        }
      });

    return () => {
      cancelled = true;
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
      const result = await syncGoogleWorkspace({
        tasks: tasksRef.current,
        settings: currentSettings,
        todos: true,
      });
      if (!result.todos) return;
      lastSyncedAtRef.current = Date.now();
      setSettings(result.todos.settings);
      if (result.todos.changedTasks.length) upsertTasks(result.todos.changedTasks);
    } catch {
      setReady(false);
      didPrimeRef.current = false;
    } finally {
      syncingRef.current = false;
    }
  }

  return null;
}
