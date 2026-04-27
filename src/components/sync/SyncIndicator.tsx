import { AlertCircle, CheckCircle2, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { useSyncStore } from "../../store/syncStore";

const statusCopy = {
  idle: "Cloud ready",
  pulling: "Downloading",
  pushing: "Saving",
  synced: "Synced",
  error: "Sync issue",
};

export function SyncIndicator() {
  const { session, loading } = useSupabaseSession();
  const syncState = useSyncStore((state) => state.state);
  const message = useSyncStore((state) => state.message);

  if (!isSupabaseConfigured) {
    return (
      <Link
        to="/settings"
        className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
        title="Supabase is not configured"
      >
        <CloudOff size={14} />
        Local
      </Link>
    );
  }

  if (loading || !session) {
    return (
      <Link
        to="/settings"
        className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
        title="Sign in to enable cloud sync"
      >
        <Cloud size={14} />
        Sign in
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
      }`}
      title={message}
    >
      <Icon size={14} className={isBusy ? "animate-spin" : ""} />
      {statusCopy[syncState]}
    </Link>
  );
}
