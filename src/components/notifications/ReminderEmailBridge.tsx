import { useEffect, useRef } from "react";
import { isTauriRuntime } from "../../integrations/desktop/runtime";
import { appUrl } from "../../integrations/supabase/client";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const MIN_CHECK_SPACING_MS = 5 * 60 * 1000;
const LAST_CHECK_KEY = "align.emailReminders.lastCheck";

export function ReminderEmailBridge() {
  const { session, loading, isConfigured } = useSupabaseSession();
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isConfigured || loading || !session?.access_token) return;

    const checkReminderEmails = async (force = false) => {
      if (checkingRef.current) return;

      const lastCheck = Number(window.localStorage.getItem(LAST_CHECK_KEY) || "0");
      if (!force && Date.now() - lastCheck < MIN_CHECK_SPACING_MS) return;

      checkingRef.current = true;
      try {
        const response = await fetch(apiEndpoint("/api/reminders/check"), {
          method: "POST",
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          window.localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        }
      } catch {
        // Email reminder checks are best-effort and should never interrupt app use.
      } finally {
        checkingRef.current = false;
      }
    };

    void checkReminderEmails(true);
    const interval = window.setInterval(() => void checkReminderEmails(), CHECK_INTERVAL_MS);
    const handleFocus = () => void checkReminderEmails();

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isConfigured, loading, session?.access_token]);

  return null;
}

function apiEndpoint(path: string) {
  if (!isTauriRuntime()) return path;

  const baseUrl = appUrl || "https://align.sharoz.dev/";
  return new URL(path, baseUrl).toString();
}
