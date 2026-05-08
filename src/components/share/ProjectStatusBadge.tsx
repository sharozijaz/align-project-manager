import type { CSSProperties } from "react";
import { Archive, CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";

type ProjectStatus = "active" | "paused" | "completed" | "archived";

interface ProjectStatusMeta {
  label: string;
  message: string;
  icon: typeof PlayCircle;
  bg: string;
  border: string;
  text: string;
}

const projectStatusStyles: Record<ProjectStatus, ProjectStatusMeta> = {
  active: {
    label: "Active",
    message: "Work is moving and visible to the client.",
    icon: PlayCircle,
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border, var(--status-completed-text))",
    text: "var(--status-completed-text)",
  },
  paused: {
    label: "Paused",
    message: "Work is temporarily paused and ready to resume later.",
    icon: PauseCircle,
    bg: "var(--status-paused-bg)",
    border: "var(--status-paused-border, var(--status-paused-text))",
    text: "var(--status-paused-text)",
  },
  completed: {
    label: "Completed",
    message: "The shared project work is complete.",
    icon: CheckCircle2,
    bg: "var(--status-completed-bg)",
    border: "var(--status-completed-border, var(--status-completed-text))",
    text: "var(--status-completed-text)",
  },
  archived: {
    label: "Archived",
    message: "This project is kept as a read-only reference.",
    icon: Archive,
    bg: "var(--status-not-started-bg)",
    border: "var(--status-not-started-border, var(--border-strong))",
    text: "var(--status-not-started-text)",
  },
};

export function getProjectStatusMeta(status: string): ProjectStatusMeta {
  return projectStatusStyles[status as ProjectStatus] ?? {
    label: titleizeStatus(status),
    message: "Project status and scheduled work.",
    icon: CheckCircle2,
    bg: "var(--status-not-started-bg)",
    border: "var(--status-not-started-border, var(--border-strong))",
    text: "var(--status-not-started-text)",
  };
}

export function ProjectStatusBadge({ status, large = false }: { status: string; large?: boolean }) {
  const meta = getProjectStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded border font-bold ${large ? "px-3 py-2 text-sm" : "px-2.5 py-1 text-xs"}`}
      style={
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          color: meta.text,
        } as CSSProperties
      }
    >
      <Icon size={large ? 16 : 13} />
      {meta.label}
    </span>
  );
}

export function ProjectStatusPanel({ status }: { status: string }) {
  const meta = getProjectStatusMeta(status);
  const Icon = meta.icon;

  return (
    <div
      className="min-w-[220px] rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-sm)]"
      style={
        {
          backgroundColor: meta.bg,
          borderColor: meta.border,
          color: meta.text,
        } as CSSProperties
      }
    >
      <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">Current Project Status</p>
      <div className="mt-3 flex items-center gap-2 text-2xl font-bold">
        <Icon size={24} />
        {meta.label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-5 opacity-90">{meta.message}</p>
    </div>
  );
}

function titleizeStatus(status: string) {
  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
