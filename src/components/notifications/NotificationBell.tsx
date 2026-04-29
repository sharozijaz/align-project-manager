import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../integrations/supabase/notifications";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import type { AppNotification } from "../../types/notification";

export function NotificationBell({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { session, loading, isConfigured } = useSupabaseSession();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canLoad = isConfigured && Boolean(session) && !loading;
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const load = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      return;
    }

    try {
      setError("");
      const nextItems = await fetchNotifications(10);
      setItems(nextItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load notifications.");
    }
  }, [canLoad]);

  useEffect(() => {
    void load();
    if (!canLoad) return;

    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [canLoad, load]);

  const unreadCount = items.filter((item) => !item.readAt).length;

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          void load();
        }}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--button-danger-bg)] px-1 text-[10px] font-bold text-[var(--button-danger-text)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 w-[min(20rem,calc(100vw-2rem))] pt-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--dropdown-bg)] p-2 shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Notifications</p>
                <p className="text-xs text-[var(--text-soft)]">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p>
              </div>
              <button
                type="button"
                disabled={!unreadCount || busy}
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)] disabled:opacity-40"
              >
                <CheckCheck size={14} />
                Read
              </button>
            </div>

            <div className="mt-2 max-h-80 overflow-y-auto">
              {error ? <p className="px-3 py-4 text-sm text-[var(--button-danger-text)]">{error}</p> : null}
              {!error && !items.length ? (
                <div className="grid place-items-center gap-2 px-3 py-8 text-center text-sm text-[var(--text-soft)]">
                  <Inbox size={18} />
                  No reminders yet.
                </div>
              ) : null}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleMarkRead(item.id)}
                  className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-[var(--dropdown-hover)]"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--text)]">{item.title}</span>
                    {!item.readAt ? <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent-purple)]" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{item.message}</span>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
                    {formatDistanceToNow(new Date(item.scheduledFor), { addSuffix: true })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
