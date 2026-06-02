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
  const parsed = new URL(url);
  if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
    throw new Error("Unsupported external URL.");
  }

  if (!isTauriRuntime()) {
    window.location.href = parsed.toString();
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(parsed.toString());
}
