import { CalendarClock, Link2, Repeat, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const sections = [
  {
    icon: CalendarClock,
    title: "Reminders",
    body: "Use reminders when Align should email you before a due date. If a task has no due date, reminder emails have nothing reliable to schedule against.",
    example: "Example: Website update due May 3 at 5:00 PM with a 1 day before reminder sends around May 2 at 5:00 PM.",
  },
  {
    icon: Repeat,
    title: "Recurring Tasks",
    body: "When you complete a repeating task, Align keeps the completed copy and creates the next task with the same priority, project, reminder, and date span.",
    example: "Example: Monthly plugin check from May 2 to May 3 becomes the next monthly check from June 2 to June 3 after completion.",
  },
  {
    icon: Link2,
    title: "Client Share Links",
    body: "Share links are read-only and separate from app accounts. Client-visible project notes appear there; private notes stay hidden.",
    example: "Use password protection for private agency/client links when the project contains sensitive context.",
  },
  {
    icon: ShieldCheck,
    title: "Feature Access",
    body: "Owner accounts can see every module. Members only see modules enabled from Admin, so future studio tools can stay private.",
    example: "A future teammate can get Project Management only, while you keep Resource Vault and Personal Hub private.",
  },
  {
    icon: Sparkles,
    title: "Studio Modules",
    body: "Resource Vault, Prompt Library, Client Pipeline, Documents, and Personal Hub are local-first modules for organizing the rest of your freelance workflow.",
    example: "Save inspiration sites, copy prompts, invoice links, proposal status, and private ideas without crowding project tasks.",
  },
];

export function Help() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help" description="A practical guide to how Align works, with examples for daily project management." />
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map(({ icon: Icon, title, body, example }) => (
          <Card key={title} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
                <Icon size={18} />
              </span>
              <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{body}</p>
            <div className="mt-4">
              <Badge tone="purple">{example}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
