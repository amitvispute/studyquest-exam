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
      ai_mentor_settings: {
        Row: {
          daily_limit: number
          id: string
          student_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          daily_limit?: number
          id?: string
          student_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          daily_limit?: number
          id?: string
          student_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_mentor_usage: {
        Row: {
          created_at: string
          date: string
          id: string
          message_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_mock_answers: {
        Row: {
          exam_id: string
          id: string
          is_correct: boolean
          question_id: string
          student_answer: string
          submitted_at: string
        }
        Insert: {
          exam_id: string
          id?: string
          is_correct?: boolean
          question_id: string
          student_answer: string
          submitted_at?: string
        }
        Update: {
          exam_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          student_answer?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_mock_answers_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "ai_mock_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_mock_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ai_mock_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_mock_exams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          num_questions: number
          scheduled_end: string
          scheduled_start: string
          status: string
          student_user_id: string
          subjects: string[]
          title: string
          topics: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          num_questions?: number
          scheduled_end: string
          scheduled_start: string
          status?: string
          student_user_id: string
          subjects?: string[]
          title: string
          topics?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          num_questions?: number
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          student_user_id?: string
          subjects?: string[]
          title?: string
          topics?: string | null
        }
        Relationships: []
      }
      ai_mock_questions: {
        Row: {
          correct_answer: string
          exam_id: string
          id: string
          options: Json
          question_number: number
          question_text: string
          subject: string
          topic: string | null
        }
        Insert: {
          correct_answer: string
          exam_id: string
          id?: string
          options?: Json
          question_number: number
          question_text: string
          subject: string
          topic?: string | null
        }
        Update: {
          correct_answer?: string
          exam_id?: string
          id?: string
          options?: Json
          question_number?: number
          question_text?: string
          subject?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_mock_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "ai_mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      class_entries: {
        Row: {
          class_name: string
          completed: boolean
          created_at: string
          date: string
          homework: string | null
          id: string
          notes: string | null
          topics_covered: string | null
          user_id: string
        }
        Insert: {
          class_name: string
          completed?: boolean
          created_at?: string
          date: string
          homework?: string | null
          id?: string
          notes?: string | null
          topics_covered?: string | null
          user_id: string
        }
        Update: {
          class_name?: string
          completed?: boolean
          created_at?: string
          date?: string
          homework?: string | null
          id?: string
          notes?: string | null
          topics_covered?: string | null
          user_id?: string
        }
        Relationships: []
      }
      class_schedules: {
        Row: {
          class_name: string
          created_at: string
          id: string
          scheduled_date: string
          user_id: string
        }
        Insert: {
          class_name: string
          created_at?: string
          id?: string
          scheduled_date: string
          user_id: string
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          scheduled_date?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes: number
          questions: number
          score: number
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          questions?: number
          score?: number
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          questions?: number
          score?: number
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_exams: {
        Row: {
          created_at: string
          date: string
          english_score: number | null
          id: string
          maths_score: number | null
          max_score: number | null
          notes: string | null
          nvr_score: number | null
          provider: string
          total_score: number | null
          user_id: string
          vr_score: number | null
        }
        Insert: {
          created_at?: string
          date: string
          english_score?: number | null
          id?: string
          maths_score?: number | null
          max_score?: number | null
          notes?: string | null
          nvr_score?: number | null
          provider: string
          total_score?: number | null
          user_id: string
          vr_score?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          english_score?: number | null
          id?: string
          maths_score?: number | null
          max_score?: number | null
          notes?: string | null
          nvr_score?: number | null
          provider?: string
          total_score?: number | null
          user_id?: string
          vr_score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_mentor_usage: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "parent" | "student"
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
    Enums: {
      app_role: ["parent", "student"],
    },
  },
} as const
