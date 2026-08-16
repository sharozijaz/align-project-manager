import { errorMessage } from "../../utils/errors";
import { supabase } from "./client";

export interface UserPreferences {
  emailRemindersEnabled: boolean;
  emailTaskRemindersEnabled: boolean;
  emailProjectDueEnabled: boolean;
  emailWeeklySummaryEnabled: boolean;
  emailMonthlySummaryEnabled: boolean;
}

export const defaultUserPreferences: UserPreferences = {
  emailRemindersEnabled: true,
  emailTaskRemindersEnabled: true,
  emailProjectDueEnabled: true,
  emailWeeklySummaryEnabled: true,
  emailMonthlySummaryEnabled: true,
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
  if (!user) return defaultUserPreferences;

  const { data, error } = await client
    .from("user_preferences")
    .select("email_reminders_enabled,email_task_reminders_enabled,email_project_due_enabled,email_weekly_summary_enabled,email_monthly_summary_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    const message = errorMessage(error, "Could not load preferences.");
    if (message.includes("user_preferences") || message.includes("schema cache")) return defaultUserPreferences;
    throw new Error(message);
  }

  return {
    emailRemindersEnabled: data?.email_reminders_enabled ?? true,
    emailTaskRemindersEnabled: data?.email_task_reminders_enabled ?? true,
    emailProjectDueEnabled: data?.email_project_due_enabled ?? true,
    emailWeeklySummaryEnabled: data?.email_weekly_summary_enabled ?? true,
    emailMonthlySummaryEnabled: data?.email_monthly_summary_enabled ?? true,
  };
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
    email_task_reminders_enabled: preferences.emailTaskRemindersEnabled,
    email_project_due_enabled: preferences.emailProjectDueEnabled,
    email_weekly_summary_enabled: preferences.emailWeeklySummaryEnabled,
    email_monthly_summary_enabled: preferences.emailMonthlySummaryEnabled,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(errorMessage(error, "Could not save preferences."));
}
