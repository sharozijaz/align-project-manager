import { useEffect, useMemo, useRef, useState } from "react";
import { getGoogleCalendarConnection, getGoogleCalendarReadiness } from "../../integrations/googleCalendar/googleCalendarClient";
import { syncLocalTasksWithGoogleCalendar } from "../../integrations/googleCalendar/sync";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useCalendarStore } from "../../store/calendarStore";
import { useGoogleCalendarSyncStore } from "../../store/googleCalendarSyncStore";
import { useTaskStore } from "../../store/taskStore";
import { errorMessage } from "../../utils/errors";

export function GoogleCalendarAutoSync() {
  const { session } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const events = useCalendarStore((state) => state.events);
  const replaceEvents = useCalendarStore((state) => state.replaceEvents);
  const setStatus = useGoogleCalendarSyncStore((state) => state.setStatus);
  const recordSuccess = useGoogleCalendarSyncStore((state) => state.recordSuccess);
  const recordError = useGoogleCalendarSyncStore((state) => state.recordError);
  const [connected, setConnected] = useState(false);
  const didPrimeRef = useRef(false);
  const eventsRef = useRef(events);
  const syncingRef = useRef(false);
  const taskSnapshot = useMemo(
    () =>
      JSON.stringify(
        tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority,
          deletedAt: task.deletedAt,
          updatedAt: task.updatedAt,
        })),
      ),
    [tasks],
  );

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (!session || !getGoogleCalendarReadiness().ready) {
      setConnected(false);
      didPrimeRef.current = false;
      return;
    }

    let cancelled = false;
    setStatus("checking", "Checking Google Calendar connection...");

    void getGoogleCalendarConnection()
      .then((connection) => {
        if (!cancelled) setConnected(Boolean(connection.connected));
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, setStatus]);

  useEffect(() => {
    if (!session || !connected) return;

    if (!didPrimeRef.current) {
      didPrimeRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      if (syncingRef.current) return;

      syncingRef.current = true;
      setStatus("syncing", "Auto-syncing Google Calendar...");

      void syncLocalTasksWithGoogleCalendar(tasks)
        .then((result) => {
          const localEvents = eventsRef.current.filter((event) => event.source !== "google");
          replaceEvents([...result.googleEvents, ...localEvents]);
          recordSuccess(
            {
              created: result.created,
              updated: result.updated,
              removed: result.removed,
              importedEvents: result.importedEvents,
              conflicts: result.conflicts,
            },
            "auto",
          );
        })
        .catch((error) => {
          recordError(errorMessage(error, "Could not auto-sync Google Calendar."));
        })
        .finally(() => {
          syncingRef.current = false;
        });
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [connected, recordError, recordSuccess, replaceEvents, session, setStatus, taskSnapshot, tasks]);

  return null;
}
