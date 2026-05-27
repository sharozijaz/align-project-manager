import { MailPlus, ShieldCheck, UserMinus, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { inviteProjectCollaborator, listProjectCollaborators, removeProjectCollaborator } from "../../integrations/supabase/collaboration";
import { supabase } from "../../integrations/supabase/client";
import type { ProjectCollaborator } from "../../types/collaboration";
import type { Project } from "../../types/project";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { useConfirm } from "../ui/ConfirmProvider";

export function ProjectCollaboratorsPanel({
  project,
  collaborators,
  onChange,
}: {
  project: Project;
  collaborators: ProjectCollaborator[];
  onChange: (collaborators: ProjectCollaborator[]) => void;
}) {
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const activeCollaborators = useMemo(() => collaborators.filter((collaborator) => collaborator.status !== "removed"), [collaborators]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    listProjectCollaborators(project.id)
      .then((rows) => {
        if (mounted) onChange(rows);
      })
      .catch((error) => {
        if (mounted) setStatus(error instanceof Error ? error.message : "Could not load collaborators.");
      });
    return () => {
      mounted = false;
    };
  }, [onChange, project.id]);

  const handleInvite = async () => {
    const inviteeEmail = email.trim().toLowerCase();
    if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(inviteeEmail)) {
      setStatus("Enter a valid email address.");
      return;
    }

    try {
      setStatus(null);
      const collaborator = await inviteProjectCollaborator(project, inviteeEmail);
      onChange(upsertCollaborator(collaborators, collaborator));
      setEmail("");
      setStatus(`${inviteeEmail} can now open this shared project after signing in.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not invite collaborator.");
    }
  };

  const handleRemove = async (collaborator: ProjectCollaborator) => {
    const shouldRemove = await confirm({
      title: "Remove project collaborator?",
      description: `${collaborator.inviteeEmail} will lose access to this project after reload or refresh.`,
      confirmLabel: "Remove Access",
      tone: "danger",
    });
    if (!shouldRemove) return;

    try {
      await removeProjectCollaborator(collaborator.id);
      onChange(collaborators.filter((item) => item.id !== collaborator.id));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove collaborator.");
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-primary)]">
            <UsersRound size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text)]">Collaborators</h2>
              <Badge tone="emerald">
                <ShieldCheck size={12} />
                Project-only
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Guests can see and edit this project&apos;s tasks only. Resources, private notes, settings, admin, and other projects stay hidden.
            </p>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(220px,1fr)_auto] lg:w-[min(520px,42vw)]">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="colleague@example.com" type="email" />
          <Button type="button" icon={<MailPlus size={16} />} onClick={() => void handleInvite()}>
            Invite
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {activeCollaborators.length ? (
          activeCollaborators.map((collaborator) => {
            const collaboratorStatus = collaborator.status === "active" || collaborator.inviteeUserId || collaborator.acceptedAt ? "active" : "invited";
            return (
              <span
                key={collaborator.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-semibold text-[var(--text)]"
              >
                {collaborator.inviteeEmail}
                <Badge tone={collaboratorStatus === "active" ? "emerald" : "purple"}>{collaboratorStatus}</Badge>
                <button
                  type="button"
                  className="grid h-6 w-6 place-items-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                  onClick={() => void handleRemove(collaborator)}
                  aria-label={`Remove ${collaborator.inviteeEmail}`}
                >
                  <UserMinus size={13} />
                </button>
              </span>
            );
          })
        ) : (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--empty-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
            No collaborators yet.
          </div>
        )}
      </div>
      {status ? <p className="mt-3 text-sm font-medium text-[var(--text-muted)]">{status}</p> : null}
    </Card>
  );
}

function upsertCollaborator(collaborators: ProjectCollaborator[], next: ProjectCollaborator) {
  const existing = collaborators.some((collaborator) => collaborator.id === next.id);
  return existing ? collaborators.map((collaborator) => (collaborator.id === next.id ? next : collaborator)) : [...collaborators, next];
}
