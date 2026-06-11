import type { ProjectNote } from "../../types/project";
import type { AppRole, FeatureKey } from "../../features/access/featureRegistry";
import type { HubNoteDocStatus, HubNoteDocType, HubPaletteColor, HubResourceType, HubSnippetType } from "../../types/studio";
import type { ProjectStatus } from "../../types/project";
import type { TaskCategory, TaskPriority, TaskRecurrence, TaskReminder, TaskStatus } from "../../types/task";

export interface Database {
  public: {
    Tables: {
      app_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: AppRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          role?: AppRole;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_profiles"]["Insert"]>;
        Relationships: [];
      };
      feature_access: {
        Row: {
          id: string;
          profile_id: string;
          feature_key: FeatureKey;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          feature_key: FeatureKey;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feature_access"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          area: "business" | "personal";
          status: ProjectStatus;
          priority: TaskPriority;
          start_date: string | null;
          start_time: string | null;
          due_date: string | null;
          due_time: string | null;
          sort_order: number | null;
          pinned_at: string | null;
          notes: ProjectNote[] | null;
          completed_at: string | null;
          archived_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          description?: string | null;
          area?: "business" | "personal";
          status: ProjectStatus;
          priority: TaskPriority;
          start_date?: string | null;
          start_time?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          sort_order?: number | null;
          pinned_at?: string | null;
          notes?: ProjectNote[] | null;
          completed_at?: string | null;
          archived_at?: string | null;
          deleted_at?: string | null;
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
          parent_task_id: string | null;
          linked_note_ids: string[] | null;
          milestone_id: string | null;
          planned_month: string | null;
          planned_week_start: string | null;
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
          parent_task_id?: string | null;
          linked_note_ids?: string[] | null;
          milestone_id?: string | null;
          planned_month?: string | null;
          planned_week_start?: string | null;
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
          expires_at: string | null;
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
          expires_at?: string | null;
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
      hub_resources: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string | null;
          type: HubResourceType;
          collection: string | null;
          tags: string | null;
          notes: string | null;
          favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          url?: string | null;
          type: HubResourceType;
          collection?: string | null;
          tags?: string | null;
          notes?: string | null;
          favorite?: boolean;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_resources"]["Insert"]>;
        Relationships: [];
      };
      hub_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          collection: string | null;
          tags: string | null;
          favorite: boolean;
          client_visible: boolean;
          doc_type: HubNoteDocType | null;
          doc_status: HubNoteDocStatus | null;
          project_ids: string[] | null;
          related_note_ids: string[] | null;
          milestone_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          collection?: string | null;
          tags?: string | null;
          favorite?: boolean;
          client_visible?: boolean;
          doc_type?: HubNoteDocType | null;
          doc_status?: HubNoteDocStatus | null;
          project_ids?: string[] | null;
          related_note_ids?: string[] | null;
          milestone_id?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_notes"]["Insert"]>;
        Relationships: [];
      };
      hub_note_spaces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          project_ids: string[] | null;
          manual_note_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          description?: string | null;
          project_ids?: string[] | null;
          manual_note_ids?: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_note_spaces"]["Insert"]>;
        Relationships: [];
      };
      hub_palettes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          project_ids: string[] | null;
          note_ids: string[] | null;
          colors: HubPaletteColor[] | null;
          tags: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          project_ids?: string[] | null;
          note_ids?: string[] | null;
          colors?: HubPaletteColor[] | null;
          tags?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_palettes"]["Insert"]>;
        Relationships: [];
      };
      project_milestones: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          title: string;
          status: "planned" | "active" | "done";
          sort_order: number | null;
          start_date: string | null;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          project_id: string;
          title: string;
          status?: "planned" | "active" | "done";
          sort_order?: number | null;
          start_date?: string | null;
          due_date?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_milestones"]["Insert"]>;
        Relationships: [];
      };
      hub_snippets: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: HubSnippetType;
          body: string;
          tags: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          type?: HubSnippetType;
          body: string;
          tags?: string | null;
          created_at: string;
          updated_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["hub_snippets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
