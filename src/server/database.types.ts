export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brand_changes: {
        Row: {
          author_id: string
          brand_id: string
          created_at: string
          effective_on: string
          id: string
          summary: string
        }
        Insert: {
          author_id: string
          brand_id: string
          created_at?: string
          effective_on: string
          id?: string
          summary: string
        }
        Update: {
          author_id?: string
          brand_id?: string
          created_at?: string
          effective_on?: string
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_changes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_changes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_members: {
        Row: {
          brand_id: string
          created_at: string
          person_id: string
          role: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          person_id: string
          role: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          person_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          standard: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          standard: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          standard?: string
        }
        Relationships: []
      }
      issue_types: {
        Row: {
          description: string
          key: string
          label: string
          position: number
          retired_at: string | null
          severity: string
        }
        Insert: {
          description: string
          key: string
          label: string
          position: number
          retired_at?: string | null
          severity: string
        }
        Update: {
          description?: string
          key?: string
          label?: string
          position?: number
          retired_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      replies: {
        Row: {
          author_id: string
          body: string
          brand_id: string
          created_at: string
          external_id: string
          id: string
          sent_at: string
          source: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          brand_id: string
          created_at?: string
          external_id: string
          id?: string
          sent_at: string
          source: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          brand_id?: string
          created_at?: string
          external_id?: string
          id?: string
          sent_at?: string
          source?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_ticket_id_brand_id_fkey"
            columns: ["ticket_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      review_issues: {
        Row: {
          issue_key: string
          review_id: string
        }
        Insert: {
          issue_key: string
          review_id: string
        }
        Update: {
          issue_key?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_issues_issue_key_fkey"
            columns: ["issue_key"]
            isOneToOne: false
            referencedRelation: "issue_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "review_issues_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          note: string
          reply_id: string
          reviewer_id: string
          score: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          note?: string
          reply_id: string
          reviewer_id?: string
          score: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          note?: string
          reply_id?: string
          reviewer_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reply_id_brand_id_fkey"
            columns: ["reply_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          brand_id: string
          created_at: string
          customer_message: string
          customer_name: string
          external_id: string
          id: string
          opened_at: string
          source: string
          subject: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          customer_message: string
          customer_name: string
          external_id: string
          id?: string
          opened_at: string
          source: string
          subject: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          customer_message?: string
          customer_name?: string
          external_id?: string
          id?: string
          opened_at?: string
          source?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      demo_personas: {
        Args: never
        Returns: {
          full_name: string
          id: string
          summary: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

