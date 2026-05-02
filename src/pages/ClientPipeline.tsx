import { Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, ItemCard, StudioForm, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";
import type { PipelineStage } from "../types/studio";

const stages: Array<{ value: PipelineStage; label: string; tone: "slate" | "amber" | "blue" | "purple" | "emerald" | "rose" }> = [
  { value: "lead", label: "Lead", tone: "slate" },
  { value: "proposal", label: "Proposal", tone: "amber" },
  { value: "active", label: "Active", tone: "blue" },
  { value: "waiting", label: "Waiting", tone: "purple" },
  { value: "won", label: "Won", tone: "emerald" },
  { value: "lost", label: "Lost", tone: "rose" },
];

export function ClientPipeline() {
  const { pipeline, addPipelineItem, updatePipelineItem, deletePipelineItem } = useStudioStore();
  const [form, setForm] = useState({ title: "", clientName: "", stage: "lead" as PipelineStage, value: "", nextStep: "", notes: "", url: "" });
  const grouped = useMemo(() => stages.map((stage) => ({ ...stage, items: pipeline.filter((item) => item.stage === stage.value) })), [pipeline]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.clientName.trim()) return;
    addPipelineItem({ ...form, title: form.title.trim(), clientName: form.clientName.trim(), url: form.url.trim() || undefined });
    setForm({ title: "", clientName: "", stage: "lead", value: "", nextStep: "", notes: "", url: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Client Pipeline" description="Track leads, proposals, active work, follow-ups, and client opportunities without turning Align into a heavy CRM." />
      <form onSubmit={submit}>
        <StudioForm title="Add client opportunity" description="Use this as a simple freelance pipeline: who, what, stage, value, and next step." actionLabel="Save Opportunity">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="Client or agency" />
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Opportunity / project" />
            <Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as PipelineStage })}>
              {stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
            </Select>
            <Input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="Value, optional" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_2fr]">
            <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="Related link" />
            <Input value={form.nextStep} onChange={(event) => setForm({ ...form, nextStep: event.target.value })} placeholder="Next step" />
            <StudioTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes, context, budget, concerns..." />
          </div>
        </StudioForm>
      </form>
      <div className="grid gap-4 xl:grid-cols-3">
        {grouped.map((stage) => (
          <section key={stage.value} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[var(--text)]">{stage.label}</h2>
              <Badge tone={stage.tone}>{stage.items.length}</Badge>
            </div>
            <div className="grid gap-3">
              {stage.items.length ? stage.items.map((item) => (
                <ItemCard
                  key={item.id}
                  title={item.title}
                  meta={<><span>{item.clientName}</span>{item.value ? <Badge tone="amber">{item.value}</Badge> : null}</>}
                  actions={<Button variant="danger" onClick={() => deletePipelineItem(item.id)} icon={<Trash2 size={15} />} aria-label="Delete opportunity" />}
                >
                  {item.nextStep ? <p><strong className="text-[var(--text)]">Next:</strong> {item.nextStep}</p> : null}
                  {item.notes ? <p>{item.notes}</p> : null}
                  {stage.value !== "won" && stage.value !== "lost" ? (
                    <Button className="mt-3" variant="secondary" onClick={() => updatePipelineItem(item.id, { stage: "active" })}>Move to active</Button>
                  ) : null}
                </ItemCard>
              )) : <EmptyState>No {stage.label.toLowerCase()} items.</EmptyState>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
