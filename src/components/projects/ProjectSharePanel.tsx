import { Check, Copy, ExternalLink, Link2, Loader2, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createProjectShare, getProjectShare, revokeProjectShare } from "../../integrations/supabase/projectShares";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import type { Project } from "../../types/project";
import type { ProjectShare } from "../../types/projectShare";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function ProjectSharePanel({ project }: { project: Project }) {
  const [share, setShare] = useState<ProjectShare | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [working, setWorking] = useState(false);
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
      setShare(await createProjectShare(project));
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

  return (
    <Card className="p-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
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
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
              <span className="block max-w-[360px] truncate">{shareUrl}</span>
            </div>
            <Button variant="secondary" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
            <a href={shareUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" icon={<ExternalLink size={16} />}>
                Open
              </Button>
            </a>
            <Button variant="danger" icon={<X size={16} />} onClick={handleRevoke} disabled={working}>
              Disable
            </Button>
          </div>
        ) : (
          <Button icon={<Link2 size={16} />} onClick={handleCreate} disabled={working || !isSupabaseConfigured}>
            {working ? "Creating..." : "Create Link"}
          </Button>
        )}
      </div>
    </Card>
  );
}
