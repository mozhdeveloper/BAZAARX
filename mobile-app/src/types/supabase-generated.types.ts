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
      _orphan_orders_audit_20260424: {
        Row: {
          archived_at: string
          buyer_id: string | null
          created_at: string | null
          full_row: Json
          order_id: string
          order_number: string | null
          order_type: string | null
          payment_status: string | null
          reason: string
          related_payments: Json | null
          related_shipments: Json | null
          shipment_status: string | null
        }
        Insert: {
          archived_at?: string
          buyer_id?: string | null
          created_at?: string | null
          full_row: Json
          order_id: string
          order_number?: string | null
          order_type?: string | null
          payment_status?: string | null
          reason: string
          related_payments?: Json | null
          related_shipments?: Json | null
          shipment_status?: string | null
        }
        Update: {
          archived_at?: string
          buyer_id?: string | null
          created_at?: string | null
          full_row?: Json
          order_id?: string
          order_number?: string | null
          order_type?: string | null
          payment_status?: string | null
          reason?: string
          related_payments?: Json | null
          related_shipments?: Json | null
          shipment_status?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          action_data: Json | null
          action_url: string | null
          admin_id: string
          created_at: string
          id: string
          message: string
          priority: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_data?: Json | null
          action_url?: string | null
          admin_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          action_data?: Json | null
          action_url?: string | null
          admin_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          data: Json
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          id: string
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          sender: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          sender: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          action_data: Json | null
          action_url: string | null
          admin_id: string
          audience: string
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          message: string
          scheduled_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          action_url?: string | null
          admin_id: string
          audience?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message: string
          scheduled_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          action_url?: string | null
          admin_id?: string
          audience?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          message?: string
          scheduled_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          channels: Json
          created_at: string
          created_by: string | null
          delay_minutes: number | null
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          sms_template: string | null
          template_id: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          sms_template?: string | null
          template_id?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          sms_template?: string | null
          template_id?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bazcoin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bazcoin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bounce_logs: {
        Row: {
          bounce_type: string
          email: string
          id: string
          logged_at: string
          reason: string | null
          resend_event_id: string | null
        }
        Insert: {
          bounce_type: string
          email: string
          id?: string
          logged_at?: string
          reason?: string | null
          resend_event_id?: string | null
        }
        Update: {
          bounce_type?: string
          email?: string
          id?: string
          logged_at?: string
          reason?: string | null
          resend_event_id?: string | null
        }
        Relationships: []
      }
      buyer_notifications: {
        Row: {
          action_data: Json | null
          action_url: string | null
          buyer_id: string
          created_at: string
          id: string
          message: string
          priority: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_data?: Json | null
          action_url?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          action_data?: Json | null
          action_url?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_notifications_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_segments: {
        Row: {
          buyer_count: number | null
          created_at: string
          created_by: string | null
          description: string | null
          filter_criteria: Json
          id: string
          is_dynamic: boolean
          name: string
          updated_at: string
        }
        Insert: {
          buyer_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_criteria?: Json
          id?: string
          is_dynamic?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          buyer_count?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          filter_criteria?: Json
          id?: string
          is_dynamic?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      buyer_vouchers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          usage_count: number
          valid_from: string | null
          valid_until: string | null
          voucher_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
          voucher_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          usage_count?: number
          valid_from?: string | null
          valid_until?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_vouchers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          avatar_url: string | null
          bazcoins: number
          created_at: string
          id: string
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bazcoins?: number
          created_at?: string
          id: string
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bazcoins?: number
          created_at?: string
          id?: string
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          notes: string | null
          personalized_options: Json | null
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          notes?: string | null
          personalized_options?: Json | null
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          personalized_options?: Json | null
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: true
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_upvotes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_upvotes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "product_request_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          action: string
          channel: string
          id: string
          ip_address: unknown
          logged_at: string
          source: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          channel: string
          id?: string
          ip_address?: unknown
          logged_at?: string
          source: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          channel?: string
          id?: string
          ip_address?: unknown
          logged_at?: string
          source?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contributor_tiers: {
        Row: {
          bc_multiplier: number
          max_upvotes: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bc_multiplier?: number
          max_upvotes?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bc_multiplier?: number
          max_upvotes?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributor_tiers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          order_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_rate_cache: {
        Row: {
          cached_at: string
          courier_code: string
          destination_city: string
          estimated_days: number | null
          expires_at: string
          id: string
          origin_city: string
          rate: number
          service_type: string
          weight_kg: number
        }
        Insert: {
          cached_at?: string
          courier_code: string
          destination_city: string
          estimated_days?: number | null
          expires_at?: string
          id?: string
          origin_city: string
          rate: number
          service_type?: string
          weight_kg: number
        }
        Update: {
          cached_at?: string
          courier_code?: string
          destination_city?: string
          estimated_days?: number | null
          expires_at?: string
          id?: string
          origin_city?: string
          rate?: number
          service_type?: string
          weight_kg?: number
        }
        Relationships: []
      }
      delivery_bookings: {
        Row: {
          booked_at: string | null
          booking_reference: string | null
          buyer_id: string
          cod_amount: number | null
          courier_code: string
          courier_name: string
          created_at: string
          declared_value: number | null
          delivered_at: string | null
          delivery_address: Json
          estimated_delivery: string | null
          id: string
          insurance_fee: number | null
          is_cod: boolean | null
          order_id: string
          package_description: string | null
          package_dimensions: Json | null
          package_weight: number | null
          picked_up_at: string | null
          pickup_address: Json
          seller_id: string
          service_type: string
          shipping_fee: number
          status: string
          tracking_number: string | null
          updated_at: string | null
          waybill_url: string | null
        }
        Insert: {
          booked_at?: string | null
          booking_reference?: string | null
          buyer_id: string
          cod_amount?: number | null
          courier_code: string
          courier_name: string
          created_at?: string
          declared_value?: number | null
          delivered_at?: string | null
          delivery_address: Json
          estimated_delivery?: string | null
          id?: string
          insurance_fee?: number | null
          is_cod?: boolean | null
          order_id: string
          package_description?: string | null
          package_dimensions?: Json | null
          package_weight?: number | null
          picked_up_at?: string | null
          pickup_address: Json
          seller_id: string
          service_type?: string
          shipping_fee: number
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
          waybill_url?: string | null
        }
        Update: {
          booked_at?: string | null
          booking_reference?: string | null
          buyer_id?: string
          cod_amount?: number | null
          courier_code?: string
          courier_name?: string
          created_at?: string
          declared_value?: number | null
          delivered_at?: string | null
          delivery_address?: Json
          estimated_delivery?: string | null
          id?: string
          insurance_fee?: number | null
          is_cod?: boolean | null
          order_id?: string
          package_description?: string | null
          package_dimensions?: Json | null
          package_weight?: number | null
          picked_up_at?: string | null
          pickup_address?: Json
          seller_id?: string
          service_type?: string
          shipping_fee?: number
          status?: string
          tracking_number?: string | null
          updated_at?: string | null
          waybill_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_bookings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_bookings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking_events: {
        Row: {
          courier_status_code: string | null
          created_at: string
          delivery_booking_id: string
          description: string | null
          event_at: string
          id: string
          location: string | null
          status: string
        }
        Insert: {
          courier_status_code?: string | null
          created_at?: string
          delivery_booking_id: string
          description?: string | null
          event_at?: string
          id?: string
          location?: string | null
          status: string
        }
        Update: {
          courier_status_code?: string | null
          created_at?: string
          delivery_booking_id?: string
          description?: string | null
          event_at?: string
          id?: string
          location?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_events_delivery_booking_id_fkey"
            columns: ["delivery_booking_id"]
            isOneToOne: false
            referencedRelation: "delivery_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_campaigns: {
        Row: {
          applies_to: string
          badge_color: string | null
          badge_text: string | null
          campaign_scope: string | null
          campaign_type: string
          claim_limit: number | null
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          max_discount_amount: number | null
          min_purchase_amount: number
          name: string
          per_customer_limit: number
          priority: number
          seller_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          badge_color?: string | null
          badge_text?: string | null
          campaign_scope?: string | null
          campaign_type: string
          claim_limit?: number | null
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at: string
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          name: string
          per_customer_limit?: number
          priority?: number
          seller_id?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          badge_color?: string | null
          badge_text?: string | null
          campaign_scope?: string | null
          campaign_type?: string
          claim_limit?: number | null
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          max_discount_amount?: number | null
          min_purchase_amount?: number
          name?: string
          per_customer_limit?: number
          priority?: number
          seller_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          email_log_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          resend_message_id: string | null
        }
        Insert: {
          email_log_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          resend_message_id?: string | null
        }
        Update: {
          email_log_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          resend_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          category: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          queued_at: string | null
          recipient_email: string
          recipient_id: string | null
          resend_message_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          queued_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          queued_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          html_body: string
          id: string
          subject: string
          template_id: string
          text_body: string | null
          variables: Json | null
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          html_body: string
          id?: string
          subject: string
          template_id: string
          text_body?: string | null
          variables?: Json | null
          version_number?: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          html_body?: string
          id?: string
          subject?: string
          template_id?: string
          text_body?: string | null
          variables?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          html_body: string
          id: string
          is_active: boolean
          name: string
          slug: string
          subject: string
          text_body: string | null
          updated_at: string
          variables: Json | null
          version: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          html_body: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject: string
          text_body?: string | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          html_body?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject?: string
          text_body?: string | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_products: {
        Row: {
          created_at: string
          expires_at: string | null
          featured_at: string
          id: string
          is_active: boolean
          priority: number
          product_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          featured_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          product_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          featured_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          product_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sale_submissions: {
        Row: {
          created_at: string
          id: string
          product_id: string
          seller_id: string
          slot_id: string
          status: string | null
          submitted_price: number
          submitted_stock: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          seller_id: string
          slot_id: string
          status?: string | null
          submitted_price: number
          submitted_stock?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          seller_id?: string
          slot_id?: string
          status?: string | null
          submitted_price?: number
          submitted_stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "flash_sale_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_submissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sale_submissions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "global_flash_sale_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      global_flash_sale_slots: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          id: string
          min_discount_percentage: number
          name: string
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          min_discount_percentage?: number
          name: string
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          min_discount_percentage?: number
          name?: string
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: string
          metadata: Json
          notes: string | null
          order_id: string | null
          product_id: string | null
          reason: string
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          reason: string
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_by: string | null
          created_at: string
          id: string
          product_id: string
          threshold: number
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          product_id: string
          threshold: number
        }
        Update: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          product_id?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "low_stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          campaign_type: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          locked: boolean
          name: string
          scheduled_at: string | null
          segment_id: string | null
          seller_id: string | null
          sent_at: string | null
          sms_content: string | null
          status: string
          subject: string | null
          template_id: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_opened: number | null
          total_recipients: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_type: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locked?: boolean
          name: string
          scheduled_at?: string | null
          segment_id?: string | null
          seller_id?: string | null
          sent_at?: string | null
          sms_content?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          campaign_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locked?: boolean
          name?: string
          scheduled_at?: string | null
          segment_id?: string | null
          seller_id?: string | null
          sent_at?: string | null
          sms_content?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "buyer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          media_type: string | null
          media_url: string | null
          message_content: string | null
          message_type: Database["public"]["Enums"]["message_type_enum"] | null
          order_event_type:
            | Database["public"]["Enums"]["order_event_enum"]
            | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_type: string | null
          target_seller_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: Database["public"]["Enums"]["message_type_enum"] | null
          order_event_type?:
            | Database["public"]["Enums"]["order_event_enum"]
            | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
          target_seller_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          media_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: Database["public"]["Enums"]["message_type_enum"] | null
          order_event_type?:
            | Database["public"]["Enums"]["order_event_enum"]
            | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
          target_seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_target_seller_id_fkey"
            columns: ["target_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          is_enabled: boolean
          template_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          event_type: string
          id?: string
          is_enabled?: boolean
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          is_enabled?: boolean
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_template_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          id: string
          order_id: string
          reason: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_discounts: {
        Row: {
          buyer_id: string
          campaign_id: string | null
          created_at: string
          discount_amount: number
          id: string
          order_id: string
        }
        Insert: {
          buyer_id: string
          campaign_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          order_id: string
        }
        Update: {
          buyer_id?: string
          campaign_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_discounts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_discounts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          event_type: Database["public"]["Enums"]["order_event_enum"]
          id: string
          message_generated: boolean | null
          order_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          event_type: Database["public"]["Enums"]["order_event_enum"]
          id?: string
          message_generated?: boolean | null
          order_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["order_event_enum"]
          id?: string
          message_generated?: boolean | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          personalized_options: Json | null
          price: number
          price_discount: number
          primary_image_url: string | null
          product_id: string | null
          product_name: string
          quantity: number
          rating: number | null
          shipping_discount: number
          shipping_price: number
          updated_at: string
          variant_id: string | null
          warranty_claim_notes: string | null
          warranty_claim_reason: string | null
          warranty_claim_status: string | null
          warranty_claimed: boolean | null
          warranty_claimed_at: string | null
          warranty_duration_months: number | null
          warranty_expiration_date: string | null
          warranty_provider_contact: string | null
          warranty_provider_email: string | null
          warranty_provider_name: string | null
          warranty_start_date: string | null
          warranty_terms_url: string | null
          warranty_type:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          personalized_options?: Json | null
          price: number
          price_discount?: number
          primary_image_url?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          rating?: number | null
          shipping_discount?: number
          shipping_price?: number
          updated_at?: string
          variant_id?: string | null
          warranty_claim_notes?: string | null
          warranty_claim_reason?: string | null
          warranty_claim_status?: string | null
          warranty_claimed?: boolean | null
          warranty_claimed_at?: string | null
          warranty_duration_months?: number | null
          warranty_expiration_date?: string | null
          warranty_provider_contact?: string | null
          warranty_provider_email?: string | null
          warranty_provider_name?: string | null
          warranty_start_date?: string | null
          warranty_terms_url?: string | null
          warranty_type?:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          personalized_options?: Json | null
          price?: number
          price_discount?: number
          primary_image_url?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          rating?: number | null
          shipping_discount?: number
          shipping_price?: number
          updated_at?: string
          variant_id?: string | null
          warranty_claim_notes?: string | null
          warranty_claim_reason?: string | null
          warranty_claim_status?: string | null
          warranty_claimed?: boolean | null
          warranty_claimed_at?: string | null
          warranty_duration_months?: number | null
          warranty_expiration_date?: string | null
          warranty_provider_contact?: string | null
          warranty_provider_email?: string | null
          warranty_provider_name?: string | null
          warranty_start_date?: string | null
          warranty_terms_url?: string | null
          warranty_type?:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          payment_date: string | null
          payment_method: Json | null
          payment_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          payment_date?: string | null
          payment_method?: Json | null
          payment_reference?: string | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_date?: string | null
          payment_method?: Json | null
          payment_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_recipients: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_registry_recipient: boolean | null
          last_name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_registry_recipient?: boolean | null
          last_name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_registry_recipient?: boolean | null
          last_name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      order_shipments: {
        Row: {
          calculated_fee: number
          chargeable_weight_kg: number
          created_at: string
          delivered_at: string | null
          destination_zone: string
          estimated_days_text: string
          fee_breakdown: Json
          id: string
          order_id: string
          origin_zone: string
          seller_id: string
          shipped_at: string | null
          shipping_method: string
          shipping_method_label: string
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          calculated_fee: number
          chargeable_weight_kg?: number
          created_at?: string
          delivered_at?: string | null
          destination_zone: string
          estimated_days_text: string
          fee_breakdown?: Json
          id?: string
          order_id: string
          origin_zone: string
          seller_id: string
          shipped_at?: string | null
          shipping_method: string
          shipping_method_label: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          calculated_fee?: number
          chargeable_weight_kg?: number
          created_at?: string
          delivered_at?: string | null
          destination_zone?: string
          estimated_days_text?: string
          fee_breakdown?: Json
          id?: string
          order_id?: string
          origin_zone?: string
          seller_id?: string
          shipped_at?: string | null
          shipping_method?: string
          shipping_method_label?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_vouchers: {
        Row: {
          buyer_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          voucher_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id: string
          voucher_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_vouchers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_vouchers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          buyer_id: string | null
          created_at: string
          id: string
          is_registry_order: boolean | null
          notes: string | null
          order_number: string
          order_type: string
          paid_at: string | null
          payment_status: string
          pos_note: string | null
          receipt_number: string | null
          recipient_id: string | null
          recipient_snapshot: Json | null
          registry_id: string | null
          shipment_status: string
          shipping_address_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          buyer_id?: string | null
          created_at?: string
          id?: string
          is_registry_order?: boolean | null
          notes?: string | null
          order_number: string
          order_type?: string
          paid_at?: string | null
          payment_status?: string
          pos_note?: string | null
          receipt_number?: string | null
          recipient_id?: string | null
          recipient_snapshot?: Json | null
          registry_id?: string | null
          shipment_status?: string
          shipping_address_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          buyer_id?: string | null
          created_at?: string
          id?: string
          is_registry_order?: boolean | null
          notes?: string | null
          order_number?: string
          order_type?: string
          paid_at?: string | null
          payment_status?: string
          pos_note?: string | null
          receipt_number?: string | null
          recipient_id?: string | null
          recipient_snapshot?: Json | null
          registry_id?: string | null
          shipment_status?: string
          shipping_address_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "shipping_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "order_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "registries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_banks: {
        Row: {
          account_number_last4: string | null
          bank_name: string | null
          payment_method_id: string
        }
        Insert: {
          account_number_last4?: string | null
          bank_name?: string | null
          payment_method_id: string
        }
        Update: {
          account_number_last4?: string | null
          bank_name?: string | null
          payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_banks_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_cards: {
        Row: {
          card_brand: string | null
          card_last4: string | null
          expiry_month: number | null
          expiry_year: number | null
          payment_method_id: string
        }
        Insert: {
          card_brand?: string | null
          card_last4?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          payment_method_id: string
        }
        Update: {
          card_brand?: string | null
          card_last4?: string | null
          expiry_month?: number | null
          expiry_year?: number | null
          payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_cards_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_wallets: {
        Row: {
          e_wallet_account_number: string | null
          e_wallet_provider: string | null
          payment_method_id: string
        }
        Insert: {
          e_wallet_account_number?: string | null
          e_wallet_provider?: string | null
          payment_method_id: string
        }
        Update: {
          e_wallet_account_number?: string | null
          e_wallet_provider?: string | null
          payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_wallets_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: true
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          is_verified: boolean
          label: string
          payment_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          label: string
          payment_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          is_verified?: boolean
          label?: string
          payment_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          description: string | null
          escrow_held_at: string | null
          escrow_release_at: string | null
          escrow_released_at: string | null
          escrow_status: string
          failure_reason: string | null
          gateway: string
          gateway_checkout_url: string | null
          gateway_payment_intent_id: string | null
          gateway_payment_method_id: string | null
          gateway_source_id: string | null
          id: string
          metadata: Json | null
          order_id: string
          paid_at: string | null
          payment_type: string
          refunded_at: string | null
          seller_id: string
          statement_descriptor: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          description?: string | null
          escrow_held_at?: string | null
          escrow_release_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          failure_reason?: string | null
          gateway?: string
          gateway_checkout_url?: string | null
          gateway_payment_intent_id?: string | null
          gateway_payment_method_id?: string | null
          gateway_source_id?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          paid_at?: string | null
          payment_type: string
          refunded_at?: string | null
          seller_id: string
          statement_descriptor?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          escrow_held_at?: string | null
          escrow_release_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          failure_reason?: string | null
          gateway?: string
          gateway_checkout_url?: string | null
          gateway_payment_intent_id?: string | null
          gateway_payment_method_id?: string | null
          gateway_source_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          paid_at?: string | null
          payment_type?: string
          refunded_at?: string | null
          seller_id?: string
          statement_descriptor?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_settings: {
        Row: {
          accept_card: boolean | null
          accept_cash: boolean | null
          accept_gcash: boolean | null
          accept_maya: boolean | null
          auto_add_on_scan: boolean | null
          auto_print_receipt: boolean | null
          barcode_scanner_enabled: boolean | null
          cash_drawer_enabled: boolean | null
          created_at: string | null
          default_branch: string | null
          default_opening_cash: number | null
          enable_low_stock_alert: boolean | null
          id: string
          logo_url: string | null
          low_stock_threshold: number | null
          multi_branch_enabled: boolean | null
          printer_name: string | null
          printer_type: string | null
          receipt_footer: string | null
          receipt_header: string | null
          receipt_template: string | null
          require_staff_login: boolean | null
          scanner_type: string | null
          seller_id: string
          show_logo_on_receipt: boolean | null
          sound_enabled: boolean | null
          staff_tracking_enabled: boolean | null
          tax_enabled: boolean | null
          tax_inclusive: boolean | null
          tax_name: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          accept_card?: boolean | null
          accept_cash?: boolean | null
          accept_gcash?: boolean | null
          accept_maya?: boolean | null
          auto_add_on_scan?: boolean | null
          auto_print_receipt?: boolean | null
          barcode_scanner_enabled?: boolean | null
          cash_drawer_enabled?: boolean | null
          created_at?: string | null
          default_branch?: string | null
          default_opening_cash?: number | null
          enable_low_stock_alert?: boolean | null
          id?: string
          logo_url?: string | null
          low_stock_threshold?: number | null
          multi_branch_enabled?: boolean | null
          printer_name?: string | null
          printer_type?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_template?: string | null
          require_staff_login?: boolean | null
          scanner_type?: string | null
          seller_id: string
          show_logo_on_receipt?: boolean | null
          sound_enabled?: boolean | null
          staff_tracking_enabled?: boolean | null
          tax_enabled?: boolean | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          accept_card?: boolean | null
          accept_cash?: boolean | null
          accept_gcash?: boolean | null
          accept_maya?: boolean | null
          auto_add_on_scan?: boolean | null
          auto_print_receipt?: boolean | null
          barcode_scanner_enabled?: boolean | null
          cash_drawer_enabled?: boolean | null
          created_at?: string | null
          default_branch?: string | null
          default_opening_cash?: number | null
          enable_low_stock_alert?: boolean | null
          id?: string
          logo_url?: string | null
          low_stock_threshold?: number | null
          multi_branch_enabled?: boolean | null
          printer_name?: string | null
          printer_type?: string | null
          receipt_footer?: string | null
          receipt_header?: string | null
          receipt_template?: string | null
          require_staff_login?: boolean | null
          scanner_type?: string | null
          seller_id?: string
          show_logo_on_receipt?: boolean | null
          sound_enabled?: boolean | null
          staff_tracking_enabled?: boolean | null
          tax_enabled?: boolean | null
          tax_inclusive?: boolean | null
          tax_name?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ad_boosts: {
        Row: {
          boost_type: string
          clicks: number
          cost_per_day: number
          created_at: string
          currency: string
          daily_budget: number
          duration_days: number
          ends_at: string
          id: string
          impressions: number
          orders_generated: number
          paused_at: string | null
          product_id: string
          seller_id: string
          starts_at: string
          status: string
          total_budget: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          boost_type?: string
          clicks?: number
          cost_per_day?: number
          created_at?: string
          currency?: string
          daily_budget?: number
          duration_days?: number
          ends_at: string
          id?: string
          impressions?: number
          orders_generated?: number
          paused_at?: string | null
          product_id: string
          seller_id: string
          starts_at?: string
          status?: string
          total_budget?: number
          total_cost?: number
          updated_at?: string
        }
        Update: {
          boost_type?: string
          clicks?: number
          cost_per_day?: number
          created_at?: string
          currency?: string
          daily_budget?: number
          duration_days?: number
          ends_at?: string
          id?: string
          impressions?: number
          orders_generated?: number
          paused_at?: string | null
          product_id?: string
          seller_id?: string
          starts_at?: string
          status?: string
          total_budget?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ad_boosts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_ad_boosts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ad_boosts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_approvals: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_approvals_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assessment_logistics: {
        Row: {
          assessment_id: string
          batch_id: string | null
          courier_service: string | null
          created_at: string
          created_by: string | null
          details: string | null
          dropoff_date: string | null
          dropoff_slot: string | null
          dropoff_time: string | null
          id: string
          logistics_method: string | null
          metadata: Json | null
          tracking_number: string | null
        }
        Insert: {
          assessment_id: string
          batch_id?: string | null
          courier_service?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          dropoff_date?: string | null
          dropoff_slot?: string | null
          dropoff_time?: string | null
          id?: string
          logistics_method?: string | null
          metadata?: Json | null
          tracking_number?: string | null
        }
        Update: {
          assessment_id?: string
          batch_id?: string | null
          courier_service?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          dropoff_date?: string | null
          dropoff_slot?: string | null
          dropoff_time?: string | null
          id?: string
          logistics_method?: string | null
          metadata?: Json | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_assessment_logistics_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assessment_logistics_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "qa_submission_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assessments: {
        Row: {
          admin_accepted_at: string | null
          admin_accepted_by: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          revision_requested_at: string | null
          status: string
          submitted_at: string
          verified_at: string | null
        }
        Insert: {
          admin_accepted_at?: string | null
          admin_accepted_by?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          revision_requested_at?: string | null
          status?: string
          submitted_at?: string
          verified_at?: string | null
        }
        Update: {
          admin_accepted_at?: string | null
          admin_accepted_by?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          revision_requested_at?: string | null
          status?: string
          submitted_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_assessments_admin_accepted_by_fkey"
            columns: ["admin_accepted_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assessments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_assessments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_discounts: {
        Row: {
          campaign_id: string
          created_at: string
          discount_type: string | null
          discount_value: number | null
          id: string
          override_discount_type: string | null
          override_discount_value: number | null
          priority: number
          product_id: string
          sold_count: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          override_discount_type?: string | null
          override_discount_value?: number | null
          priority?: number
          product_id: string
          sold_count?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          override_discount_type?: string | null
          override_discount_value?: number | null
          priority?: number
          product_id?: string
          sold_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_discounts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
          sort_order: number
          uploaded_at: string
        }
        Insert: {
          alt_text?: string | null
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          uploaded_at?: string
        }
        Update: {
          alt_text?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rejections: {
        Row: {
          admin_reclassified_category: string | null
          assessment_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          product_id: string | null
          vendor_submitted_category: string | null
        }
        Insert: {
          admin_reclassified_category?: string | null
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          vendor_submitted_category?: string | null
        }
        Update: {
          admin_reclassified_category?: string | null
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          vendor_submitted_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_rejections_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rejections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_rejections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_request_comments: {
        Row: {
          admin_upvotes: number
          bc_awarded: number
          content: string
          created_at: string
          id: string
          is_admin_only: boolean
          request_id: string
          type: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          admin_upvotes?: number
          bc_awarded?: number
          content: string
          created_at?: string
          id?: string
          is_admin_only?: boolean
          request_id: string
          type: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          admin_upvotes?: number
          bc_awarded?: number
          content?: string
          created_at?: string
          id?: string
          is_admin_only?: boolean
          request_id?: string
          type?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_request_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          admin_notes: string | null
          category: string | null
          comments_count: number
          converted_at: string | null
          created_at: string
          demand_count: number
          description: string | null
          estimated_demand: number | null
          id: string
          linked_product_id: string | null
          merged_into_id: string | null
          priority: string
          product_name: string
          reference_links: string[]
          rejection_hold_reason: string | null
          requested_by_id: string | null
          requested_by_name: string | null
          reward_amount: number
          sourcing_stage: string | null
          staked_bazcoins: number
          status: string
          summary: string | null
          title: string | null
          updated_at: string
          votes: number
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          comments_count?: number
          converted_at?: string | null
          created_at?: string
          demand_count?: number
          description?: string | null
          estimated_demand?: number | null
          id?: string
          linked_product_id?: string | null
          merged_into_id?: string | null
          priority?: string
          product_name: string
          reference_links?: string[]
          rejection_hold_reason?: string | null
          requested_by_id?: string | null
          requested_by_name?: string | null
          reward_amount?: number
          sourcing_stage?: string | null
          staked_bazcoins?: number
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          votes?: number
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          comments_count?: number
          converted_at?: string | null
          created_at?: string
          demand_count?: number
          description?: string | null
          estimated_demand?: number | null
          id?: string
          linked_product_id?: string | null
          merged_into_id?: string | null
          priority?: string
          product_name?: string
          reference_links?: string[]
          rejection_hold_reason?: string | null
          requested_by_id?: string | null
          requested_by_name?: string | null
          reward_amount?: number
          sourcing_stage?: string | null
          staked_bazcoins?: number
          status?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_requests_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      product_revisions: {
        Row: {
          assessment_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_revisions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color: string | null
          created_at: string
          embedding: string | null
          id: string
          option_1_value: string | null
          option_2_value: string | null
          price: number
          product_id: string
          size: string | null
          sku: string
          stock: number
          thumbnail_url: string | null
          updated_at: string
          variant_name: string
        }
        Insert: {
          barcode?: string | null
          color?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          option_1_value?: string | null
          option_2_value?: string | null
          price: number
          product_id: string
          size?: string | null
          sku: string
          stock?: number
          thumbnail_url?: string | null
          updated_at?: string
          variant_name: string
        }
        Update: {
          barcode?: string | null
          color?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          option_1_value?: string | null
          option_2_value?: string | null
          price?: number
          product_id?: string
          size?: string | null
          sku?: string
          stock?: number
          thumbnail_url?: string | null
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approval_status: string
          brand: string | null
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          dimensions: Json | null
          disabled_at: string | null
          has_warranty: boolean | null
          id: string
          image_embedding: string | null
          is_free_shipping: boolean
          low_stock_threshold: number
          name: string
          price: number
          seller_id: string | null
          size_guide_image: string | null
          sku: string | null
          specifications: Json | null
          updated_at: string
          variant_label_1: string | null
          variant_label_2: string | null
          warranty_duration_months: number | null
          warranty_policy: string | null
          warranty_provider_contact: string | null
          warranty_provider_email: string | null
          warranty_provider_name: string | null
          warranty_terms_url: string | null
          warranty_type:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
          weight: number | null
        }
        Insert: {
          approval_status?: string
          brand?: string | null
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          dimensions?: Json | null
          disabled_at?: string | null
          has_warranty?: boolean | null
          id?: string
          image_embedding?: string | null
          is_free_shipping?: boolean
          low_stock_threshold?: number
          name: string
          price: number
          seller_id?: string | null
          size_guide_image?: string | null
          sku?: string | null
          specifications?: Json | null
          updated_at?: string
          variant_label_1?: string | null
          variant_label_2?: string | null
          warranty_duration_months?: number | null
          warranty_policy?: string | null
          warranty_provider_contact?: string | null
          warranty_provider_email?: string | null
          warranty_provider_name?: string | null
          warranty_terms_url?: string | null
          warranty_type?:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
          weight?: number | null
        }
        Update: {
          approval_status?: string
          brand?: string | null
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          dimensions?: Json | null
          disabled_at?: string | null
          has_warranty?: boolean | null
          id?: string
          image_embedding?: string | null
          is_free_shipping?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          seller_id?: string | null
          size_guide_image?: string | null
          sku?: string | null
          specifications?: Json | null
          updated_at?: string
          variant_label_1?: string | null
          variant_label_2?: string | null
          warranty_duration_months?: number | null
          warranty_policy?: string | null
          warranty_provider_contact?: string | null
          warranty_provider_email?: string | null
          warranty_provider_name?: string | null
          warranty_terms_url?: string | null
          warranty_type?:
            | Database["public"]["Enums"]["warranty_type_enum"]
            | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_review_logs: {
        Row: {
          action: string
          assessment_id: string
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          product_id: string
          reviewer_id: string
        }
        Insert: {
          action: string
          assessment_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          product_id: string
          reviewer_id: string
        }
        Update: {
          action?: string
          assessment_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          product_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_review_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_review_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "qa_review_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_submission_batch_items: {
        Row: {
          assessment_id: string
          batch_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          assessment_id: string
          batch_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          assessment_id?: string
          batch_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_submission_batch_items_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "product_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_submission_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "qa_submission_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_submission_batch_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "qa_submission_batch_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_submission_batches: {
        Row: {
          batch_code: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          seller_id: string
          status: string
          submission_type: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          seller_id: string
          status?: string
          submission_type?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          seller_id?: string
          status?: string
          submission_type?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_submission_batches_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_team_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          max_concurrent_reviews: number
          permissions: Json | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_active?: boolean
          max_concurrent_reviews?: number
          permissions?: Json | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          max_concurrent_reviews?: number
          permissions?: Json | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_team_members_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_return_periods: {
        Row: {
          buyer_shipped_at: string | null
          counter_offer_amount: number | null
          created_at: string
          description: string | null
          escalated_at: string | null
          evidence_urls: string[] | null
          id: string
          is_returnable: boolean
          items_json: Json | null
          order_id: string
          refund_amount: number | null
          refund_date: string | null
          rejected_reason: string | null
          resolution_path: string
          resolution_source: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_label_url: string | null
          return_reason: string | null
          return_received_at: string | null
          return_tracking_number: string | null
          return_type: string
          return_window_days: number
          seller_deadline: string | null
          seller_note: string | null
          status: string
        }
        Insert: {
          buyer_shipped_at?: string | null
          counter_offer_amount?: number | null
          created_at?: string
          description?: string | null
          escalated_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          is_returnable?: boolean
          items_json?: Json | null
          order_id: string
          refund_amount?: number | null
          refund_date?: string | null
          rejected_reason?: string | null
          resolution_path?: string
          resolution_source?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_label_url?: string | null
          return_reason?: string | null
          return_received_at?: string | null
          return_tracking_number?: string | null
          return_type?: string
          return_window_days?: number
          seller_deadline?: string | null
          seller_note?: string | null
          status?: string
        }
        Update: {
          buyer_shipped_at?: string | null
          counter_offer_amount?: number | null
          created_at?: string
          description?: string | null
          escalated_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          is_returnable?: boolean
          items_json?: Json | null
          order_id?: string
          refund_amount?: number | null
          refund_date?: string | null
          rejected_reason?: string | null
          resolution_path?: string
          resolution_source?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_label_url?: string | null
          return_reason?: string | null
          return_received_at?: string | null
          return_tracking_number?: string | null
          return_type?: string
          return_window_days?: number
          seller_deadline?: string | null
          seller_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_return_periods_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      registries: {
        Row: {
          buyer_id: string
          category: string | null
          created_at: string
          delivery: Json | null
          description: string | null
          event_type: string
          id: string
          image_url: string | null
          privacy: string
          shared_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          category?: string | null
          created_at?: string
          delivery?: Json | null
          description?: string | null
          event_type: string
          id?: string
          image_url?: string | null
          privacy: string
          shared_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          category?: string | null
          created_at?: string
          delivery?: Json | null
          description?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          privacy?: string
          shared_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registries_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      registry_items: {
        Row: {
          created_at: string
          id: string
          is_most_wanted: boolean
          notes: string | null
          priority: string
          product_id: string | null
          product_name: string | null
          product_snapshot: Json | null
          quantity_desired: number
          received_qty: number
          registry_id: string
          requested_qty: number
          selected_variant: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_most_wanted?: boolean
          notes?: string | null
          priority?: string
          product_id?: string | null
          product_name?: string | null
          product_snapshot?: Json | null
          quantity_desired: number
          received_qty?: number
          registry_id: string
          requested_qty?: number
          selected_variant?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_most_wanted?: boolean
          notes?: string | null
          priority?: string
          product_id?: string | null
          product_name?: string | null
          product_snapshot?: Json | null
          quantity_desired?: number
          received_qty?: number
          registry_id?: string
          requested_qty?: number
          selected_variant?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "registry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registry_items_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "registries"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          caption: string | null
          created_at: string
          file_type: string
          file_url: string
          id: string
          is_supplier_link: boolean
          request_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_type: string
          file_url: string
          id?: string
          is_supplier_link?: boolean
          request_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          is_supplier_link?: boolean
          request_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      request_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          request_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_supports: {
        Row: {
          bazcoin_amount: number
          created_at: string
          id: string
          request_id: string
          rewarded: boolean
          support_type: string
          user_id: string
        }
        Insert: {
          bazcoin_amount?: number
          created_at?: string
          id?: string
          request_id: string
          rewarded?: boolean
          support_type: string
          user_id: string
        }
        Update: {
          bazcoin_amount?: number
          created_at?: string
          id?: string
          request_id?: string
          rewarded?: boolean
          support_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_supports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_supports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      return_messages: {
        Row: {
          attachments: string[] | null
          body: string
          created_at: string
          id: string
          return_id: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          attachments?: string[] | null
          body: string
          created_at?: string
          id?: string
          return_id: string
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          attachments?: string[] | null
          body?: string
          created_at?: string
          id?: string
          return_id?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_messages_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "refund_return_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          id: string
          image_url: string
          review_id: string
          sort_order: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          image_url: string
          review_id: string
          sort_order?: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          review_id?: string
          sort_order?: number
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          buyer_id: string
          created_at: string
          review_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          review_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          helpful_count: number
          id: string
          is_edited: boolean
          is_hidden: boolean
          is_verified_purchase: boolean
          order_id: string | null
          order_item_id: string | null
          product_id: string
          rating: number
          seller_reply: Json | null
          updated_at: string
          variant_snapshot: Json | null
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          order_item_id?: string | null
          product_id: string
          rating: number
          seller_reply?: Json | null
          updated_at?: string
          variant_snapshot?: Json | null
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          is_edited?: boolean
          is_hidden?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string
          rating?: number
          seller_reply?: Json | null
          updated_at?: string
          variant_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_business_profiles: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          business_registration_number: string | null
          business_type: string | null
          city: string | null
          created_at: string
          postal_code: string | null
          province: string | null
          seller_id: string
          tax_id_number: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          postal_code?: string | null
          province?: string | null
          seller_id: string
          tax_id_number?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          postal_code?: string | null
          province?: string | null
          seller_id?: string
          tax_id_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_business_profiles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          seller_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          seller_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_categories_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_chat_requests: {
        Row: {
          buyer_id: string
          buyer_name: string | null
          created_at: string
          id: string
          message: string | null
          product_id: string | null
          product_name: string | null
          responded_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_name?: string | null
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          product_name?: string | null
          responded_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_name?: string | null
          created_at?: string
          id?: string
          message?: string | null
          product_id?: string | null
          product_name?: string | null
          responded_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_chat_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_chat_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "seller_chat_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_chat_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_notifications: {
        Row: {
          action_data: Json | null
          action_url: string | null
          created_at: string
          id: string
          message: string
          priority: string
          read_at: string | null
          seller_id: string
          title: string
          type: string
        }
        Insert: {
          action_data?: Json | null
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          read_at?: string | null
          seller_id: string
          title: string
          type: string
        }
        Update: {
          action_data?: Json | null
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          read_at?: string | null
          seller_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_notifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payout_settings: {
        Row: {
          auto_payout: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          ewallet_number: string | null
          ewallet_provider: string | null
          id: string
          min_payout_amount: number | null
          payout_method: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          auto_payout?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ewallet_number?: string | null
          ewallet_provider?: string | null
          id?: string
          min_payout_amount?: number | null
          payout_method?: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          auto_payout?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          ewallet_number?: string | null
          ewallet_provider?: string | null
          id?: string
          min_payout_amount?: number | null
          payout_method?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payout_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          created_at: string
          currency: string
          escrow_transaction_id: string | null
          failure_reason: string | null
          gross_amount: number
          id: string
          net_amount: number
          order_id: string | null
          payment_transaction_id: string | null
          payout_account_details: Json
          payout_method: string
          platform_fee: number
          processed_at: string | null
          release_after: string | null
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          escrow_transaction_id?: string | null
          failure_reason?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          order_id?: string | null
          payment_transaction_id?: string | null
          payout_account_details?: Json
          payout_method: string
          platform_fee?: number
          processed_at?: string | null
          release_after?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          escrow_transaction_id?: string | null
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          order_id?: string | null
          payment_transaction_id?: string | null
          payout_account_details?: Json
          payout_method?: string
          platform_fee?: number
          processed_at?: string | null
          release_after?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_rejection_items: {
        Row: {
          created_at: string
          document_field: string
          id: string
          reason: string | null
          rejection_id: string
        }
        Insert: {
          created_at?: string
          document_field: string
          id?: string
          reason?: string | null
          rejection_id: string
        }
        Update: {
          created_at?: string
          document_field?: string
          id?: string
          reason?: string | null
          rejection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_rejection_items_rejection_id_fkey"
            columns: ["rejection_id"]
            isOneToOne: false
            referencedRelation: "seller_rejections"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_rejections: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          rejection_type: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          rejection_type?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          rejection_type?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_rejections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_rejections_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_tiers: {
        Row: {
          bypasses_assessment: boolean | null
          created_at: string
          id: string
          seller_id: string
          tier_level: string
          updated_at: string
        }
        Insert: {
          bypasses_assessment?: boolean | null
          created_at?: string
          id?: string
          seller_id: string
          tier_level?: string
          updated_at?: string
        }
        Update: {
          bypasses_assessment?: boolean | null
          created_at?: string
          id?: string
          seller_id?: string
          tier_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_tiers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_verification_document_drafts: {
        Row: {
          business_permit_updated_at: string | null
          business_permit_url: string | null
          created_at: string | null
          dti_registration_updated_at: string | null
          dti_registration_url: string | null
          proof_of_address_updated_at: string | null
          proof_of_address_url: string | null
          seller_id: string
          tax_id_updated_at: string | null
          tax_id_url: string | null
          updated_at: string | null
          valid_id_updated_at: string | null
          valid_id_url: string | null
        }
        Insert: {
          business_permit_updated_at?: string | null
          business_permit_url?: string | null
          created_at?: string | null
          dti_registration_updated_at?: string | null
          dti_registration_url?: string | null
          proof_of_address_updated_at?: string | null
          proof_of_address_url?: string | null
          seller_id: string
          tax_id_updated_at?: string | null
          tax_id_url?: string | null
          updated_at?: string | null
          valid_id_updated_at?: string | null
          valid_id_url?: string | null
        }
        Update: {
          business_permit_updated_at?: string | null
          business_permit_url?: string | null
          created_at?: string | null
          dti_registration_updated_at?: string | null
          dti_registration_url?: string | null
          proof_of_address_updated_at?: string | null
          proof_of_address_url?: string | null
          seller_id?: string
          tax_id_updated_at?: string | null
          tax_id_url?: string | null
          updated_at?: string | null
          valid_id_updated_at?: string | null
          valid_id_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_verification_document_drafts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_verification_documents: {
        Row: {
          business_permit_url: string | null
          created_at: string
          dti_registration_url: string | null
          proof_of_address_url: string | null
          seller_id: string
          tax_id_url: string | null
          updated_at: string
          valid_id_url: string | null
        }
        Insert: {
          business_permit_url?: string | null
          created_at?: string
          dti_registration_url?: string | null
          proof_of_address_url?: string | null
          seller_id: string
          tax_id_url?: string | null
          updated_at?: string
          valid_id_url?: string | null
        }
        Update: {
          business_permit_url?: string | null
          created_at?: string
          dti_registration_url?: string | null
          proof_of_address_url?: string | null
          seller_id?: string
          tax_id_url?: string | null
          updated_at?: string
          valid_id_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_verification_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          approval_status: string
          avatar_url: string | null
          blacklisted_at: string | null
          cool_down_until: string | null
          cooldown_count: number | null
          created_at: string
          id: string
          is_permanently_blacklisted: boolean | null
          is_vacation_mode: boolean | null
          owner_name: string | null
          reapplication_attempts: number | null
          shipping_origin_lat: number | null
          shipping_origin_lng: number | null
          store_banner_url: string | null
          store_contact_number: string | null
          store_description: string | null
          store_name: string
          suspended_at: string | null
          suspension_reason: string | null
          temp_blacklist_count: number | null
          temp_blacklist_until: string | null
          updated_at: string
          vacation_reason: string | null
          verified_at: string | null
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          blacklisted_at?: string | null
          cool_down_until?: string | null
          cooldown_count?: number | null
          created_at?: string
          id: string
          is_permanently_blacklisted?: boolean | null
          is_vacation_mode?: boolean | null
          owner_name?: string | null
          reapplication_attempts?: number | null
          shipping_origin_lat?: number | null
          shipping_origin_lng?: number | null
          store_banner_url?: string | null
          store_contact_number?: string | null
          store_description?: string | null
          store_name: string
          suspended_at?: string | null
          suspension_reason?: string | null
          temp_blacklist_count?: number | null
          temp_blacklist_until?: string | null
          updated_at?: string
          vacation_reason?: string | null
          verified_at?: string | null
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          blacklisted_at?: string | null
          cool_down_until?: string | null
          cooldown_count?: number | null
          created_at?: string
          id?: string
          is_permanently_blacklisted?: boolean | null
          is_vacation_mode?: boolean | null
          owner_name?: string | null
          reapplication_attempts?: number | null
          shipping_origin_lat?: number | null
          shipping_origin_lng?: number | null
          store_banner_url?: string | null
          store_contact_number?: string | null
          store_description?: string | null
          store_name?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          temp_blacklist_count?: number | null
          temp_blacklist_until?: string | null
          updated_at?: string
          vacation_reason?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          address_type: string
          barangay: string | null
          city: string
          coordinates: Json | null
          created_at: string
          delivery_instructions: string | null
          first_name: string | null
          id: string
          is_default: boolean
          is_pickup: boolean | null
          is_return: boolean | null
          label: string
          landmark: string | null
          last_name: string | null
          phone_number: string | null
          postal_code: string
          province: string
          region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          address_type?: string
          barangay?: string | null
          city: string
          coordinates?: Json | null
          created_at?: string
          delivery_instructions?: string | null
          first_name?: string | null
          id?: string
          is_default?: boolean
          is_pickup?: boolean | null
          is_return?: boolean | null
          label: string
          landmark?: string | null
          last_name?: string | null
          phone_number?: string | null
          postal_code: string
          province: string
          region: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          address_type?: string
          barangay?: string | null
          city?: string
          coordinates?: Json | null
          created_at?: string
          delivery_instructions?: string | null
          first_name?: string | null
          id?: string
          is_default?: boolean
          is_pickup?: boolean | null
          is_return?: boolean | null
          label?: string
          landmark?: string | null
          last_name?: string | null
          phone_number?: string | null
          postal_code?: string
          province?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_config: {
        Row: {
          bulky_weight_threshold: number
          free_shipping_threshold: number
          id: string
          insurance_rate: number
          per_kg_increment: number
          same_day_zones: string[]
          volumetric_divisor: number
        }
        Insert: {
          bulky_weight_threshold?: number
          free_shipping_threshold?: number
          id?: string
          insurance_rate?: number
          per_kg_increment?: number
          same_day_zones?: string[]
          volumetric_divisor?: number
        }
        Update: {
          bulky_weight_threshold?: number
          free_shipping_threshold?: number
          id?: string
          insurance_rate?: number
          per_kg_increment?: number
          same_day_zones?: string[]
          volumetric_divisor?: number
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          base_rate: number
          destination_zone: string
          estimated_days_max: number
          estimated_days_min: number
          id: string
          odz_fee: number
          origin_zone: string
          shipping_method: string
        }
        Insert: {
          base_rate: number
          destination_zone: string
          estimated_days_max: number
          estimated_days_min: number
          id?: string
          odz_fee?: number
          origin_zone: string
          shipping_method: string
        }
        Update: {
          base_rate?: number
          destination_zone?: string
          estimated_days_max?: number
          estimated_days_min?: number
          id?: string
          odz_fee?: number
          origin_zone?: string
          shipping_method?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          message_body: string
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          recipient_id: string | null
          recipient_phone: string
          status: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_body: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_phone: string
          status?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_body?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_followers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_followers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_followers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          created_at: string
          id: string
          lead_time_days: number
          moq: number
          price: number
          quality_notes: string | null
          request_id: string
          status: string
          supplier_id: string
          terms: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_time_days?: number
          moq?: number
          price: number
          quality_notes?: string | null
          request_id: string
          status?: string
          supplier_id: string
          terms?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_time_days?: number
          moq?: number
          price?: number
          quality_notes?: string | null
          request_id?: string
          status?: string
          supplier_id?: string
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          created_at: string
          description: string
          id: string
          order_id: string | null
          priority: string
          resolved_at: string | null
          seller_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          seller_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          seller_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppression_list: {
        Row: {
          contact: string
          contact_type: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          suppressed_by: string | null
        }
        Insert: {
          contact: string
          contact_type: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          suppressed_by?: string | null
        }
        Update: {
          contact?: string
          contact_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          suppressed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppression_list_suppressed_by_fkey"
            columns: ["suppressed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          grade: string | null
          id: string
          notes: string | null
          product_id: string
          request_id: string | null
          url: string
        }
        Insert: {
          artifact_type: string
          created_at?: string
          grade?: string | null
          id?: string
          notes?: string | null
          product_id: string
          request_id?: string | null
          url: string
        }
        Update: {
          artifact_type?: string
          created_at?: string
          grade?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          request_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_artifacts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_sold_counts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "trust_artifacts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_artifacts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "product_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consent: {
        Row: {
          channel: string
          consent_source: string
          consented_at: string | null
          created_at: string
          id: string
          ip_address: unknown
          is_consented: boolean
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          channel: string
          consent_source?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_consented?: boolean
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          consent_source?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          is_consented?: boolean
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          claim_limit: number | null
          claimable_from: string
          claimable_until: string
          code: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_value: number
          seller_id: string | null
          title: string
          updated_at: string
          usage_limit: number | null
          value: number
          voucher_type: string
        }
        Insert: {
          claim_limit?: number | null
          claimable_from: string
          claimable_until: string
          code: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          seller_id?: string | null
          title: string
          updated_at?: string
          usage_limit?: number | null
          value: number
          voucher_type: string
        }
        Update: {
          claim_limit?: number | null
          claimable_from?: string
          claimable_until?: string
          code?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_value?: number
          seller_id?: string | null
          title?: string
          updated_at?: string
          usage_limit?: number | null
          value?: number
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_actions_log: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_role: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          order_item_id: string | null
          warranty_claim_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_item_id?: string | null
          warranty_claim_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          order_item_id?: string | null
          warranty_claim_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_actions_log_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_actions_log_warranty_claim_id_fkey"
            columns: ["warranty_claim_id"]
            isOneToOne: false
            referencedRelation: "warranty_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          admin_notes: string | null
          buyer_id: string
          claim_number: string
          claim_type: string
          created_at: string
          description: string | null
          diagnostic_report_url: string | null
          evidence_urls: string[] | null
          id: string
          order_item_id: string
          priority: string | null
          reason: string
          replacement_shipping_carrier: string | null
          replacement_tracking_number: string | null
          resolution_amount: number | null
          resolution_description: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_shipping_carrier: string | null
          return_tracking_number: string | null
          seller_id: string
          seller_response: string | null
          seller_response_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          buyer_id: string
          claim_number: string
          claim_type: string
          created_at?: string
          description?: string | null
          diagnostic_report_url?: string | null
          evidence_urls?: string[] | null
          id?: string
          order_item_id: string
          priority?: string | null
          reason: string
          replacement_shipping_carrier?: string | null
          replacement_tracking_number?: string | null
          resolution_amount?: number | null
          resolution_description?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_shipping_carrier?: string | null
          return_tracking_number?: string | null
          seller_id: string
          seller_response?: string | null
          seller_response_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          buyer_id?: string
          claim_number?: string
          claim_type?: string
          created_at?: string
          description?: string | null
          diagnostic_report_url?: string | null
          evidence_urls?: string[] | null
          id?: string
          order_item_id?: string
          priority?: string | null
          reason?: string
          replacement_shipping_carrier?: string | null
          replacement_tracking_number?: string | null
          resolution_amount?: number | null
          resolution_description?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_shipping_carrier?: string | null
          return_tracking_number?: string | null
          seller_id?: string
          seller_response?: string | null
          seller_response_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_action_log: {
        Row: {
          action: string | null
          admin_id: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          target_id?: never
          target_type?: string | null
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string | null
          metadata?: Json | null
          target_id?: never
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assessment_status_view: {
        Row: {
          assessment_id: string | null
          last_status: string | null
          last_status_at: string | null
          last_status_by: string | null
          last_status_type: string | null
        }
        Relationships: []
      }
      product_sold_counts: {
        Row: {
          last_sold_at: string | null
          order_count: number | null
          product_id: string | null
          sold_count: number | null
        }
        Relationships: []
      }
      seller_payout_accounts: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          seller_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payout_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _dispatch_push_notification: {
        Args: {
          p_body: string
          p_data: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_action_product_request: {
        Args: {
          p_action: string
          p_new_stage?: string
          p_reason?: string
          p_request_id: string
          p_target_id?: string
        }
        Returns: Json
      }
      auto_cancel_unconfirmed_orders: {
        Args: { p_batch_limit?: number; p_max_age_days?: number }
        Returns: {
          cancelled_order_id: string
        }[]
      }
      auto_escalate_overdue_returns: { Args: never; Returns: number }
      cancel_order_atomic: {
        Args: {
          p_cancelled_by?: string
          p_changed_by_role?: string
          p_order_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      check_and_suppress_soft_bounce: {
        Args: { p_email: string }
        Returns: undefined
      }
      convert_request_to_listing: {
        Args: { p_product_id: string; p_request_id: string }
        Returns: Json
      }
      create_order_safe: {
        Args: {
          p_address_id?: string
          p_buyer_id: string
          p_notes?: string
          p_order_number: string
          p_order_type?: string
          p_payment_status?: string
          p_recipient_id?: string
          p_shipment_status?: string
        }
        Returns: Json
      }
      decrement_product_stock: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_variant_id?: string
        }
        Returns: undefined
      }
      decrement_stock: {
        Args: { p_product_id: string; quantity: number }
        Returns: undefined
      }
      decrement_stock_atomic: {
        Args: {
          p_actor_id?: string
          p_notes?: string
          p_order_id?: string
          p_qty: number
          p_reason?: string
          p_variant_id: string
        }
        Returns: number
      }
      generate_order_number: { Args: never; Returns: string }
      generate_pos_order_number: { Args: never; Returns: string }
      get_active_product_discount: {
        Args: { p_product_id: string }
        Returns: {
          badge_color: string
          badge_text: string
          campaign_id: string
          campaign_name: string
          discount_type: string
          discount_value: number
          discounted_price: number
          ends_at: string
          original_price: number
          source_priority: number
        }[]
      }
      get_product_sold_count: {
        Args: { product_uuid: string }
        Returns: number
      }
      get_weekly_marketing_send_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      increment_stock_atomic: {
        Args: {
          p_actor_id?: string
          p_notes?: string
          p_order_id?: string
          p_qty: number
          p_reason?: string
          p_variant_id: string
        }
        Returns: number
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      match_products: {
        Args: {
          filter_keyword?: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          id: string
          name: string
          price: number
          similarity: number
        }[]
      }
      process_idempotent_order_message: {
        Args: {
          p_content: string
          p_conv_id: string
          p_event_type: Database["public"]["Enums"]["order_event_enum"]
          p_order_id: string
        }
        Returns: string
      }
      release_escrow_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      schedule_escrow_release: {
        Args: { p_delivered_at?: string; p_order_id: string }
        Returns: undefined
      }
      support_product_request: {
        Args: {
          p_bazcoin_amount?: number
          p_request_id: string
          p_support_type: string
        }
        Returns: Json
      }
    }
    Enums: {
      message_type_enum:
        | "user"
        | "system"
        | "text"
        | "image"
        | "video"
        | "document"
      order_event_enum: "placed" | "confirmed" | "shipped" | "delivered"
      warranty_type_enum:
        | "local_manufacturer"
        | "international_manufacturer"
        | "shop_warranty"
        | "no_warranty"
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
      message_type_enum: [
        "user",
        "system",
        "text",
        "image",
        "video",
        "document",
      ],
      order_event_enum: ["placed", "confirmed", "shipped", "delivered"],
      warranty_type_enum: [
        "local_manufacturer",
        "international_manufacturer",
        "shop_warranty",
        "no_warranty",
      ],
    },
  },
} as const
