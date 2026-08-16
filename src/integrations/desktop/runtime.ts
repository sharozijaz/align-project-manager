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

export type ExternalUrlBrowserMode = "same-tab" | "new-tab";

export interface OpenExternalUrlOptions {
  browserMode?: ExternalUrlBrowserMode;
}

export function parseExternalUrl(url: string) {
  const parsed = new URL(url);
  if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
    throw new Error("Unsupported external URL.");
  }

  return parsed;
}

export async function openExternalUrl(url: string, options: OpenExternalUrlOptions = {}) {
  const parsed = parseExternalUrl(url);

  if (!isTauriRuntime()) {
    if (options.browserMode === "new-tab") {
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = parsed.toString();
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(parsed.toString());
}
