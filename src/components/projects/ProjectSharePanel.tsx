import { Check, Copy, ExternalLink, KeyRound, Link2, Loader2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createProjectShare, getProjectShare, revokeProjectShare, updateProjectSharePassword } from "../../integrations/supabase/projectShares";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import type { Project } from "../../types/project";
import type { ProjectShare } from "../../types/projectShare";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

export function ProjectSharePanel({ project }: { project: Project }) {
  const [share, setShare] = useState<ProjectShare | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [working, setWorking] = useState(false);
  const [passwordWorking, setPasswordWorking] = useState(false);
  const [password, setPassword] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const shareUrl = useMemo(() => (share ? `${window.location.origin}/share/${share.token}` : ""), [share]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    void getProjectShare(project.id)
      .then((nextShare) => {
        if (mounted) setShare(nextShare);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Could not load share link.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [project.id]);

  const handleCreate = async () => {
    setWorking(true);
    setError("");
    try {
      const nextShare = await createProjectShare(project);
      setShare(nextShare);
      setShareModalOpen(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create share link.");
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleRevoke = async () => {
    if (!share || !window.confirm("Disable this client share link?")) return;

    setWorking(true);
    setError("");
    try {
      await revokeProjectShare(share.id);
      setShare(null);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Could not disable share link.");
    } finally {
      setWorking(false);
    }
  };

  const handlePasswordUpdate = async (nextPassword: string) => {
    if (!share) return;

    setPasswordWorking(true);
    setError("");
    try {
      const updatedShare = await updateProjectSharePassword(share, nextPassword);
      setShare(updatedShare);
      setPassword("");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Could not update share password.");
    } finally {
      setPasswordWorking(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Share2 size={17} className="text-[var(--text-muted)]" />
            <h2 className="text-base font-bold text-[var(--text)]">Client share link</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Read-only project view for clients. They cannot edit or see the rest of your workspace.</p>
          {error ? <p className="mt-2 text-sm text-[var(--button-danger-text)]">{error}</p> : null}
        </div>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            Checking link
          </div>
        ) : share ? (
          <div className="flex w-full min-w-0 flex-col gap-3 lg:max-w-2xl">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
                <span className="block truncate">{shareUrl}</span>
              </div>
              <Button variant="secondary" icon={<KeyRound size={16} />} onClick={() => setShareModalOpen(true)}>
                Share Options
              </Button>
            </div>
          </div>
        ) : (
          <Button icon={<Link2 size={16} />} onClick={handleCreate} disabled={working || !isSupabaseConfigured}>
            {working ? "Creating..." : "Create Link"}
          </Button>
        )}
      </div>
      {share ? (
        <Modal title="Share project" open={shareModalOpen} onClose={() => setShareModalOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">Client link</p>
              <p className="mt-2 break-all text-sm text-[var(--text-muted)]">{shareUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={handleCopy}>
                  {copied ? "Copied" : "Copy Link"}
                </Button>
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  <Button type="button" variant="secondary" icon={<ExternalLink size={16} />}>
                    Open
                  </Button>
                </a>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Optional password</p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">Use this when a client wants the link to stay private.</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    share.passwordProtected
                      ? "bg-[var(--status-completed-bg)] text-[var(--status-completed-text)]"
                      : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                  }`}
                >
                  {share.passwordProtected ? "Protected" : "No password"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={share.passwordProtected ? "Enter a new password" : "Add a password for this link"}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handlePasswordUpdate(password)}
                  disabled={passwordWorking || !password.trim()}
                >
                  {share.passwordProtected ? "Update" : "Set"}
                </Button>
                {share.passwordProtected ? (
                  <Button type="button" variant="secondary" onClick={() => void handlePasswordUpdate("")} disabled={passwordWorking}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="danger" icon={<X size={16} />} onClick={handleRevoke} disabled={working}>
                Disable Link
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </Card>
  );
}
