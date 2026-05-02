import { Copy, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState, ItemCard, StudioForm, StudioTextarea } from "../components/studio/StudioForm";
import { useStudioStore } from "../store/studioStore";

export function PromptLibrary() {
  const { prompts, addPrompt, deletePrompt } = useStudioStore();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", useCase: "", content: "", tags: "" });

  const filtered = useMemo(
    () => prompts.filter((prompt) => `${prompt.title} ${prompt.useCase} ${prompt.content} ${prompt.tags ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [prompts, query],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    addPrompt({ ...form, title: form.title.trim(), content: form.content.trim() });
    setForm({ title: "", useCase: "", content: "", tags: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Prompt Library" description="Store reusable prompts for website copy, brand assets, mockups, and AI-assisted build work." />
      <form onSubmit={submit}>
        <StudioForm title="Add a prompt" description="Save the exact wording that works, then copy it when you need it again." actionLabel="Save Prompt">
          <div className="grid gap-3 lg:grid-cols-3">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Prompt title" />
            <Input value={form.useCase} onChange={(event) => setForm({ ...form, useCase: event.target.value })} placeholder="Use case, e.g. hero copy" />
            <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="Tags" />
          </div>
          <StudioTextarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Paste the prompt..." className="min-h-36" />
        </StudioForm>
      </form>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prompts" />
      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((prompt) => (
            <ItemCard
              key={prompt.id}
              title={prompt.title}
              meta={<><Badge tone="purple">{prompt.useCase || "General"}</Badge>{prompt.tags ? <span>{prompt.tags}</span> : null}</>}
              actions={
                <>
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(prompt.content)} icon={<Copy size={15} />}>Copy</Button>
                  <Button variant="danger" onClick={() => deletePrompt(prompt.id)} icon={<Trash2 size={15} />} aria-label="Delete prompt" />
                </>
              }
            >
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--bg-soft)] p-3 font-sans text-sm">{prompt.content}</pre>
            </ItemCard>
          ))}
        </div>
      ) : (
        <EmptyState>No prompts saved yet.</EmptyState>
      )}
    </div>
  );
}
