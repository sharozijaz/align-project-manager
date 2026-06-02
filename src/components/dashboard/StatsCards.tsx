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
    { label: "Active Projects", value: activeProjects, helper: activeProjects ? "Projects in motion" : "No active projects", icon: <FolderKanban size={18} />, tone: "var(--brand-primary)" },
    { label: "At Risk", value: atRiskProjects, helper: atRiskProjects ? "Needs project attention" : "No project risk", icon: <AlertTriangle size={18} />, tone: "var(--danger)" },
    { label: "Due Soon", value: dueSoonProjects, helper: dueSoonProjects ? "Project deadlines near" : "No project deadlines", icon: <CalendarClock size={18} />, tone: "var(--warning)" },
    { label: "Project Progress", value: `${progress}%`, helper: `${completedTasks} done · ${openTasks} open`, icon: <CheckCircle2 size={18} />, tone: "var(--success)" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="group overflow-hidden p-0 hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]">
          <div className="flex h-full gap-4 p-4 sm:p-5">
            <div className="w-1 rounded-full" style={{ backgroundColor: card.tone }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block text-2xl font-black text-[var(--text)]">{card.value}</strong>
                  <span className="mt-1 block text-sm font-bold text-[var(--text-muted)]">{card.label}</span>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--icon-tile-border)] bg-[var(--icon-tile-bg)] text-[var(--brand-primary)]">
                  {card.icon}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--text-soft)]">{card.helper}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
