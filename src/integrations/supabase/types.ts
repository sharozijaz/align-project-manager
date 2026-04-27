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
          priority: "low" | "medium" | "high" | "urgent";
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
          priority: "low" | "medium" | "high" | "urgent";
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
          category: "personal" | "work" | "project" | "meeting" | "chore";
          priority: "low" | "medium" | "high" | "urgent";
          status: "not-started" | "in-progress" | "completed";
          due_date: string | null;
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
          category: "personal" | "work" | "project" | "meeting" | "chore";
          priority: "low" | "medium" | "high" | "urgent";
          status: "not-started" | "in-progress" | "completed";
          due_date?: string | null;
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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
