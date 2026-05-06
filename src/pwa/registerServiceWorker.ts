import { isTauriRuntime } from "../integrations/desktop/runtime";

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  if (isTauriRuntime()) {
    window.addEventListener("load", () => {
      void unregisterServiceWorkersAndClearCaches();
    });
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA registration is a progressive enhancement; the app should still run normally.
    });
  });
}

async function unregisterServiceWorkersAndClearCaches() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Desktop should keep loading even if WebView service-worker cleanup is unavailable.
  }

  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // Cache cleanup is best-effort because old desktop builds may have left stale assets behind.
  }
}
