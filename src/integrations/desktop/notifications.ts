import { isTauriRuntime } from "./runtime";

const DESKTOP_NOTIFICATIONS_KEY = "align.desktopNotifications.enabled";

export const canUseDesktopNotifications = () => isTauriRuntime();

export const getDesktopNotificationsEnabled = () => {
  if (!canUseDesktopNotifications()) return false;
  return window.localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY) !== "false";
};

export const setDesktopNotificationsEnabled = (enabled: boolean) => {
  window.localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, String(enabled));
};

export async function requestDesktopNotificationPermission() {
  if (!canUseDesktopNotifications()) return false;

  const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
  let permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  return permissionGranted;
}

export async function sendDesktopNotification(title: string, body: string) {
  if (!getDesktopNotificationsEnabled()) return false;

  const permissionGranted = await requestDesktopNotificationPermission();
  if (!permissionGranted) return false;

  const { sendNotification } = await import("@tauri-apps/plugin-notification");
  sendNotification({
    title,
    body,
    group: "align-reminders",
    autoCancel: true,
  });

  return true;
}
