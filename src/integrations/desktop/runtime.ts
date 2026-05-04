export const DESKTOP_AUTH_REDIRECT_URL = "align://auth/callback";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  (Boolean(window.__TAURI_INTERNALS__) ||
    window.location.protocol === "tauri:" ||
    window.location.origin.includes("tauri.localhost"));

export async function openExternalUrl(url: string) {
  if (!isTauriRuntime()) {
    window.location.href = url;
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
