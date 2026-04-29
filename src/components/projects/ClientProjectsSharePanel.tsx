import { Check, Copy, Link2, Loader2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { createProjectShare } from "../../integrations/supabase/projectShares";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import type { Project } from "../../types/project";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

export function ClientProjectsSharePanel({ projects }: { projects: Project[] }) {
  const [clientName, setClientName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedIds.includes(project.id)),
    [projects, selectedIds],
  );

  const toggleProject = (projectId: string) => {
    setShareUrl("");
    setMessage("");
    setSelectedIds((current) =>
      current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId],
    );
  };

  const createClientLink = async () => {
    if (!selectedProjects.length) {
      setMessage("Select at least one project to create a client overview link.");
      return;
    }

    setWorking(true);
    setMessage("");

    try {
      const shares = await Promise.all(selectedProjects.map((project) => createProjectShare(project)));
      const tokens = shares.map((share) => share.token).join(",");
      const url = new URL(`${window.location.origin}/share/client`);
      url.searchParams.set("projects", tokens);
      if (clientName.trim()) {
        url.searchParams.set("client", clientName.trim());
      }
      setShareUrl(url.toString());
      setMessage(`${selectedProjects.length} project overview link is ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create client overview link.");
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UsersRound size={18} className="text-[var(--text-muted)]" />
            <h2 className="text-lg font-bold text-[var(--text)]">Client project overview</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Create one read-only link for an agency or client to see only the projects you select.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <Button icon={<Link2 size={16} />} onClick={() => void createClientLink()} disabled={working || !isSupabaseConfigured || !projects.length}>
            {working ? "Creating..." : "Create Overview Link"}
          </Button>
          <Button variant="secondary" icon={working ? <Loader2 size={16} className="animate-spin" /> : copied ? <Check size={16} /> : <Copy size={16} />} onClick={() => void copyLink()} disabled={!shareUrl}>
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Client or agency name, optional" />
        <div className="flex min-w-0 flex-wrap gap-2">
          {projects.map((project) => {
            const selected = selectedIds.includes(project.id);

            return (
              <label
                key={project.id}
                className={`inline-flex max-w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleProject(project.id)}
                  className="h-4 w-4 accent-[var(--brand-primary)]"
                />
                <span className="truncate">{project.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {shareUrl ? (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
          <span className="block truncate">{shareUrl}</span>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p> : null}
    </Card>
  );
}
