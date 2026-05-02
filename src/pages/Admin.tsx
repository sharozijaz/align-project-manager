import { CheckCircle2, RefreshCcw, Shield, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { featureRegistry, type AppRole, type FeatureKey } from "../features/access/featureRegistry";
import { useFeatureAccess } from "../features/access/FeatureAccessProvider";
import { listAdminUsers, saveAdminUser, setUserFeature, type AdminUser } from "../integrations/supabase/access";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { PageHeader } from "../components/layout/PageHeader";
import { errorMessage } from "../utils/errors";

const roleOptions: Array<{ value: AppRole; label: string; description: string }> = [
  { value: "owner", label: "Owner", description: "Full access to every module and Admin." },
  { value: "member", label: "Member", description: "Project Management by default, optional modules by toggle." },
  { value: "client", label: "Client", description: "Reserved for future account-based client access." },
];

const selectableFeatures = featureRegistry.filter((feature) => feature.key !== "admin");

export function Admin() {
  const { access, refreshAccess } = useFeatureAccess();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AppRole>("member");
  const [features, setFeatures] = useState<FeatureKey[]>(["project_management"]);

  const ownerEmail = access?.profile.email;

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");
    try {
      setUsers(await listAdminUsers());
    } catch (error) {
      setMessage(errorMessage(error, "Could not load admin users. Run the feature access SQL migration if this is the first setup."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const selectedFeatures = useMemo(() => new Set(features), [features]);

  const toggleDraftFeature = (feature: FeatureKey) => {
    if (feature === "project_management") return;
    setFeatures((current) => (current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]));
  };

  const inviteUser = async () => {
    if (!email.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      await saveAdminUser({
        email,
        displayName,
        role,
        active: true,
        features,
      });
      setEmail("");
      setDisplayName("");
      setRole("member");
      setFeatures(["project_management"]);
      await loadUsers();
      await refreshAccess();
      setMessage("User access saved.");
    } catch (error) {
      setMessage(errorMessage(error, "Could not save this user."));
    } finally {
      setSaving(false);
    }
  };

  const toggleUserFeature = async (user: AdminUser, feature: FeatureKey) => {
    if (!user.id || user.role === "owner" || feature === "project_management") return;

    const nextEnabled = !user.features.includes(feature);
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? {
              ...item,
              features: nextEnabled ? [...item.features, feature] : item.features.filter((userFeature) => userFeature !== feature),
            }
          : item,
      ),
    );

    try {
      await setUserFeature(user.id, feature, nextEnabled);
    } catch (error) {
      setMessage(errorMessage(error, "Could not update feature access."));
      await loadUsers();
    }
  };

  const updateUserRole = async (user: AdminUser, nextRole: AppRole) => {
    if (user.email === ownerEmail && nextRole !== "owner") {
      setMessage("You cannot demote your current owner account.");
      return;
    }

    setMessage("");
    try {
      await saveAdminUser({
        email: user.email,
        displayName: user.displayName,
        role: nextRole,
        active: user.active,
        features: user.features,
      });
      await loadUsers();
      await refreshAccess();
    } catch (error) {
      setMessage(errorMessage(error, "Could not update role."));
    }
  };

  const toggleActive = async (user: AdminUser) => {
    if (user.email === ownerEmail) {
      setMessage("You cannot disable your current owner account.");
      return;
    }

    setMessage("");
    try {
      await saveAdminUser({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        active: !user.active,
        features: user.features,
      });
      await loadUsers();
    } catch (error) {
      setMessage(errorMessage(error, "Could not update user status."));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin"
        description="Invite users and decide which Align modules they can access."
        actions={
          <Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={() => void loadUsers()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--button-secondary-bg)] text-[var(--brand-accent)]">
            <UserPlus size={20} />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--text)]">Invite or update access</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Members get Project Management by default. You can add future modules whenever they ask for access.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1.1fr_1.1fr_12rem_auto]">
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="user@example.com" />
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name, optional" />
          <Select value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button onClick={() => void inviteUser()} disabled={saving || !email.trim()} icon={<CheckCircle2 size={16} />}>
            Save user
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {selectableFeatures.map((feature) => {
            const Icon = feature.icon;
            const enabled = role === "owner" || selectedFeatures.has(feature.key);
            const locked = feature.key === "project_management" || role === "owner";

            return (
              <button
                key={feature.key}
                type="button"
                disabled={locked}
                onClick={() => toggleDraftFeature(feature.key)}
                className={`rounded-[var(--radius-sm)] border p-3 text-left transition ${
                  enabled
                    ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                } disabled:cursor-not-allowed disabled:opacity-80`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Icon size={16} />
                  {feature.label}
                </span>
                <span className="mt-1 block text-xs text-[var(--text-soft)]">{feature.planned ? "Planned module" : "Available now"}</span>
              </button>
            );
          })}
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--text-muted)]">{message}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <h2 className="font-display text-xl font-bold text-[var(--text)]">Workspace users</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Toggle module access without changing the core app.</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-[var(--text-muted)]">Loading users...</div>
        ) : users.length ? (
          <div className="divide-y divide-[var(--border)]">
            {users.map((user) => (
              <div key={user.email} className="grid gap-4 p-4 lg:grid-cols-[minmax(16rem,1fr)_13rem_minmax(24rem,2fr)_auto] lg:items-start">
                <div>
                  <p className="font-bold text-[var(--text)]">{user.displayName}</p>
                  <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                  <p className="mt-2 text-xs text-[var(--text-soft)]">{user.active ? "Active account" : "Disabled account"}</p>
                </div>
                <Select value={user.role} onChange={(event) => void updateUserRole(user, event.target.value as AppRole)}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {featureRegistry.map((feature) => {
                    const Icon = feature.icon;
                    const enabled = user.role === "owner" || user.features.includes(feature.key);
                    const locked = user.role === "owner" || feature.key === "project_management";

                    return (
                      <button
                        key={`${user.email}-${feature.key}`}
                        type="button"
                        disabled={locked}
                        onClick={() => void toggleUserFeature(user, feature.key)}
                        className={`rounded-[var(--radius-sm)] border px-3 py-2 text-left text-xs font-bold transition ${
                          enabled
                            ? "border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-soft)] hover:text-[var(--text)]"
                        } disabled:cursor-not-allowed disabled:opacity-80`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={14} />
                          {feature.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button variant={user.active ? "danger" : "secondary"} onClick={() => void toggleActive(user)}>
                  {user.active ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-sm text-[var(--text-muted)]">
            No app profiles yet. Save your owner email here after running the feature access SQL migration.
          </div>
        )}
      </Card>

      <Card className="p-4 text-sm text-[var(--text-muted)]">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 text-[var(--brand-accent)]" size={18} />
          <p>
            Public client links stay separate from user accounts. Admin access only controls signed-in Align modules.
          </p>
        </div>
      </Card>
    </div>
  );
}
