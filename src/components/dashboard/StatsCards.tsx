import type { ReactNode } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban } from "lucide-react";
import { Card } from "../ui/Card";

interface StatsCardsProps {
  activeProjects: number;
  atRiskProjects: number;
  dueSoonProjects: number;
  progress: number;
  openTasks: number;
  completedTasks: number;
}

export function StatsCards({ activeProjects, atRiskProjects, dueSoonProjects, progress, openTasks, completedTasks }: StatsCardsProps) {
  const cards: Array<{ label: string; value: string | number; helper: string; icon: ReactNode; tone: string }> = [
    { label: "Active Work", value: activeProjects, helper: activeProjects ? "Projects currently moving" : "No active projects", icon: <FolderKanban size={18} />, tone: "var(--brand-primary)" },
    { label: "Needs Attention", value: atRiskProjects, helper: atRiskProjects ? "Overdue or deadline pressure" : "No blocked project work", icon: <AlertTriangle size={18} />, tone: "var(--danger)" },
    { label: "Due Window", value: dueSoonProjects, helper: dueSoonProjects ? "Deadlines in the next 7 days" : "No near deadlines", icon: <CalendarClock size={18} />, tone: "var(--warning)" },
    { label: "Delivery Progress", value: `${progress}%`, helper: `${completedTasks} complete · ${openTasks} remaining`, icon: <CheckCircle2 size={18} />, tone: "var(--success)" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="group relative overflow-hidden p-0 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]"
          style={{
            borderColor: `color-mix(in srgb, ${card.tone} 14%, var(--panel-border))`,
          }}
        >
          <span
            className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: `color-mix(in srgb, ${card.tone} 72%, var(--panel-bg))` }}
            aria-hidden="true"
          />
          <div className="flex h-full p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-2xl font-bold text-[var(--text)]">{card.value}</strong>
                  <span className="mt-1 block text-sm font-semibold text-[var(--text-muted)]">{card.label}</span>
                </div>
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border"
                  style={{
                    background: `color-mix(in srgb, ${card.tone} 7%, var(--panel-bg))`,
                    borderColor: `color-mix(in srgb, ${card.tone} 22%, var(--panel-border))`,
                    color: card.tone,
                  }}
                >
                  {card.icon}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">{card.helper}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
