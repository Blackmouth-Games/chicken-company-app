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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level: string
          message: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      building_prices: {
        Row: {
          building_type: string
          capacity: number
          created_at: string
          id: string
          level: number
          price_ton: number
          updated_at: string
        }
        Insert: {
          building_type: string
          capacity: number
          created_at?: string
          id?: string
          level: number
          price_ton: number
          updated_at?: string
        }
        Update: {
          building_type?: string
          capacity?: number
          created_at?: string
          id?: string
          level?: number
          price_ton?: number
          updated_at?: string
        }
        Relationships: []
      }
      building_purchases: {
        Row: {
          building_id: string | null
          building_type: string
          completed_at: string | null
          created_at: string
          id: string
          level: number
          price_ton: number
          status: string
          transaction_hash: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          building_id?: string | null
          building_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          level: number
          price_ton: number
          status?: string
          transaction_hash?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          building_id?: string | null
          building_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          level?: number
          price_ton?: number
          status?: string
          transaction_hash?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_purchases_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "user_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      building_skins: {
        Row: {
          building_type: string
          created_at: string
          id: string
          image_url: string
          is_default: boolean
          name: string
          rarity: string | null
          skin_key: string
          updated_at: string
        }
        Insert: {
          building_type: string
          created_at?: string
          id?: string
          image_url: string
          is_default?: boolean
          name: string
          rarity?: string | null
          skin_key: string
          updated_at?: string
        }
        Update: {
          building_type?: string
          created_at?: string
          id?: string
          image_url?: string
          is_default?: boolean
          name?: string
          rarity?: string | null
          skin_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          metric_type: Database["public"]["Enums"]["metric_type"]
          metric_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          metadata?: Json | null
          metric_type: Database["public"]["Enums"]["metric_type"]
          metric_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          metric_type?: Database["public"]["Enums"]["metric_type"]
          metric_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      metric_events: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["metric_type"]
          event_value: number | null
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["metric_type"]
          event_value?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["metric_type"]
          event_value?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          preferred_language: string | null
          referral_code: string | null
          referred_by: string | null
          source: string | null
          telegram_first_name: string | null
          telegram_id: number | null
          telegram_last_name: string | null
          telegram_username: string | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          referral_code?: string | null
          referred_by?: string | null
          source?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          referral_code?: string | null
          referred_by?: string | null
          source?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_last_name?: string | null
          telegram_username?: string | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          content_items: string[] | null
          created_at: string
          description: string | null
          detail_image_url: string
          id: string
          is_active: boolean
          name: string
          price_ton: number
          product_key: string
          sort_order: number
          store_image_url: string
          updated_at: string
        }
        Insert: {
          content_items?: string[] | null
          created_at?: string
          description?: string | null
          detail_image_url: string
          id?: string
          is_active?: boolean
          name: string
          price_ton: number
          product_key: string
          sort_order?: number
          store_image_url: string
          updated_at?: string
        }
        Update: {
          content_items?: string[] | null
          created_at?: string
          description?: string | null
          detail_image_url?: string
          id?: string
          is_active?: boolean
          name?: string
          price_ton?: number
          product_key?: string
          sort_order?: number
          store_image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_purchases: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          price_ton: number
          product_id: string
          product_key: string
          status: string
          transaction_hash: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          price_ton: number
          product_id: string
          product_key: string
          status?: string
          transaction_hash?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          price_ton?: number
          product_id?: string
          product_key?: string
          status?: string
          transaction_hash?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_buildings: {
        Row: {
          building_type: Database["public"]["Enums"]["building_type"]
          capacity: number
          created_at: string
          current_chickens: number
          id: string
          level: number
          position_index: number
          selected_skin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          building_type?: Database["public"]["Enums"]["building_type"]
          capacity?: number
          created_at?: string
          current_chickens?: number
          id?: string
          level?: number
          position_index: number
          selected_skin?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          building_type?: Database["public"]["Enums"]["building_type"]
          capacity?: number
          created_at?: string
          current_chickens?: number
          id?: string
          level?: number
          position_index?: number
          selected_skin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_buildings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          acquired_at: string
          id: string
          item_key: string
          item_type: string
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_key: string
          item_type: string
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_key?: string
          item_type?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          actions_count: number | null
          duration_seconds: number | null
          id: string
          is_active: boolean | null
          page_views: number | null
          session_end: string | null
          session_start: string | null
          user_id: string
        }
        Insert: {
          actions_count?: number | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          page_views?: number | null
          session_end?: string | null
          session_start?: string | null
          user_id: string
        }
        Update: {
          actions_count?: number | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          page_views?: number | null
          session_end?: string | null
          session_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          blockchain: string
          connected_at: string | null
          id: string
          is_primary: boolean | null
          last_used_at: string | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          blockchain: string
          connected_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          user_id: string
          wallet_address: string
        }
        Update: {
          blockchain?: string
          connected_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_connections: {
        Row: {
          connected_at: string | null
          disconnected_at: string | null
          id: string
          ip_address: string | null
          session_duration_seconds: number | null
          user_agent: string | null
          wallet_id: string
        }
        Insert: {
          connected_at?: string | null
          disconnected_at?: string | null
          id?: string
          ip_address?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          wallet_id: string
        }
        Update: {
          connected_at?: string | null
          disconnected_at?: string | null
          id?: string
          ip_address?: string | null
          session_duration_seconds?: number | null
          user_agent?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_connections_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_or_update_profile: {
        Args: {
          p_referrer_code?: string
          p_source?: string
          p_telegram_first_name: string
          p_telegram_id: number
          p_telegram_last_name?: string
          p_telegram_username?: string
        }
        Returns: {
          is_new_user: boolean
          profile_id: string
          referral_code: string
        }[]
      }
      get_metrics_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          date: string
          metadata: Json
          metric_type: Database["public"]["Enums"]["metric_type"]
          metric_value: number
        }[]
      }
      get_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_referrals: number
          total_referrals: number
          total_rewards: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_metric: {
        Args: {
          p_date: string
          p_increment?: number
          p_metadata?: Json
          p_metric_type: Database["public"]["Enums"]["metric_type"]
        }
        Returns: undefined
      }
      log_error: {
        Args: {
          p_context?: Json
          p_level: string
          p_message: string
          p_stack_trace?: string
          p_url?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      record_metric_event: {
        Args: {
          p_event_type: Database["public"]["Enums"]["metric_type"]
          p_event_value?: number
          p_metadata?: Json
          p_session_id?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      building_type: "corral" | "market" | "warehouse"
      metric_type:
        | "new_guest_users"
        | "new_registered_users"
        | "session_duration"
        | "page_view"
        | "button_click"
        | "feature_usage"
        | "building_purchased"
        | "ton_payment_initiated"
        | "ton_payment_completed"
        | "building_upgraded"
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
      app_role: ["admin", "moderator", "user"],
      building_type: ["corral", "market", "warehouse"],
      metric_type: [
        "new_guest_users",
        "new_registered_users",
        "session_duration",
        "page_view",
        "button_click",
        "feature_usage",
        "building_purchased",
        "ton_payment_initiated",
        "ton_payment_completed",
        "building_upgraded",
      ],
    },
  },
} as const
