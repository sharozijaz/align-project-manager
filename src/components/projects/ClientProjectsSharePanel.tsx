import { Check, Copy, ExternalLink, Link2, Loader2, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createClientShareLink,
  listClientShareLinks,
  revokeClientShareLink,
} from "../../integrations/supabase/projectShares";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import type { Project } from "../../types/project";
import type { ClientShareLink } from "../../types/projectShare";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

export function ClientProjectsSharePanel({ projects }: { projects: Project[] }) {
  const [clientName, setClientName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [links, setLinks] = useState<ClientShareLink[]>([]);
  const [activeLinkId, setActiveLinkId] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [working, setWorking] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [message, setMessage] = useState("");

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedIds.includes(project.id)),
    [projects, selectedIds],
  );
  const activeLink = links.find((link) => link.id === activeLinkId);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    void listClientShareLinks()
      .then((nextLinks) => {
        if (mounted) setLinks(nextLinks);
      })
      .catch((error) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "Could not load saved links.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleProject = (projectId: string) => {
    setActiveLinkId("");
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
      const link = await createClientShareLink({ name: clientName, projects: selectedProjects });
      setLinks((current) => [link, ...current]);
      setActiveLinkId(link.id);
      setClientName("");
      setSelectedIds([]);
      setMessage(`${link.name || "Client overview"} is saved and ready to share.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create client overview link.");
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async (link: ClientShareLink) => {
    const url = clientShareUrl(link);
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(""), 1800);
  };

  const deleteLink = async (link: ClientShareLink) => {
    if (!window.confirm(`Delete "${link.name || "this overview link"}"? The public URL will stop working.`)) return;

    setWorking(true);
    setMessage("");
    try {
      await revokeClientShareLink(link.id);
      setLinks((current) => current.filter((item) => item.id !== link.id));
      if (activeLinkId === link.id) setActiveLinkId("");
      setMessage("Client overview link deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete client overview link.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UsersRound size={18} className="text-[var(--text-muted)]" />
              <h2 className="text-lg font-bold text-[var(--text)]">Client project overview</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Save read-only overview links for agencies or clients. You can recover, copy, open, or delete them later.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Button icon={<Link2 size={16} />} onClick={() => void createClientLink()} disabled={working || !isSupabaseConfigured || !projects.length}>
              {working ? "Creating..." : "Create Saved Link"}
            </Button>
            <Button
              variant="secondary"
              icon={copiedId && activeLink ? <Check size={16} /> : <Copy size={16} />}
              onClick={() => activeLink && void copyLink(activeLink)}
              disabled={!activeLink}
            >
              {copiedId && activeLink ? "Copied" : "Copy Selected"}
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

        {activeLink ? (
          <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-3 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">{clientShareUrl(activeLink)}</span>
            <Button variant="secondary" icon={<ExternalLink size={16} />} onClick={() => window.open(clientShareUrl(activeLink), "_blank", "noreferrer")}>
              Open
            </Button>
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p> : null}
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Saved links</h3>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" />
              Loading
            </span>
          ) : (
            <span className="text-xs font-semibold text-[var(--text-muted)]">{links.length} active</span>
          )}
        </div>
        {links.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {links.map((link) => (
              <SavedClientLink
                key={link.id}
                link={link}
                projects={projects}
                selected={link.id === activeLinkId}
                copied={copiedId === link.id}
                working={working}
                onSelect={() => setActiveLinkId(link.id)}
                onCopy={() => void copyLink(link)}
                onDelete={() => void deleteLink(link)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-6 text-center text-sm text-[var(--text-muted)]">
            {loading ? "Checking for saved overview links..." : "No saved client overview links yet."}
          </div>
        )}
      </div>
    </Card>
  );
}

function SavedClientLink({
  link,
  projects,
  selected,
  copied,
  working,
  onSelect,
  onCopy,
  onDelete,
}: {
  link: ClientShareLink;
  projects: Project[];
  selected: boolean;
  copied: boolean;
  working: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const linkedProjects = link.projectIds
    .map((id) => projects.find((project) => project.id === id)?.name)
    .filter(Boolean);

  return (
    <article
      className={`rounded-[var(--radius-sm)] border p-4 transition ${
        selected
          ? "border-[var(--brand-primary)] bg-[var(--surface-hover)]"
          : "border-[var(--border)] bg-[var(--surface-raised)]"
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate font-bold text-[var(--text)]">{link.name || "Client overview"}</h4>
            <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
              {linkedProjects.length} projects · Created {dateLabel(link.createdAt.slice(0, 10))}
            </p>
          </div>
          <span className="rounded-full bg-[var(--status-completed-bg)] px-2 py-1 text-xs font-bold text-[var(--status-completed-text)]">
            active
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-[var(--text-muted)]">
          {linkedProjects.length ? linkedProjects.join(", ") : "Projects from this saved overview"}
        </p>
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" icon={copied ? <Check size={15} /> : <Copy size={15} />} onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="secondary" icon={<ExternalLink size={15} />} onClick={() => window.open(clientShareUrl(link), "_blank", "noreferrer")}>
          Open
        </Button>
        <Button variant="danger" icon={<Trash2 size={15} />} onClick={onDelete} disabled={working}>
          Delete
        </Button>
      </div>
    </article>
  );
}

function clientShareUrl(link: ClientShareLink) {
  return `${window.location.origin}/share/client/${link.token}`;
}
