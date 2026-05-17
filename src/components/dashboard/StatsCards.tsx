import { Card } from "../ui/Card";

export function StatsCards({ open, today, overdue }: { open: number; today: number; overdue: number }) {
  const cards = [
    { label: "Open Tasks", value: open, accent: "var(--info)" },
    { label: "Due Today", value: today, accent: "var(--warning)" },
    { label: "Overdue", value: overdue, accent: "var(--danger)" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="border-l-4 p-5 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]" style={{ borderLeftColor: card.accent }}>
          <strong className="block text-2xl font-bold text-[var(--text)]">{card.value}</strong>
          <span className="mt-2 block text-sm font-medium text-[var(--text-muted)]">{card.label}</span>
        </Card>
      ))}
    </div>
  );
}
