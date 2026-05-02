import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { EmptyState, ItemCard, StudioForm, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";
import type { ResourceCategory } from "../types/studio";

const categories: Array<{ value: ResourceCategory; label: string }> = [
  { value: "inspiration", label: "Inspiration" },
  { value: "icons", label: "Icons" },
  { value: "fonts", label: "Fonts" },
  { value: "tools", label: "Tools" },
  { value: "wordpress", label: "WordPress" },
  { value: "learning", label: "Learning" },
  { value: "other", label: "Other" },
];

export function ResourceVault() {
  const { resources, addResource, deleteResource } = useStudioStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "all">("all");
  const [form, setForm] = useState({ title: "", url: "", notes: "", tags: "", category: "inspiration" as ResourceCategory });

  const filtered = useMemo(
    () =>
      resources.filter((item) => {
        const haystack = `${item.title} ${item.url ?? ""} ${item.notes ?? ""} ${item.tags ?? ""}`.toLowerCase();
        return (category === "all" || item.category === category) && haystack.includes(query.toLowerCase());
      }),
    [category, query, resources],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    addResource({ ...form, title: form.title.trim(), url: form.url.trim() || undefined });
    setForm({ title: "", url: "", notes: "", tags: "", category: "inspiration" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Vault" description="Keep inspiration, icons, tools, references, and useful links in one calm place." />
      <form onSubmit={submit}>
        <StudioForm title="Save a resource" description="Add websites, icon packs, references, or learning links you reuse in client work." actionLabel="Save Resource">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr]">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Resource name" />
            <Input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." />
            <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ResourceCategory })}>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
            <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Tags, comma separated" />
            <StudioTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Why this is useful..." />
          </div>
        </StudioForm>
      </form>
      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-[1fr_220px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources" />
        <Select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory | "all")}>
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </Select>
      </div>
      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              title={item.title}
              meta={<><Badge tone="blue">{categories.find((entry) => entry.value === item.category)?.label}</Badge>{item.tags ? <span>{item.tags}</span> : null}</>}
              actions={
                <>
                  {item.url ? <Button variant="secondary" onClick={() => navigator.clipboard.writeText(item.url!)} icon={<Copy size={15} />} aria-label="Copy link" /> : null}
                  {item.url ? <Button variant="secondary" onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")} icon={<ExternalLink size={15} />} aria-label="Open link" /> : null}
                  <Button variant="danger" onClick={() => deleteResource(item.id)} icon={<Trash2 size={15} />} aria-label="Delete resource" />
                </>
              }
            >
              {item.notes || item.url || "No notes yet."}
            </ItemCard>
          ))}
        </div>
      ) : (
        <EmptyState>No resources saved yet.</EmptyState>
      )}
    </div>
  );
}
