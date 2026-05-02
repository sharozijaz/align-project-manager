import { Check, ChevronDown, Copy, ExternalLink, KeyRound, Link2, Loader2, LockKeyhole, Search, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  createClientShareLink,
  listClientShareLinks,
  revokeClientShareLink,
  updateClientShareLinkPassword,
} from "../../integrations/supabase/projectShares";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import type { Project } from "../../types/project";
import type { ClientShareLink } from "../../types/projectShare";
import { dateLabel } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export function ClientProjectsSharePanel({ projects }: { projects: Project[] }) {
  const [clientName, setClientName] = useState("");
  const [modalPassword, setModalPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [links, setLinks] = useState<ClientShareLink[]>([]);
  const [activeLinkId, setActiveLinkId] = useState("");
  const [shareModalLinkId, setShareModalLinkId] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [working, setWorking] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [message, setMessage] = useState("");
  const [sharingOpen, setSharingOpen] = useState(false);

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedIds.includes(project.id)),
    [projects, selectedIds],
  );
  const visibleLinks = useMemo(() => {
    const query = linkSearch.trim().toLowerCase();
    if (!query) return links;
    return links.filter((link) => {
      const linkedProjects = link.projectIds
        .map((id) => projects.find((project) => project.id === id)?.name ?? "")
        .join(" ")
        .toLowerCase();
      return `${link.name} ${linkedProjects}`.toLowerCase().includes(query);
    });
  }, [linkSearch, links, projects]);
  const activeLink = links.find((link) => link.id === activeLinkId);
  const shareModalLink = links.find((link) => link.id === shareModalLinkId) || null;

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
      setShareModalLinkId(link.id);
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
      if (shareModalLinkId === link.id) setShareModalLinkId("");
      setMessage("Client overview link deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete client overview link.");
    } finally {
      setWorking(false);
    }
  };

  const updateLinkPassword = async (link: ClientShareLink, nextPassword: string) => {
    setWorking(true);
    setMessage("");
    try {
      const updatedLink = await updateClientShareLinkPassword(link, nextPassword);
      setLinks((current) => current.map((item) => (item.id === link.id ? updatedLink : item)));
      setModalPassword("");
      setMessage(nextPassword.trim() ? "Client overview password updated." : "Client overview password removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update client overview password.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <button
          type="button"
          onClick={() => setSharingOpen((open) => !open)}
          className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
          aria-expanded={sharingOpen}
        >
          <div className="flex min-w-0 gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-muted)]">
              <UsersRound size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text)]">Client sharing</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                  <LockKeyhole size={13} />
                  Read-only
                </span>
                {links.length ? (
                  <span className="rounded-full bg-[var(--bg-muted)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
                    {links.length} saved
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Create, copy, password-protect, or delete client overview links when you need them.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-2 text-sm font-bold text-[var(--button-secondary-text)]">
            {sharingOpen ? "Hide sharing" : "Open sharing"}
            <ChevronDown size={16} className={`transition-transform ${sharingOpen ? "rotate-180" : ""}`} />
          </span>
        </button>
      </Card>

      <AnimatePresence initial={false}>
        {sharingOpen ? (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="flex min-w-0 gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-muted)] sm:flex">
                <UsersRound size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-[var(--text)]">Share Client Overview</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--button-secondary-bg)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                    <LockKeyhole size={13} />
                    Read-only access
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
                  Create read-only links for clients or agencies to view selected project overviews. You can copy, open, password-protect, or delete links anytime.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
              <Button icon={<Link2 size={16} />} onClick={() => void createClientLink()} disabled={working || !isSupabaseConfigured || !projects.length}>
                {working ? "Creating..." : "Create Share Link"}
              </Button>
              <Button
                variant="secondary"
                icon={copiedId && activeLink ? <Check size={16} /> : <Copy size={16} />}
                onClick={() => activeLink && void copyLink(activeLink)}
                disabled={!activeLink}
              >
                {copiedId && activeLink ? "Copied" : "Copy Latest Link"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
          <label className="grid gap-2 text-sm font-semibold text-[var(--text)]">
            Client or agency name
            <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="e.g. Acme Marketing" />
          </label>
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text)]">Projects to include</p>
              <span className="text-xs font-bold text-[var(--text-soft)]">{selectedIds.length} selected</span>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {projects.map((project) => {
                const selected = selectedIds.includes(project.id);

                return (
                  <label
                    key={project.id}
                    className={`inline-flex max-w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-[0_0_0_1px_var(--brand-primary)]"
                        : "border-[var(--border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${selected ? "border-white/40 bg-white/20" : "border-[var(--border-strong)]"}`}>
                      {selected ? <Check size={12} /> : null}
                    </span>
                    <input type="checkbox" checked={selected} onChange={() => toggleProject(project.id)} className="sr-only" />
                    <span className="truncate">{project.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <ShieldCheck size={16} className="text-[var(--status-completed-text)]" />
              Latest link
            </div>
            {activeLink ? (
              <>
                <span className="inline-flex w-fit rounded-full bg-[var(--status-completed-bg)] px-2 py-1 text-xs font-bold text-[var(--status-completed-text)]">Active</span>
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">{clientShareUrl(activeLink)}</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={copiedId === activeLink.id ? <Check size={16} /> : <Copy size={16} />} onClick={() => void copyLink(activeLink)}>
                    {copiedId === activeLink.id ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<ExternalLink size={16} />}
                    onClick={() => window.open(clientShareUrl(activeLink), "_blank", "noreferrer")}
                  >
                    Open
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<KeyRound size={16} />}
                    onClick={() => {
                      setModalPassword("");
                      setShareModalLinkId(activeLink.id);
                    }}
                  >
                    Share Options
                  </Button>
                </div>
              </>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">Create or select a saved link to preview it here.</span>
            )}
          </div>
          {message ? <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p> : null}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-[var(--text-muted)]" />
            <h3 className="text-lg font-bold text-[var(--text)]">Saved Links</h3>
            <span className="rounded-full bg-[var(--bg-muted)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">{links.length}</span>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <Input className="pl-9" value={linkSearch} onChange={(event) => setLinkSearch(event.target.value)} placeholder="Search clients or links..." />
          </label>
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
              <Loader2 size={16} className="animate-spin" />
              Loading saved links
            </div>
          ) : visibleLinks.length ? (
            <motion.div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]" layout>
              <AnimatePresence initial={false}>
              {visibleLinks.map((link) => (
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
                onManage={() => {
                  setActiveLinkId(link.id);
                  setModalPassword("");
                  setShareModalLinkId(link.id);
                }}
                />
              ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] p-6 text-center text-sm text-[var(--text-muted)]">
              {links.length ? "No saved links match your search." : "No saved client overview links yet."}
            </div>
          )}
          <p className="mt-4 text-center text-sm text-[var(--text-soft)]">Share links provide read-only access and do not require an Align account.</p>
        </div>
      </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {shareModalLink ? (
        <Modal title="Share client overview" open={Boolean(shareModalLink)} onClose={() => setShareModalLinkId("")}>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Overview link</p>
              <p className="mt-2 break-all text-sm text-[var(--text-muted)]">{clientShareUrl(shareModalLink)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" icon={copiedId === shareModalLink.id ? <Check size={16} /> : <Copy size={16} />} onClick={() => void copyLink(shareModalLink)}>
                  {copiedId === shareModalLink.id ? "Copied" : "Copy Link"}
                </Button>
                <Button
                  variant="secondary"
                  icon={<ExternalLink size={16} />}
                  onClick={() => window.open(clientShareUrl(shareModalLink), "_blank", "noreferrer")}
                >
                  Open
                </Button>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Optional password</p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">Use this for private agency or client overview links.</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    shareModalLink.passwordProtected
                      ? "bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]"
                      : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  }`}
                >
                  {shareModalLink.passwordProtected ? "Protected" : "No password"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  value={modalPassword}
                  onChange={(event) => setModalPassword(event.target.value)}
                  placeholder={shareModalLink.passwordProtected ? "Enter a new password" : "Add a password for this link"}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void updateLinkPassword(shareModalLink, modalPassword)}
                  disabled={working || !modalPassword.trim()}
                >
                  {shareModalLink.passwordProtected ? "Update" : "Set"}
                </Button>
                {shareModalLink.passwordProtected ? (
                  <Button type="button" variant="secondary" onClick={() => void updateLinkPassword(shareModalLink, "")} disabled={working}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void deleteLink(shareModalLink)} disabled={working}>
                Delete Link
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
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
  onManage,
}: {
  link: ClientShareLink;
  projects: Project[];
  selected: boolean;
  copied: boolean;
  working: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onManage: () => void;
}) {
  const linkedProjects = link.projectIds
    .map((id) => projects.find((project) => project.id === id)?.name)
    .filter(Boolean);
  const initials = (link.name || "Client overview")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`grid gap-4 bg-[var(--surface-raised)] p-4 transition lg:grid-cols-[minmax(220px,0.8fr)_minmax(260px,1.4fr)_auto] lg:items-center ${selected ? "shadow-[inset_4px_0_0_var(--brand-primary)]" : ""}`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-3 text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-primary-bg)] text-sm font-black text-[var(--button-primary-text)]">
          {initials || "CL"}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold text-[var(--text)]">{link.name || "Client overview"}</span>
          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">
            {linkedProjects.length} projects · Created {dateLabel(link.createdAt.slice(0, 10))}
          </span>
        </span>
      </button>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold text-[var(--text-soft)]">Included projects</p>
        <div className="flex flex-wrap gap-2">
          {linkedProjects.slice(0, 3).map((name) => (
            <span key={name} className="max-w-full truncate rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--button-secondary-bg)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
              {name}
            </span>
          ))}
          {linkedProjects.length > 3 ? (
            <span className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
              +{linkedProjects.length - 3}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-completed-bg)] px-2 py-1 text-xs font-bold text-[var(--status-completed-text)]">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Active
        </span>
        {link.passwordProtected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--priority-urgent-bg)] px-2 py-1 text-xs font-bold text-[var(--priority-urgent-text)]">
            <KeyRound size={12} />
            Protected
          </span>
        ) : null}
        <Button variant="ghost" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={onCopy} title="Copy link">
          Copy
        </Button>
        <Button variant="ghost" icon={<ExternalLink size={16} />} onClick={() => window.open(clientShareUrl(link), "_blank", "noreferrer")} title="Open link">
          Open
        </Button>
        <Button variant="ghost" icon={<KeyRound size={16} />} onClick={onManage} title="Share options">
          Options
        </Button>
        <Button variant="danger" icon={<Trash2 size={16} />} onClick={onDelete} disabled={working} title="Delete link">
          Delete
        </Button>
      </div>
    </motion.article>
  );
}

function clientShareUrl(link: ClientShareLink) {
  return `${window.location.origin}/share/client/${link.token}`;
}
