import { isTauriRuntime, openExternalUrl } from "../integrations/desktop/runtime";

function normalizeOrigin(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function getPublicAppOrigin() {
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL);
  if (configuredOrigin) return configuredOrigin;

  if (typeof window !== "undefined" && !isTauriRuntime()) {
    return window.location.origin;
  }

  return "";
}

export function projectShareUrl(token: string) {
  const origin = getPublicAppOrigin();
  return origin ? `${origin}/share/${token}` : "";
}

export function clientShareUrl(token: string) {
  const origin = getPublicAppOrigin();
  return origin ? `${origin}/share/client/${token}` : "";
}

export function openShareUrl(url: string) {
  if (isTauriRuntime()) {
    return openExternalUrl(url);
  }

  window.open(url, "_blank", "noreferrer");
  return Promise.resolve();
}
