import { ArrowRight, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { NavLink } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, ItemCard, StudioForm, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";
import type { PersonalArea } from "../types/studio";

const areas: PersonalArea[] = ["today", "ideas", "finance", "learning", "life", "other"];
const moduleLinks = [
  { to: "/resources", label: "Resource Vault", description: "Inspiration, tools, icons, fonts, and references." },
  { to: "/prompts", label: "Prompt Library", description: "Reusable prompts for copy, mockups, and AI workflows." },
  { to: "/pipeline", label: "Client Pipeline", description: "Leads, proposals, follow-ups, and active opportunities." },
  { to: "/documents", label: "Documents", description: "Invoices, contracts, briefs, proposals, and handoff links." },
];

export function PersonalHub() {
  const { personal, addPersonalItem, deletePersonalItem } = useStudioStore();
  const [form, setForm] = useState({ title: "", area: "ideas" as PersonalArea, url: "", notes: "" });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    addPersonalItem({ ...form, title: form.title.trim(), url: form.url.trim() || undefined });
    setForm({ title: "", area: "ideas", url: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Personal Hub" description="Your private owner command center for ideas, personal links, and shortcuts around Align." />
      <div className="grid gap-4 lg:grid-cols-4">
        {moduleLinks.map((link) => (
          <NavLink key={link.to} to={link.to} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--surface-hover)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[var(--text)]">{link.label}</h2>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{link.description}</p>
          </NavLink>
        ))}
      </div>
      <form onSubmit={submit}>
        <StudioForm title="Save a private item" description="Quick links, ideas, admin notes, and personal reminders that do not belong inside a client project." actionLabel="Save Item">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_1fr]">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Item title" />
            <Select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value as PersonalArea })}>{areas.map((area) => <option key={area} value={area}>{area}</option>)}</Select>
            <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="Optional link" />
          </div>
          <StudioTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Private notes..." />
        </StudioForm>
      </form>
      {personal.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {personal.map((item) => (
            <ItemCard
              key={item.id}
              title={item.title}
              meta={<><Badge tone="purple">{item.area}</Badge>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-[var(--brand-primary)] hover:underline">Open link</a> : null}</>}
              actions={<Button variant="danger" onClick={() => deletePersonalItem(item.id)} icon={<Trash2 size={15} />} aria-label="Delete personal item" />}
            >
              {item.notes || "No notes yet."}
            </ItemCard>
          ))}
        </div>
      ) : (
        <EmptyState>No personal hub items yet.</EmptyState>
      )}
    </div>
  );
}
