import { AlertCircle, CheckCircle2, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useSyncStore } from "../../store/syncStore";

const statusCopy = {
  idle: "Cloud ready",
  pulling: "Cloud downloading",
  pushing: "Cloud saving",
  synced: "Cloud synced",
  error: "Sync issue",
};

export function SyncIndicator({ className = "" }: { className?: string }) {
  const { session, loading } = useSupabaseSession();
  const syncState = useSyncStore((state) => state.state);
  const syncMode = useSyncStore((state) => state.mode);
  const message = useSyncStore((state) => state.message);

  if (!isSupabaseConfigured || syncMode === "local") {
    return (
      <Link
        to="/settings"
        className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] ${className}`}
        title="Local-only mode. Cloud sync is not configured."
      >
        <CloudOff size={14} />
        Local only
      </Link>
    );
  }

  if (syncMode === "paused") {
    return (
      <Link
        to="/settings"
        className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] ${className}`}
        title="Cloud auto-sync is paused. Manual sync is still available."
      >
        <CloudOff size={14} />
        Sync paused
      </Link>
    );
  }

  if (loading || !session) {
    return (
      <Link
        to="/settings"
        className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] ${className}`}
        title="Local data is on this device until you sign in."
      >
        <Cloud size={14} />
        Local, sign in
      </Link>
    );
  }

  const isBusy = syncState === "pulling" || syncState === "pushing";
  const isError = syncState === "error";
  const Icon = isBusy ? Loader2 : isError ? AlertCircle : CheckCircle2;

  return (
    <Link
      to="/settings"
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition hover:border-[var(--border-strong)] ${
        isError
          ? "border-[var(--danger)] bg-[var(--button-danger-bg)] text-[var(--button-danger-text)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
      } ${className}`}
      title={message}
    >
      <Icon size={14} className={isBusy ? "animate-spin" : ""} />
      {statusCopy[syncState]}
    </Link>
  );
}
