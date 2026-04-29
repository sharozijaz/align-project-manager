import type { TaskCategory, TaskPriority, TaskReminder, TaskStatus } from "../../types/task";

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
          due_date: string | null;
          reminder: TaskReminder;
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
          due_date?: string | null;
          reminder?: TaskReminder;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
