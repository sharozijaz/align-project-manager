import type { ProjectNote } from "../../types/project";
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
          area: "business" | "personal";
          status: "active" | "paused" | "completed";
          priority: TaskPriority;
          start_date: string | null;
          start_time: string | null;
          due_date: string | null;
          due_time: string | null;
          sort_order: number | null;
          notes: ProjectNote[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          description?: string | null;
          area?: "business" | "personal";
          status: "active" | "paused" | "completed";
          priority: TaskPriority;
          start_date?: string | null;
          start_time?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          sort_order?: number | null;
          notes?: ProjectNote[] | null;
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
          start_time: string | null;
          due_date: string | null;
          due_time: string | null;
          reminder: TaskReminder;
          recurrence: TaskRecurrence;
          recurring_parent_id: string | null;
          sort_order: number | null;
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
          start_time?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          reminder?: TaskReminder;
          recurrence?: TaskRecurrence;
          recurring_parent_id?: string | null;
          sort_order?: number | null;
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
          password_hash: string | null;
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
          password_hash?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_shares"]["Insert"]>;
        Relationships: [];
      };
      client_share_links: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          token: string;
          project_ids: string[];
          project_tokens: string[];
          enabled: boolean;
          password_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          token: string;
          project_ids: string[];
          project_tokens: string[];
          enabled?: boolean;
          password_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_share_links"]["Insert"]>;
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
