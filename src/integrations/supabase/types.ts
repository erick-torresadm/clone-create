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
      admin_settings: {
        Row: {
          id: number
          telegram_admin_chat_id: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          telegram_admin_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          telegram_admin_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          abandoned_email_sent_at: string | null
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          coupon_code: string | null
          created_at: string
          delivered_data: Json | null
          discount: number
          email: string | null
          external_order_id: string | null
          id: string
          items: Json
          pix_expires_at: string | null
          pix_payload: string | null
          pix_qr_base64: string | null
          status: string
          stripe_session_id: string | null
          subtotal: number
          total: number
          user_id: string | null
        }
        Insert: {
          abandoned_email_sent_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_data?: Json | null
          discount?: number
          email?: string | null
          external_order_id?: string | null
          id?: string
          items: Json
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qr_base64?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal: number
          total: number
          user_id?: string | null
        }
        Update: {
          abandoned_email_sent_at?: string | null
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_data?: Json | null
          discount?: number
          email?: string | null
          external_order_id?: string | null
          id?: string
          items?: Json
          pix_expires_at?: string | null
          pix_payload?: string | null
          pix_qr_base64?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          user_id?: string | null
        }
        Relationships: []
      }
      popups: {
        Row: {
          active: boolean
          audience: string
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          content: string
          created_at: string
          delivered: boolean
          delivered_at: string | null
          id: string
          order_id: string | null
          product_id: string
        }
        Insert: {
          content: string
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
        }
        Update: {
          content?: string
          created_at?: string
          delivered?: boolean
          delivered_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          auto_sync: boolean
          badge: string | null
          created_at: string
          description: string | null
          external_currency: string | null
          external_id: string | null
          external_price: number | null
          external_provider: string | null
          external_quantity: number | null
          id: string
          image_url: string | null
          name: string
          old_price: number | null
          price: number
          rating: number | null
          reviews: number
          section_id: string | null
          slug: string | null
          sold: number
          sort_order: number
          source: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          auto_sync?: boolean
          badge?: string | null
          created_at?: string
          description?: string | null
          external_currency?: string | null
          external_id?: string | null
          external_price?: number | null
          external_provider?: string | null
          external_quantity?: number | null
          id?: string
          image_url?: string | null
          name: string
          old_price?: number | null
          price: number
          rating?: number | null
          reviews?: number
          section_id?: string | null
          slug?: string | null
          sold?: number
          sort_order?: number
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          auto_sync?: boolean
          badge?: string | null
          created_at?: string
          description?: string | null
          external_currency?: string | null
          external_id?: string | null
          external_price?: number | null
          external_provider?: string | null
          external_quantity?: number | null
          id?: string
          image_url?: string | null
          name?: string
          old_price?: number | null
          price?: number
          rating?: number | null
          reviews?: number
          section_id?: string | null
          slug?: string | null
          sold?: number
          sort_order?: number
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          active: boolean
          created_at: string
          emoji: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string
          announcement_bar: string | null
          brl_per_usd: number
          brl_per_vnd: number
          hero_subtitle: string
          hero_title: string
          home_grid_cols: number
          home_max_products: number
          home_show_all_products: boolean
          home_show_categories: boolean
          id: number
          logo_url: string | null
          primary_color: string
          store_name: string
          telegram: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string
          announcement_bar?: string | null
          brl_per_usd?: number
          brl_per_vnd?: number
          hero_subtitle?: string
          hero_title?: string
          home_grid_cols?: number
          home_max_products?: number
          home_show_all_products?: boolean
          home_show_categories?: boolean
          id?: number
          logo_url?: string | null
          primary_color?: string
          store_name?: string
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string
          announcement_bar?: string | null
          brl_per_usd?: number
          brl_per_vnd?: number
          hero_subtitle?: string
          hero_title?: string
          home_grid_cols?: number
          home_max_products?: number
          home_show_all_products?: boolean
          home_show_categories?: boolean
          id?: number
          logo_url?: string | null
          primary_color?: string
          store_name?: string
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      claim_stock: {
        Args: { _order_id: string; _product_id: string; _quantity: number }
        Returns: {
          content: string
          id: string
        }[]
      }
      get_db_size: { Args: never; Returns: number }
      get_stock_counts: {
        Args: never
        Returns: {
          available: number
          product_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: { Args: { _code: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      discount_type: "percent" | "fixed"
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
      app_role: ["admin", "user"],
      discount_type: ["percent", "fixed"],
    },
  },
} as const
