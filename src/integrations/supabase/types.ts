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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      advisor_access_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string | null
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      billing: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          entitlement_status: string | null
          last_stripe_event_at: string | null
          last_stripe_event_id: string | null
          plan_code: string | null
          price_id: string | null
          product_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          entitlement_status?: string | null
          last_stripe_event_at?: string | null
          last_stripe_event_id?: string | null
          plan_code?: string | null
          price_id?: string | null
          product_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          entitlement_status?: string | null
          last_stripe_event_at?: string | null
          last_stripe_event_id?: string | null
          plan_code?: string | null
          price_id?: string | null
          product_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comparison_items: {
        Row: {
          comparison_id: string
          created_at: string
          id: string
          label_override: string | null
          scenario_id: string
          sort_order: number
        }
        Insert: {
          comparison_id: string
          created_at?: string
          id?: string
          label_override?: string | null
          scenario_id: string
          sort_order?: number
        }
        Update: {
          comparison_id?: string
          created_at?: string
          id?: string
          label_override?: string | null
          scenario_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "comparison_items_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "saved_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_shares: {
        Row: {
          access_count: number
          comparison_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          permission: string
          require_auth: boolean
          revoked_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          comparison_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          require_auth?: boolean
          revoked_at?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          comparison_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          permission?: string
          require_auth?: boolean
          revoked_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparison_shares_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "saved_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      comparison_versions: {
        Row: {
          assumptions_hash: string
          comparison_id: string
          created_at: string
          created_by: string
          id: string
          note: string | null
          schema_version: number
          snapshot: Json
          version_number: number
        }
        Insert: {
          assumptions_hash: string
          comparison_id: string
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          schema_version?: number
          snapshot: Json
          version_number: number
        }
        Update: {
          assumptions_hash?: string
          comparison_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          schema_version?: number
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "comparison_versions_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "saved_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          topic: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          topic?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      export_files: {
        Row: {
          checksum: string | null
          created_at: string
          entity_id: string
          entity_type: string
          export_version: string
          id: string
          owner_user_id: string
          storage_path: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          export_version?: string
          id?: string
          owner_user_id: string
          storage_path: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          export_version?: string
          id?: string
          owner_user_id?: string
          storage_path?: string
        }
        Relationships: []
      }
      export_shares: {
        Row: {
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          export_file_id: string
          id: string
          permission: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          export_file_id: string
          id?: string
          permission?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          export_file_id?: string
          id?: string
          permission?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_shares_export_file_id_fkey"
            columns: ["export_file_id"]
            isOneToOne: false
            referencedRelation: "export_files"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_exports: {
        Row: {
          bytes: number | null
          content_sha256: string | null
          created_at: string
          error_message: string | null
          id: string
          kind: Database["public"]["Enums"]["export_kind"]
          share_enabled: boolean
          share_expires_at: string | null
          share_token: string | null
          source_id: string
          status: Database["public"]["Enums"]["export_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bytes?: number | null
          content_sha256?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kind: Database["public"]["Enums"]["export_kind"]
          share_enabled?: boolean
          share_expires_at?: string | null
          share_token?: string | null
          source_id: string
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bytes?: number | null
          content_sha256?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["export_kind"]
          share_enabled?: boolean
          share_expires_at?: string | null
          share_token?: string | null
          source_id?: string
          status?: Database["public"]["Enums"]["export_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_period_end: string | null
          full_name: string | null
          id: string
          plan_key: string
          plan_status: string
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          full_name?: string | null
          id: string
          plan_key?: string
          plan_status?: string
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          full_name?: string | null
          id?: string
          plan_key?: string
          plan_status?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      saved_comparisons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          assumptions_hash: string | null
          created_at: string
          derived: Json
          id: string
          inputs: Json
          is_archived: boolean
          name: string
          scenario_type: string
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assumptions_hash?: string | null
          created_at?: string
          derived?: Json
          id?: string
          inputs?: Json
          is_archived?: boolean
          name: string
          scenario_type: string
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assumptions_hash?: string | null
          created_at?: string
          derived?: Json
          id?: string
          inputs?: Json
          is_archived?: boolean
          name?: string
          scenario_type?: string
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          id: string
          plan_key: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_key: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_comparisons: {
        Row: {
          created_at: string
          id: string
          name: string
          scenario_a_id: string
          scenario_b_id: string
          scenario_c_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          scenario_a_id: string
          scenario_b_id: string
          scenario_c_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          scenario_a_id?: string
          scenario_b_id?: string
          scenario_c_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_comparisons_scenario_a_id_fkey"
            columns: ["scenario_a_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_comparisons_scenario_b_id_fkey"
            columns: ["scenario_b_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_comparisons_scenario_c_id_fkey"
            columns: ["scenario_c_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_comparison_latest_version: {
        Row: {
          assumptions_hash: string | null
          comparison_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          note: string | null
          schema_version: number | null
          snapshot: Json | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_versions_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "saved_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_advisor_request: {
        Args: { approve: boolean; request_id: string }
        Returns: Json
      }
      assert_export_source_owned_by_user: {
        Args: {
          p_kind: Database["public"]["Enums"]["export_kind"]
          p_source_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      duplicate_scenario: {
        Args: { new_name?: string; source_scenario_id: string }
        Returns: string
      }
      generate_share_token: { Args: never; Returns: string }
      get_effective_tier: { Args: { target_user_id: string }; Returns: string }
      evaluate_entitlement: { Args: { p_user_id: string }; Returns: Json }
      feature_allowed: {
        Args: {
          p_user_id: string
          p_feature: string
          p_scenario_count?: number
        }
        Returns: boolean
      }
      assert_feature_allowed: { Args: { p_feature: string }; Returns: Json }
      claim_stripe_webhook_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_stripe_customer_id?: string
          p_app_user_id?: string
          p_action_taken?: string
          p_details?: Json
        }
        Returns: boolean
      }
      log_admin_entitlement_bypass: {
        Args: {
          p_user_id: string
          p_source: string
          p_feature?: string
          p_details?: Json
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_advisor: { Args: { uid: string }; Returns: boolean }
      list_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      list_pending_advisor_requests: {
        Args: never
        Returns: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string | null
          status: string
          user_id: string
          website: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "advisor_access_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_recent_admin_promotions: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          id: string
          target_email: string
          target_user_id: string
        }[]
      }
      log_webhook_admin_ignored: {
        Args: { p_email: string; p_event_type: string; p_user_id: string }
        Returns: undefined
      }
      promote_to_admin: { Args: { p_email: string }; Returns: Json }
      touch_comparison_share: { Args: { p_token: string }; Returns: undefined }
      validate_comparison_share: {
        Args: { p_token: string }
        Returns: {
          comparison_id: string
          expires_at: string
          is_valid: boolean
          permission: string
          require_auth: boolean
          revoked_at: string
          share_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "advisor"
      export_kind: "scenario" | "comparison"
      export_status: "queued" | "rendering" | "ready" | "failed"
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
      app_role: ["admin", "moderator", "user", "advisor"],
      export_kind: ["scenario", "comparison"],
      export_status: ["queued", "rendering", "ready", "failed"],
    },
  },
} as const
