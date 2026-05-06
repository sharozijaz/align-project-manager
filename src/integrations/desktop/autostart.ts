import { isTauriRuntime } from "./runtime";

export const canUseDesktopAutostart = () => isTauriRuntime();

export async function getDesktopAutostartEnabled() {
  if (!canUseDesktopAutostart()) return false;

  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setDesktopAutostartEnabled(enabled: boolean) {
  if (!canUseDesktopAutostart()) return false;

  const { disable, enable } = await import("@tauri-apps/plugin-autostart");
  if (enabled) await enable();
  else await disable();

  return true;
}
