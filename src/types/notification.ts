export interface AppNotification {
  id: string;
  taskId?: string;
  type: "task-reminder" | "project-due" | "weekly-summary" | "monthly-summary";
  title: string;
  message: string;
  scheduledFor: string;
  readAt?: string;
  emailSentAt?: string;
  emailError?: string;
  createdAt: string;
}
