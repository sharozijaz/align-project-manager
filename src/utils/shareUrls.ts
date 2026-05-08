import { isTauriRuntime, openExternalUrl } from "../integrations/desktop/runtime";

const DEFAULT_PUBLIC_APP_ORIGIN = "https://align.sharoz.dev";

function normalizeOrigin(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function getPublicAppOrigin() {
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL);
  if (configuredOrigin) return configuredOrigin;

  if (typeof window !== "undefined" && !isTauriRuntime()) {
    return window.location.origin;
  }

  return DEFAULT_PUBLIC_APP_ORIGIN;
}

export function projectShareUrl(token: string) {
  return `${getPublicAppOrigin()}/share/${token}`;
}

export function clientShareUrl(token: string) {
  return `${getPublicAppOrigin()}/share/client/${token}`;
}

export function openShareUrl(url: string) {
  if (isTauriRuntime()) {
    return openExternalUrl(url);
  }

  window.open(url, "_blank", "noreferrer");
  return Promise.resolve();
}
