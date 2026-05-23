export const WORKSPACE_SESSION_KEY = "align-workspace-session-user-v1";

export function getWorkspaceOwnerId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(WORKSPACE_SESSION_KEY) ?? "";
}

export function setWorkspaceOwnerId(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_SESSION_KEY, userId);
}

export function clearWorkspaceOwnerId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKSPACE_SESSION_KEY);
}
