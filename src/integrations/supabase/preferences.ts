import { errorMessage } from "../../utils/errors";
import { supabase } from "./client";

export interface UserPreferences {
  emailRemindersEnabled: boolean;
}

const defaultPreferences: UserPreferences = {
  emailRemindersEnabled: true,
};

const requireClient = () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) return defaultPreferences;

  const { data, error } = await client
    .from("user_preferences")
    .select("email_reminders_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    const message = errorMessage(error, "Could not load preferences.");
    if (message.includes("user_preferences") || message.includes("schema cache")) return defaultPreferences;
    throw new Error(message);
  }

  return { emailRemindersEnabled: data?.email_reminders_enabled ?? true };
}

export async function saveUserPreferences(preferences: UserPreferences) {
  const client = requireClient();
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw new Error(errorMessage(userError, "Could not read Supabase user."));
  if (!user) throw new Error("Sign in before saving preferences.");

  const { error } = await client.from("user_preferences").upsert({
    user_id: user.id,
    email_reminders_enabled: preferences.emailRemindersEnabled,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(errorMessage(error, "Could not save preferences."));
}
