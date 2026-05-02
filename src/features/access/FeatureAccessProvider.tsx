import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUserAccess, type UserAccess } from "../../integrations/supabase/access";
import { isSupabaseConfigured } from "../../integrations/supabase/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { featureLabels, ownerFeatures, type FeatureKey } from "./featureRegistry";

interface FeatureAccessContextValue {
  access: UserAccess | null;
  loading: boolean;
  refreshAccess: () => Promise<void>;
  hasFeature: (feature: FeatureKey) => boolean;
}

const FeatureAccessContext = createContext<FeatureAccessContextValue | null>(null);

export function FeatureAccessProvider({ session, children }: { session: Session | null; children: ReactNode }) {
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(Boolean(session));

  const refreshAccess = async () => {
    if (!session) {
      setAccess(
        isSupabaseConfigured
          ? null
          : {
              profile: {
                id: null,
                email: "local@align.app",
                displayName: "Local workspace",
                role: "owner",
                active: true,
                createdAt: null,
                updatedAt: null,
              },
              features: ownerFeatures,
              source: "offline",
            },
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setAccess(await getCurrentUserAccess(session));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, session?.user.email]);

  const value = useMemo<FeatureAccessContextValue>(
    () => ({
      access,
      loading,
      refreshAccess,
      hasFeature: (feature) => Boolean(access?.features.includes(feature)),
    }),
    [access, loading],
  );

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-[var(--text-muted)]">
        Loading workspace access...
      </div>
    );
  }

  if (!access?.profile.active) {
    return (
      <AccessShell title="Access not enabled" description="This account is signed in, but it has not been invited to this Align workspace yet." />
    );
  }

  return <FeatureAccessContext.Provider value={value}>{children}</FeatureAccessContext.Provider>;
}

export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error("useFeatureAccess must be used inside FeatureAccessProvider.");
  }
  return context;
}

export function RequireFeature({ feature, children }: { feature: FeatureKey; children: ReactNode }) {
  const { hasFeature } = useFeatureAccess();
  const location = useLocation();

  if (!hasFeature(feature)) {
    return <AccessShell title="Module not enabled" description={`${featureLabels[feature]} is not enabled for this account.`} from={location.pathname} />;
  }

  return children;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const { access, hasFeature } = useFeatureAccess();

  if (access?.profile.role !== "owner" || !hasFeature("admin")) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AccessShell({ title, description, from }: { title: string; description: string; from?: string }) {
  return (
    <div className="mx-auto grid min-h-[45vh] max-w-xl place-items-center p-4">
      <Card className="w-full border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        {from ? <p className="mt-2 text-xs text-[var(--text-soft)]">Requested path: {from}</p> : null}
        <Button className="mt-5" onClick={() => window.history.back()} variant="secondary">
          Go back
        </Button>
      </Card>
    </div>
  );
}
