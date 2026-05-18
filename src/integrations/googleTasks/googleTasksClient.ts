import { getAuthRedirectUrl } from "../supabase/client";

const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

export function getGoogleTodoSyncReadiness() {
  const missing = [!getAuthRedirectUrl() ? "VITE_GOOGLE_REDIRECT_URI or VITE_APP_URL" : ""].filter(Boolean);

  return {
    ready: missing.length === 0,
    missing,
    scope: GOOGLE_TASKS_SCOPE,
  };
}
