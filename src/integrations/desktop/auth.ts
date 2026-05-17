import { isTauriRuntime } from "./runtime";
import { supabase } from "../supabase/client";

let desktopAuthInitialized = false;

const extractAuthCode = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "align:" || url.hostname !== "auth" || url.pathname !== "/callback") return "";
    return url.searchParams.get("code") ?? "";
  } catch {
    return "";
  }
};

async function handleDesktopAuthUrls(urls: string[] | null) {
  if (!supabase || !urls?.length) return;

  for (const rawUrl of urls) {
    const code = extractAuthCode(rawUrl);
    if (!code) continue;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    break;
  }
}

export async function initDesktopAuthHandler() {
  if (!isTauriRuntime() || desktopAuthInitialized) return;
  desktopAuthInitialized = true;

  const { getCurrent, isRegistered, onOpenUrl, register } = await import("@tauri-apps/plugin-deep-link");

  try {
    if (!(await isRegistered("align"))) {
      await register("align");
    }
  } catch {
    // Packaged builds register the scheme from tauri.conf.json. Dev builds may fail silently if Windows already owns it.
  }

  await handleDesktopAuthUrls(await getCurrent());
  await onOpenUrl((urls) => {
    void handleDesktopAuthUrls(urls);
  });
}
