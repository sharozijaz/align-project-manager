import type { TaskCategory, TaskPriority, TaskRecurrence, TaskReminder, TaskStatus } from "../../types/task";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          status: "active" | "paused" | "completed";
          priority: TaskPriority;
          start_date: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          description?: string | null;
          status: "active" | "paused" | "completed";
          priority: TaskPriority;
          start_date?: string | null;
          due_date?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          project_id: string | null;
          category: TaskCategory;
          priority: TaskPriority;
          status: TaskStatus;
          start_date: string | null;
          due_date: string | null;
          reminder: TaskReminder;
          recurrence: TaskRecurrence;
          recurring_parent_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          description?: string | null;
          project_id?: string | null;
          category: TaskCategory;
          priority: TaskPriority;
          status: TaskStatus;
          start_date?: string | null;
          due_date?: string | null;
          reminder?: TaskReminder;
          recurrence?: TaskRecurrence;
          recurring_parent_id?: string | null;
          deleted_at?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          linked_task_id: string | null;
          source: "local" | "google";
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          linked_task_id?: string | null;
          source: "local" | "google";
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          type: "task-reminder";
          title: string;
          message: string;
          scheduled_for: string;
          read_at: string | null;
          email_sent_at: string | null;
          email_error: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          task_id?: string | null;
          type: "task-reminder";
          title: string;
          message: string;
          scheduled_for: string;
          read_at?: string | null;
          email_sent_at?: string | null;
          email_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      project_shares: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          token: string;
          enabled: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          token: string;
          enabled?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_shares"]["Insert"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          email_reminders_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_reminders_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
