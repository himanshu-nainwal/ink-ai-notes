export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          label: string
          page: number
          pdf_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          page: number
          pdf_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          page?: number
          pdf_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          page_context: number | null
          pdf_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          page_context?: number | null
          pdf_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          page_context?: number | null
          pdf_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          id: string
          page: number
          pdf_id: string
          strokes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          page: number
          pdf_id: string
          strokes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          page?: number
          pdf_id?: string
          strokes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          color: string
          created_at: string
          id: string
          note: string | null
          page: number
          pdf_id: string
          rects: Json
          selected_text: string | null
          style: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          note?: string | null
          page: number
          pdf_id: string
          rects: Json
          selected_text?: string | null
          style?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          note?: string | null
          page?: number
          pdf_id?: string
          rects?: Json
          selected_text?: string | null
          style?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      page_notes: {
        Row: {
          content: string
          id: string
          page: number
          pdf_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          id?: string
          page: number
          pdf_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          page?: number
          pdf_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_notes_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfs: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          is_archived: boolean | null
          is_favorite: boolean | null
          last_opened_at: string | null
          last_page: number | null
          last_zoom: number | null
          page_count: number | null
          scroll_position: number | null
          storage_path: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          last_opened_at?: string | null
          last_page?: number | null
          last_zoom?: number | null
          page_count?: number | null
          scroll_position?: number | null
          storage_path: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          is_archived?: boolean | null
          is_favorite?: boolean | null
          last_opened_at?: string | null
          last_page?: number | null
          last_zoom?: number | null
          page_count?: number | null
          scroll_position?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sticky_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          page: number
          pdf_id: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          page: number
          pdf_id: string
          updated_at?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          page?: number
          pdf_id?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          duration_seconds: number
          ended_at: string | null
          id: string
          mode: string
          pdf_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          mode?: string
          pdf_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          mode?: string
          pdf_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
