import type { Session } from "@supabase/supabase-js";
import { baseMemberFeatures, featureKeys, isFeatureKey, ownerFeatures, type AppRole, type FeatureKey } from "../../features/access/featureRegistry";
import { isEmailAllowed, isSupabaseConfigured, supabase } from "./client";

export interface AccessProfile {
  id: string | null;
  email: string;
  displayName: string;
  role: AppRole;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserAccess {
  profile: AccessProfile;
  features: FeatureKey[];
  source: "database" | "fallback" | "offline";
}

export interface AdminUser extends AccessProfile {
  features: FeatureKey[];
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const profileFromRow = (row: {
  id: string | null;
  email: string;
  display_name: string | null;
  role: AppRole;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}): AccessProfile => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name ?? row.email,
  role: row.role,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fallbackAccess = (session?: Session | null): UserAccess | null => {
  const email = session?.user.email;

  if (!email || !isEmailAllowed(email)) return null;

  return {
    profile: {
      id: session?.user.id ?? null,
      email,
      displayName: session.user.user_metadata?.name ?? email.split("@")[0] ?? "Owner",
      role: "owner",
      active: true,
      createdAt: null,
      updatedAt: null,
    },
    features: ownerFeatures,
    source: isSupabaseConfigured ? "fallback" : "offline",
  };
};

export async function getCurrentUserAccess(session: Session | null): Promise<UserAccess | null> {
  if (!session) return null;

  if (!supabase) {
    return fallbackAccess(session);
  }

  const email = session.user.email;
  if (!email) return null;

  try {
    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("id,email,display_name,role,active,created_at,updated_at")
      .eq("email", normalizeEmail(email))
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile?.active) {
      return fallbackAccess(session);
    }

    const accessProfile = profileFromRow(profile);
    const { data: accessRows, error: accessError } = await supabase
      .from("feature_access")
      .select("feature_key,enabled")
      .eq("profile_id", profile.id);

    if (accessError) throw accessError;

    const rowFeatures = (accessRows ?? [])
      .filter((row) => row.enabled && isFeatureKey(row.feature_key))
      .map((row) => row.feature_key as FeatureKey);

    const features = accessProfile.role === "owner" ? ownerFeatures : Array.from(new Set([...baseMemberFeatures, ...rowFeatures]));

    return {
      profile: accessProfile,
      features,
      source: "database",
    };
  } catch (error) {
    console.warn("Falling back to env-based access while feature access is unavailable.", error);
    return fallbackAccess(session);
  }
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  if (!supabase) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("app_profiles")
    .select("id,email,display_name,role,active,created_at,updated_at")
    .order("created_at", { ascending: true });

  if (profileError) throw profileError;

  const { data: featureRows, error: featureError } = await supabase.from("feature_access").select("profile_id,feature_key,enabled");

  if (featureError) throw featureError;

  return (profiles ?? []).map((profile) => ({
    ...profileFromRow(profile),
    features:
      profile.role === "owner"
        ? ownerFeatures
        : Array.from(
            new Set([
              ...baseMemberFeatures,
              ...(featureRows ?? [])
                .filter((row) => row.profile_id === profile.id && row.enabled && isFeatureKey(row.feature_key))
                .map((row) => row.feature_key as FeatureKey),
            ]),
          ),
  }));
}

export async function saveAdminUser(input: {
  email: string;
  displayName?: string;
  role: AppRole;
  active: boolean;
  features: FeatureKey[];
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const email = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from("app_profiles")
    .upsert(
      {
        email,
        display_name: input.displayName?.trim() || email,
        role: input.role,
        active: input.active,
        updated_at: now,
      },
      { onConflict: "email" },
    )
    .select("id,email,display_name,role,active,created_at,updated_at")
    .single();

  if (profileError) throw profileError;

  const wantedFeatures = new Set(input.role === "owner" ? ownerFeatures : Array.from(new Set([...baseMemberFeatures, ...input.features])));
  const rows = featureKeys.map((featureKey) => ({
    profile_id: profile.id,
    feature_key: featureKey,
    enabled: wantedFeatures.has(featureKey),
    updated_at: now,
  }));

  const { error: accessError } = await supabase.from("feature_access").upsert(rows, { onConflict: "profile_id,feature_key" });

  if (accessError) throw accessError;

  return profileFromRow(profile);
}

export async function setUserFeature(profileId: string, featureKey: FeatureKey, enabled: boolean) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("feature_access").upsert(
    {
      profile_id: profileId,
      feature_key: featureKey,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,feature_key" },
  );

  if (error) throw error;
}
