import { Card } from "../ui/Card";

export function StatsCards({ open, today, overdue }: { open: number; today: number; overdue: number }) {
  const cards = [
    { label: "Open Tasks", value: open, accent: "border-l-sky-400" },
    { label: "Due Today", value: today, accent: "border-l-orange-400" },
    { label: "Overdue", value: overdue, accent: "border-l-red-500" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className={`border-l-4 p-5 ${card.accent}`}>
          <strong className="block text-2xl font-semibold text-slate-950 dark:text-slate-50">{card.value}</strong>
          <span className="mt-2 block text-sm text-slate-600">{card.label}</span>
        </Card>
      ))}
    </div>
  );
}
