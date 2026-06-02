import { Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import {
  clearReadNotifications,
  deleteOldReadNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../integrations/supabase/notifications";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useProjectStore } from "../../store/projectStore";
import { useTaskStore } from "../../store/taskStore";
import type { AppNotification } from "../../types/notification";
import { groupNotifications, notificationContext } from "../../utils/notificationPresentation";

export function NotificationCenter({
  open: controlledOpen,
  onOpenChange,
  align = "right",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "left" | "right";
}) {
  const navigate = useNavigate();
  const { session, loading, isConfigured } = useSupabaseSession();
  const tasks = useTaskStore((state) => state.tasks);
  const projects = useProjectStore((state) => state.projects);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cleanupAttemptedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const canLoad = isConfigured && Boolean(session) && !loading;
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const load = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      return;
    }

    try {
      setError("");
      if (!cleanupAttemptedRef.current) {
        cleanupAttemptedRef.current = true;
        void deleteOldReadNotifications().catch(() => {
          cleanupAttemptedRef.current = false;
        });
      }
      setItems(await fetchNotifications(20));
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

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (shellRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, setOpen]);

  const { unread, read } = useMemo(() => groupNotifications(items), [items]);

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleClearRead = async () => {
    setBusy(true);
    try {
      await clearReadNotifications();
      setItems((current) => current.filter((item) => !item.readAt));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenNotification = async (item: AppNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setItems((current) => current.map((notification) => (notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification)));
    }
    setOpen(false);
    if (item.taskId) navigate("/tasks");
  };

  return (
    <div ref={shellRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          void load();
        }}
        className="relative grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-strong)] hover:bg-[var(--button-secondary-hover)]"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={17} />
        {unread.length ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--button-danger-bg)] px-1 text-[10px] font-black text-[var(--button-danger-text)] ring-2 ring-[var(--panel-bg)]">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className={`absolute top-full z-[80] mt-2 w-[min(24rem,calc(100vw-1.5rem))] ${align === "left" ? "left-0" : "right-0"}`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--shadow-lg)]">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel-inset)] px-4 py-4">
                <div>
                  <p className="text-base font-black text-[var(--text)]">Attention Center</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{unread.length ? `${unread.length} unread reminder${unread.length === 1 ? "" : "s"}` : "All caught up"}</p>
                </div>
                <div className="flex gap-1">
                  <ActionButton disabled={!unread.length || busy} onClick={() => void handleMarkAllRead()} icon={<CheckCheck size={14} />}>
                    Read
                  </ActionButton>
                  <ActionButton disabled={!read.length || busy} onClick={() => void handleClearRead()} icon={<Trash2 size={13} />}>
                    Clear
                  </ActionButton>
                </div>
              </div>

              <div className="max-h-[26rem] overflow-y-auto p-3">
                {error ? <p className="rounded-[var(--radius-md)] bg-[var(--danger-bg)] px-3 py-3 text-sm font-semibold text-[var(--danger-text)]">{error}</p> : null}
                {!error && !items.length ? (
                  <div className="grid place-items-center gap-3 px-4 py-10 text-center">
                    <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
                      <Inbox size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[var(--text)]">No reminders yet</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">Task reminders will appear here when they are due.</p>
                    </div>
                  </div>
                ) : null}
                {!error && unread.length ? (
                  <NotificationGroup title="Unread">
                    {unread.map((item) => (
                      <NotificationItem key={item.id} item={item} taskById={taskById} projectById={projectById} onOpen={handleOpenNotification} />
                    ))}
                  </NotificationGroup>
                ) : null}
                {!error && read.length ? (
                  <NotificationGroup title="Recent read">
                    {read.map((item) => (
                      <NotificationItem key={item.id} item={item} taskById={taskById} projectById={projectById} onOpen={handleOpenNotification} />
                    ))}
                  </NotificationGroup>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NotificationGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NotificationItem({
  item,
  taskById,
  projectById,
  onOpen,
}: {
  item: AppNotification;
  taskById: Map<string, { projectId?: string; title: string }>;
  projectById: Map<string, { name: string }>;
  onOpen: (item: AppNotification) => Promise<void>;
}) {
  const { task, label } = notificationContext(item, taskById, projectById);

  return (
    <button
      type="button"
      onClick={() => void onOpen(item)}
      className={`block w-full rounded-[var(--radius-md)] border p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] ${
        item.readAt ? "border-[var(--border)] bg-[var(--panel-bg-soft)]" : "border-[var(--icon-tile-border)] bg-[var(--accent-soft)]"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-[var(--text)]">{item.title}</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--text-muted)]">{item.message}</span>
        </span>
        {!item.readAt ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-primary)]" /> : null}
      </span>
      <span className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--text-soft)]">
        {task && label ? <span>{label}</span> : null}
        <span>{formatDistanceToNow(new Date(item.scheduledFor), { addSuffix: true })}</span>
      </span>
    </button>
  );
}

function ActionButton({ children, disabled, icon, onClick }: { children: React.ReactNode; disabled: boolean; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-black text-[var(--text-muted)] transition hover:bg-[var(--dropdown-hover)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  );
}
