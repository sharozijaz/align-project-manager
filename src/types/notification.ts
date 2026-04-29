export interface AppNotification {
  id: string;
  taskId?: string;
  type: "task-reminder";
  title: string;
  message: string;
  scheduledFor: string;
  readAt?: string;
  emailSentAt?: string;
  emailError?: string;
  createdAt: string;
}
