import { describe, expect, it } from "vitest";
import type { AppNotification } from "../../types/notification";
import { groupNotifications, notificationContext } from "../notificationPresentation";

const notification = (overrides: Partial<AppNotification>): AppNotification => ({
  id: "notification",
  type: "task-reminder",
  title: "Reminder",
  message: "Time to move this forward",
  scheduledFor: "2026-06-03T08:00:00.000Z",
  createdAt: "2026-06-03T07:00:00.000Z",
  ...overrides,
});

describe("notificationPresentation", () => {
  it("groups unread and read notifications", () => {
    const grouped = groupNotifications([notification({ id: "unread" }), notification({ id: "read", readAt: "2026-06-03T09:00:00.000Z" })]);

    expect(grouped.unread.map((item) => item.id)).toEqual(["unread"]);
    expect(grouped.read.map((item) => item.id)).toEqual(["read"]);
  });

  it("labels project task reminders with the project name", () => {
    const context = notificationContext(
      notification({ taskId: "task-1" }),
      new Map([["task-1", { title: "Call Bank Manager", projectId: "project-1" }]]),
      new Map([["project-1", { name: "Providers International" }]]),
    );

    expect(context.label).toBe("Providers International");
  });

  it("labels task reminders without a project as personal tasks", () => {
    const context = notificationContext(notification({ taskId: "task-1" }), new Map([["task-1", { title: "Buy notebook" }]]), new Map());

    expect(context.label).toBe("Personal task");
  });

  it("labels non-task email notification types", () => {
    expect(notificationContext(notification({ type: "project-due" }), new Map(), new Map()).label).toBe("Project deadline");
    expect(notificationContext(notification({ type: "weekly-summary" }), new Map(), new Map()).label).toBe("Weekly summary");
    expect(notificationContext(notification({ type: "monthly-summary" }), new Map(), new Map()).label).toBe("Monthly summary");
  });
});
