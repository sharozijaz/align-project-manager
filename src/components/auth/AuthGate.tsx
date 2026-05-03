import { useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { FeatureAccessProvider } from "../../features/access/FeatureAccessProvider";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from "../../integrations/supabase/client";
import { useSupabaseSession } from "../../integrations/supabase/useSupabaseSession";
import { isRateLimitMessage, useMagicLinkCooldown } from "../../hooks/useMagicLinkCooldown";
import { useThemeStore } from "../../store/themeStore";
import { errorMessage } from "../../utils/errors";
import { AppLoadingScreen } from "../layout/AppLoadingScreen";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const magicLinkCooldown = useMagicLinkCooldown();

  if (!isSupabaseConfigured) return <FeatureAccessProvider session={null}>{children}</FeatureAccessProvider>;

  if (loading) {
    return <AppLoadingScreen message="Checking secure session" />;
  }

  if (session) return <FeatureAccessProvider session={session}>{children}</FeatureAccessProvider>;

  const sendMagicLink = async () => {
    if (!supabase || !email.trim() || magicLinkCooldown.isCoolingDown) return;

    setSending(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;
      magicLinkCooldown.startCooldown();
      setMessage("Magic link sent. Open it to access Align.");
    } catch (error) {
      const message = errorMessage(error, "Could not send magic link.");
      if (isRateLimitMessage(message)) {
        magicLinkCooldown.startRateLimitCooldown();
      }
      setMessage(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-6 flex items-center gap-3">
        <img src="/align-icon.png" alt="" className="h-11 w-11 rounded-[var(--radius-md)]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Align</h1>
          <p className="text-sm text-[var(--text-muted)]">Secure workspace access</p>
        </div>
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-muted)] p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 text-[var(--brand-accent)]" size={18} />
          <div>
            <p className="font-semibold text-[var(--text)]">Sign in required</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Your workspace is private. Use an invited email to receive a secure magic link.
            </p>
          </div>
        </div>
      </div>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMagicLink();
        }}
      >
        <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        <Button type="submit" disabled={sending || magicLinkCooldown.isCoolingDown || !email.trim()}>
          {sending ? "Sending..." : magicLinkCooldown.label}
        </Button>
      </form>
      {message ? <p className="mt-4 text-sm text-[var(--text-muted)]">{message}</p> : null}
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div data-theme={theme} className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text)]">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-md place-items-center">
        <Card className="w-full border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-md)]">
          {children}
        </Card>
      </div>
    </div>
  );
}
