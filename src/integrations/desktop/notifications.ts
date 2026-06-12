import { isTauriRuntime } from "./runtime";

const DESKTOP_NOTIFICATIONS_KEY = "align.desktopNotifications.enabled";
const DESKTOP_REMINDER_HEARTBEAT_KEY = "align.desktopNotifications.reminderHeartbeat";
const WINDOWS_NOTIFICATION_SOUND = "C:\\Windows\\Media\\notify.wav";

type DesktopReminderHeartbeatStatus = "disabled" | "idle" | "sent" | "error";

export interface DesktopReminderHeartbeat {
  checkedAt: string;
  status: DesktopReminderHeartbeatStatus;
  sentCount: number;
  message?: string;
}

export const canUseDesktopNotifications = () => isTauriRuntime();

export const getDesktopNotificationsEnabled = () => {
  if (!canUseDesktopNotifications()) return false;
  return window.localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY) !== "false";
};

export const setDesktopNotificationsEnabled = (enabled: boolean) => {
  window.localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, String(enabled));
};

export const getDesktopReminderHeartbeat = (): DesktopReminderHeartbeat | null => {
  try {
    const stored = window.localStorage.getItem(DESKTOP_REMINDER_HEARTBEAT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<DesktopReminderHeartbeat>;
    if (!parsed || typeof parsed.checkedAt !== "string") return null;

    const status: DesktopReminderHeartbeatStatus =
      parsed.status === "disabled" || parsed.status === "idle" || parsed.status === "sent" || parsed.status === "error"
        ? parsed.status
        : "idle";

    return {
      checkedAt: parsed.checkedAt,
      status,
      sentCount: typeof parsed.sentCount === "number" ? parsed.sentCount : 0,
      message: typeof parsed.message === "string" ? parsed.message : undefined,
    };
  } catch {
    return null;
  }
};

export const setDesktopReminderHeartbeat = (heartbeat: DesktopReminderHeartbeat) => {
  window.localStorage.setItem(DESKTOP_REMINDER_HEARTBEAT_KEY, JSON.stringify(heartbeat));
  window.dispatchEvent(new CustomEvent("align:desktop-reminder-heartbeat"));
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
  const isWindows = navigator.platform.toLowerCase().includes("win");

  sendNotification({
    title,
    body,
    group: "align-reminders",
    autoCancel: true,
    ...(isWindows ? { sound: WINDOWS_NOTIFICATION_SOUND } : {}),
  });

  return true;
}
