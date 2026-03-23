-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_data jsonb,
  read_at timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type = ANY (ARRAY['buyer'::text, 'seller'::text])),
  title text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender = ANY (ARRAY['user'::text, 'ai'::text])),
  message text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'promo'::text, 'urgent'::text, 'maintenance'::text])),
  audience text NOT NULL DEFAULT 'all'::text CHECK (audience = ANY (ARRAY['all'::text, 'buyers'::text, 'sellers'::text])),
  image_url text,
  action_url text,
  action_data jsonb,
  is_active boolean NOT NULL DEFAULT true,
  scheduled_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.automation_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  channels jsonb NOT NULL DEFAULT '["email"]'::jsonb,
  delay_minutes integer DEFAULT 0,
  template_id uuid,
  sms_template text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT automation_workflows_pkey PRIMARY KEY (id),
  CONSTRAINT automation_workflows_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT automation_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.bazcoin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  reference_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bazcoin_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT bazcoin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.bounce_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  bounce_type text NOT NULL CHECK (bounce_type = ANY (ARRAY['hard'::text, 'soft'::text])),
  reason text,
  resend_event_id text,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bounce_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.buyer_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_data jsonb,
  read_at timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buyer_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_notifications_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
);
CREATE TABLE public.buyer_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filter_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  buyer_count integer DEFAULT 0,
  is_dynamic boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buyer_segments_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.buyer_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  voucher_id uuid NOT NULL,
  valid_from timestamp with time zone,
  valid_until timestamp with time zone,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buyer_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_vouchers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT buyer_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id)
);
CREATE TABLE public.buyers (
  id uuid NOT NULL,
  avatar_url text,
  preferences jsonb DEFAULT '{}'::jsonb,
  bazcoins integer NOT NULL DEFAULT 0 CHECK (bazcoins >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buyers_pkey PRIMARY KEY (id),
  CONSTRAINT buyers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  personalized_options jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'::text),
  description text,
  parent_id uuid,
  icon text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.comment_upvotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_upvotes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_upvotes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.product_request_comments(id),
  CONSTRAINT comment_upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.consent_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
  action text NOT NULL CHECK (action = ANY (ARRAY['opt_in'::text, 'opt_out'::text])),
  source text NOT NULL CHECK (source = ANY (ARRAY['signup'::text, 'settings'::text, 'email_link'::text, 'campaign'::text, 'admin'::text])),
  ip_address inet,
  user_agent text,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT consent_log_pkey PRIMARY KEY (id),
  CONSTRAINT consent_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.contributor_tiers (
  user_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'none'::text CHECK (tier = ANY (ARRAY['none'::text, 'bronze'::text, 'silver'::text, 'gold'::text])),
  max_upvotes integer NOT NULL DEFAULT 0,
  bc_multiplier numeric NOT NULL DEFAULT 1.00,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contributor_tiers_pkey PRIMARY KEY (user_id),
  CONSTRAINT contributor_tiers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.courier_rate_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  courier_code character varying NOT NULL,
  origin_city character varying NOT NULL,
  destination_city character varying NOT NULL,
  weight_kg numeric NOT NULL,
  service_type character varying NOT NULL DEFAULT 'standard'::character varying,
  rate numeric NOT NULL,
  estimated_days integer,
  cached_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT courier_rate_cache_pkey PRIMARY KEY (id)
);
CREATE TABLE public.delivery_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  courier_code character varying NOT NULL CHECK (courier_code::text = ANY (ARRAY['jnt'::character varying, 'lbc'::character varying, 'flash'::character varying, 'ninjavan'::character varying, 'grabexpress'::character varying, 'lalamove'::character varying]::text[])),
  courier_name character varying NOT NULL,
  service_type character varying NOT NULL DEFAULT 'standard'::character varying,
  booking_reference character varying,
  tracking_number character varying,
  waybill_url text,
  pickup_address jsonb NOT NULL,
  delivery_address jsonb NOT NULL,
  package_weight numeric,
  package_dimensions jsonb,
  package_description text,
  declared_value numeric,
  shipping_fee numeric NOT NULL,
  insurance_fee numeric DEFAULT 0,
  cod_amount numeric DEFAULT 0,
  is_cod boolean DEFAULT false,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'booked'::character varying, 'pickup_scheduled'::character varying, 'picked_up'::character varying, 'in_transit'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'failed'::character varying, 'returned_to_sender'::character varying, 'cancelled'::character varying]::text[])),
  booked_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  estimated_delivery timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_bookings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT delivery_bookings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id),
  CONSTRAINT delivery_bookings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.delivery_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_booking_id uuid NOT NULL,
  status character varying NOT NULL,
  description text,
  location character varying,
  courier_status_code character varying,
  event_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_tracking_events_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_tracking_events_delivery_booking_id_fkey FOREIGN KEY (delivery_booking_id) REFERENCES public.delivery_bookings(id)
);
CREATE TABLE public.discount_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid,
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL CHECK (campaign_type = ANY (ARRAY['flash_sale'::text, 'seasonal_sale'::text, 'clearance'::text, 'buy_more_save_more'::text, 'limited_time_offer'::text, 'new_arrival_promo'::text, 'bundle_deal'::text])),
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  discount_value numeric NOT NULL CHECK (discount_value > 0::numeric),
  max_discount_amount numeric CHECK (max_discount_amount > 0::numeric),
  min_purchase_amount numeric NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0::numeric),
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'active'::text, 'paused'::text, 'ended'::text, 'cancelled'::text])),
  badge_text text,
  badge_color text DEFAULT '#FF6A00'::text,
  priority integer NOT NULL DEFAULT 0,
  claim_limit integer CHECK (claim_limit > 0),
  per_customer_limit integer NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  applies_to text NOT NULL DEFAULT 'specific_products'::text CHECK (applies_to = ANY (ARRAY['all_products'::text, 'specific_products'::text, 'specific_categories'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  campaign_scope text DEFAULT 'store'::text CHECK (campaign_scope = ANY (ARRAY['store'::text, 'global'::text])),
  CONSTRAINT discount_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT discount_campaigns_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_log_id uuid,
  resend_message_id text,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['delivered'::text, 'opened'::text, 'clicked'::text, 'bounced'::text, 'complained'::text, 'delivery_delayed'::text])),
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_events_pkey PRIMARY KEY (id),
  CONSTRAINT email_events_email_log_id_fkey FOREIGN KEY (email_log_id) REFERENCES public.email_logs(id)
);
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_id uuid,
  template_id uuid,
  event_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'bounced'::text, 'failed'::text, 'disabled'::text, 'suppressed'::text, 'no_consent'::text, 'invalid_contact'::text, 'frequency_exceeded'::text])),
  resend_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  category text CHECK (category = ANY (ARRAY['transactional'::text, 'security'::text, 'marketing'::text])),
  queued_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  retry_count integer DEFAULT 0,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT email_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id)
);
CREATE TABLE public.email_template_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb,
  changed_by uuid,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT email_template_versions_pkey PRIMARY KEY (id),
  CONSTRAINT email_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT email_template_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.admins(id)
);
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'transactional'::text CHECK (category = ANY (ARRAY['transactional'::text, 'marketing'::text, 'system'::text])),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approval_status text DEFAULT 'approved'::text CHECK (approval_status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'rejected'::text])),
  approved_by uuid,
  approved_at timestamp with time zone,
  version integer DEFAULT 1,
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admins(id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.featured_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  seller_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  featured_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT featured_products_pkey PRIMARY KEY (id),
  CONSTRAINT featured_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT featured_products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.flash_sale_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid NOT NULL,
  submitted_price numeric NOT NULL,
  submitted_stock integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flash_sale_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT flash_sale_submissions_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.global_flash_sale_slots(id),
  CONSTRAINT flash_sale_submissions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT flash_sale_submissions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.global_flash_sale_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  min_discount_percentage numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'ended'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_flash_sale_slots_pkey PRIMARY KEY (id)
);
CREATE TABLE public.low_stock_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  threshold integer NOT NULL CHECK (threshold >= 0),
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT low_stock_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT low_stock_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT low_stock_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.marketing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL CHECK (campaign_type = ANY (ARRAY['email_blast'::text, 'sms_blast'::text, 'multi_channel'::text])),
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'paused'::text, 'cancelled'::text])),
  segment_id uuid,
  template_id uuid,
  subject text,
  content text,
  sms_content text,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_clicked integer DEFAULT 0,
  total_bounced integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approval_status text DEFAULT 'draft'::text CHECK (approval_status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])),
  approved_by uuid,
  approved_at timestamp with time zone,
  locked boolean NOT NULL DEFAULT false,
  seller_id uuid,
  CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_campaigns_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.buyer_segments(id),
  CONSTRAINT marketing_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT marketing_campaigns_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admins(id),
  CONSTRAINT marketing_campaigns_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type = ANY (ARRAY['buyer'::text, 'seller'::text])),
  content text NOT NULL,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  message_type USER-DEFINED DEFAULT 'user'::message_type_enum,
  message_content text,
  order_event_type USER-DEFINED,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
  event_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  template_id uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT notification_settings_template_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT notification_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admins(id)
);
CREATE TABLE public.order_cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  reason text,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_cancellations_pkey PRIMARY KEY (id),
  CONSTRAINT order_cancellations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_cancellations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.order_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  order_id uuid NOT NULL,
  campaign_id uuid,
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT order_discounts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_discounts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.discount_campaigns(id)
);
CREATE TABLE public.order_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  conversation_id uuid,
  event_type USER-DEFINED NOT NULL,
  message_generated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_events_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid,
  product_name text NOT NULL,
  primary_image_url text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  price_discount numeric NOT NULL DEFAULT 0 CHECK (price_discount >= 0::numeric),
  shipping_price numeric NOT NULL DEFAULT 0 CHECK (shipping_price >= 0::numeric),
  shipping_discount numeric NOT NULL DEFAULT 0 CHECK (shipping_discount >= 0::numeric),
  quantity integer NOT NULL CHECK (quantity > 0),
  variant_id uuid,
  personalized_options jsonb,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.order_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  payment_method jsonb,
  payment_reference text,
  payment_date timestamp with time zone,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  status text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_payments_pkey PRIMARY KEY (id),
  CONSTRAINT order_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_promos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  promo_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_promos_pkey PRIMARY KEY (id),
  CONSTRAINT order_promos_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_recipients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  shipping_method jsonb,
  tracking_number text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_shipments_pkey PRIMARY KEY (id),
  CONSTRAINT order_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  note text,
  changed_by uuid,
  changed_by_role text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.order_vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  order_id uuid NOT NULL,
  voucher_id uuid NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT order_vouchers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT order_vouchers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  buyer_id uuid,
  order_type text NOT NULL DEFAULT 'ONLINE'::text CHECK (order_type = ANY (ARRAY['ONLINE'::text, 'OFFLINE'::text])),
  pos_note text,
  recipient_id uuid,
  address_id uuid,
  payment_status text NOT NULL DEFAULT 'pending_payment'::text CHECK (payment_status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'refunded'::text, 'partially_refunded'::text])),
  shipment_status text NOT NULL DEFAULT 'waiting_for_seller'::text CHECK (shipment_status = ANY (ARRAY['waiting_for_seller'::text, 'processing'::text, 'ready_to_ship'::text, 'shipped'::text, 'out_for_delivery'::text, 'delivered'::text, 'failed_to_deliver'::text, 'received'::text, 'returned'::text])),
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  receipt_number text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT orders_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.order_recipients(id),
  CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.shipping_addresses(id)
);
CREATE TABLE public.payment_method_banks (
  payment_method_id uuid NOT NULL,
  bank_name text,
  account_number_last4 text,
  CONSTRAINT payment_method_banks_pkey PRIMARY KEY (payment_method_id),
  CONSTRAINT payment_method_banks_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);
CREATE TABLE public.payment_method_cards (
  payment_method_id uuid NOT NULL,
  card_last4 text,
  card_brand text,
  expiry_month integer CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year integer CHECK (expiry_year >= 2024),
  CONSTRAINT payment_method_cards_pkey PRIMARY KEY (payment_method_id),
  CONSTRAINT payment_method_cards_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);
CREATE TABLE public.payment_method_wallets (
  payment_method_id uuid NOT NULL,
  e_wallet_provider text,
  e_wallet_account_number text,
  CONSTRAINT payment_method_wallets_pkey PRIMARY KEY (payment_method_id),
  CONSTRAINT payment_method_wallets_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_type text NOT NULL CHECK (payment_type = ANY (ARRAY['card'::text, 'bank_transfer'::text, 'e_wallet'::text, 'cod'::text])),
  label text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  gateway character varying NOT NULL DEFAULT 'paymongo'::character varying,
  gateway_payment_intent_id character varying,
  gateway_payment_method_id character varying,
  gateway_source_id character varying,
  gateway_checkout_url text,
  amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'PHP'::character varying,
  payment_type character varying NOT NULL CHECK (payment_type::text = ANY (ARRAY['card'::character varying, 'gcash'::character varying, 'maya'::character varying, 'grab_pay'::character varying, 'bank_transfer'::character varying, 'cod'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'awaiting_payment'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'cancelled'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying]::text[])),
  description text,
  statement_descriptor character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  failure_reason text,
  paid_at timestamp with time zone,
  refunded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  escrow_status character varying NOT NULL DEFAULT 'none'::character varying CHECK (escrow_status::text = ANY (ARRAY['none'::character varying, 'held'::character varying, 'released'::character varying, 'refunded'::character varying]::text[])),
  escrow_held_at timestamp with time zone,
  escrow_release_at timestamp with time zone,
  escrow_released_at timestamp with time zone,
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT payment_transactions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id),
  CONSTRAINT payment_transactions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.pos_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  accept_cash boolean DEFAULT true,
  accept_card boolean DEFAULT false,
  accept_gcash boolean DEFAULT false,
  accept_maya boolean DEFAULT false,
  barcode_scanner_enabled boolean DEFAULT false,
  sound_enabled boolean DEFAULT true,
  multi_branch_enabled boolean DEFAULT false,
  default_branch text DEFAULT 'Main'::text,
  tax_enabled boolean DEFAULT false,
  tax_rate numeric DEFAULT 12.00,
  tax_name text DEFAULT 'VAT'::text,
  tax_inclusive boolean DEFAULT true,
  receipt_header text DEFAULT ''::text,
  receipt_footer text DEFAULT 'Thank you for shopping!'::text,
  show_logo_on_receipt boolean DEFAULT true,
  receipt_template text DEFAULT 'standard'::text,
  auto_print_receipt boolean DEFAULT true,
  printer_type text DEFAULT 'thermal'::text,
  cash_drawer_enabled boolean DEFAULT false,
  default_opening_cash numeric DEFAULT 0,
  staff_tracking_enabled boolean DEFAULT false,
  require_staff_login boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scanner_type text DEFAULT 'camera'::text CHECK (scanner_type = ANY (ARRAY['camera'::text, 'usb'::text, 'bluetooth'::text])),
  auto_add_on_scan boolean DEFAULT true,
  logo_url text,
  printer_name text,
  enable_low_stock_alert boolean DEFAULT true,
  low_stock_threshold integer DEFAULT 10,
  CONSTRAINT pos_settings_pkey PRIMARY KEY (id),
  CONSTRAINT pos_settings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.product_ad_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  boost_type text NOT NULL DEFAULT 'featured'::text CHECK (boost_type = ANY (ARRAY['featured'::text, 'search_priority'::text, 'homepage_banner'::text, 'category_spotlight'::text])),
  duration_days integer NOT NULL DEFAULT 7 CHECK (duration_days > 0),
  daily_budget numeric NOT NULL DEFAULT 0 CHECK (daily_budget >= 0::numeric),
  total_budget numeric NOT NULL DEFAULT 0 CHECK (total_budget >= 0::numeric),
  cost_per_day numeric NOT NULL DEFAULT 0 CHECK (cost_per_day >= 0::numeric),
  total_cost numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0::numeric),
  currency text NOT NULL DEFAULT 'PHP'::text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'ended'::text, 'cancelled'::text])),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  paused_at timestamp with time zone,
  impressions integer NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  orders_generated integer NOT NULL DEFAULT 0 CHECK (orders_generated >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_ad_boosts_pkey PRIMARY KEY (id),
  CONSTRAINT product_ad_boosts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_ad_boosts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.product_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT product_approvals_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_approvals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.product_assessment_logistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_assessment_logistics_pkey PRIMARY KEY (id),
  CONSTRAINT product_assessment_logistics_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_assessment_logistics_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.product_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending_digital_review'::text CHECK (status = ANY (ARRAY['pending_admin_review'::text, 'pending_digital_review'::text, 'waiting_for_sample'::text, 'pending_physical_review'::text, 'verified'::text, 'for_revision'::text, 'rejected'::text])),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  revision_requested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  assigned_to uuid,
  notes text,
  admin_accepted_at timestamp with time zone,
  admin_accepted_by uuid,
  CONSTRAINT product_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT product_assessments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT product_assessments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  CONSTRAINT product_assessments_admin_accepted_by_fkey FOREIGN KEY (admin_accepted_by) REFERENCES public.admins(id)
);
CREATE TABLE public.product_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  product_id uuid NOT NULL,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text])),
  discount_value numeric CHECK (discount_value > 0::numeric),
  sold_count integer NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  override_discount_type text,
  override_discount_value numeric,
  CONSTRAINT product_discounts_pkey PRIMARY KEY (id),
  CONSTRAINT product_discounts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.discount_campaigns(id),
  CONSTRAINT product_discounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  image_url text NOT NULL CHECK (image_url ~ '^https?://'::text),
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid,
  product_id uuid,
  description text,
  vendor_submitted_category text,
  admin_reclassified_category text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_rejections_pkey PRIMARY KEY (id),
  CONSTRAINT product_rejections_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_rejections_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_rejections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.product_request_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['sourcing'::text, 'qc'::text, 'general'::text])),
  content text NOT NULL,
  is_admin_only boolean NOT NULL DEFAULT false,
  bc_awarded integer NOT NULL DEFAULT 0,
  upvotes integer NOT NULL DEFAULT 0,
  admin_upvotes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_request_comments_pkey PRIMARY KEY (id),
  CONSTRAINT product_request_comments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.product_requests(id),
  CONSTRAINT product_request_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.product_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  description text,
  category text,
  requested_by_name text,
  requested_by_id uuid,
  votes integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'in_progress'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  estimated_demand integer DEFAULT 0,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.product_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT product_revisions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.product_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  tag text NOT NULL CHECK (tag ~ '^[a-z0-9-]+$'::text),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_tags_pkey PRIMARY KEY (id),
  CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text NOT NULL UNIQUE,
  barcode text UNIQUE,
  variant_name text NOT NULL,
  size text,
  color text,
  option_1_value text,
  option_2_value text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  thumbnail_url text,
  embedding USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid NOT NULL,
  brand text,
  sku text UNIQUE,
  specifications jsonb DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'approved'::text, 'rejected'::text, 'reclassified'::text])),
  variant_label_1 text,
  variant_label_2 text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  low_stock_threshold integer NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  weight numeric CHECK (weight > 0::numeric),
  dimensions jsonb,
  is_free_shipping boolean NOT NULL DEFAULT false,
  disabled_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_embedding USER-DEFINED,
  seller_id uuid,
  size_guide_image text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  first_name text,
  last_name text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.qa_review_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  product_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  action text NOT NULL,
  notes text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_review_logs_pkey PRIMARY KEY (id),
  CONSTRAINT qa_review_logs_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT qa_review_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT qa_review_logs_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.qa_team_members (
  id uuid NOT NULL,
  display_name text,
  specialization text,
  is_active boolean NOT NULL DEFAULT true,
  max_concurrent_reviews integer NOT NULL DEFAULT 10,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT qa_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT qa_team_members_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.refund_return_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  is_returnable boolean NOT NULL DEFAULT true,
  return_window_days integer NOT NULL DEFAULT 7 CHECK (return_window_days >= 0),
  return_reason text,
  refund_amount numeric CHECK (refund_amount >= 0::numeric),
  refund_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'seller_review'::text, 'counter_offered'::text, 'approved'::text, 'rejected'::text, 'escalated'::text, 'return_in_transit'::text, 'return_received'::text, 'refunded'::text])),
  return_type text NOT NULL DEFAULT 'return_refund'::text CHECK (return_type = ANY (ARRAY['return_refund'::text, 'refund_only'::text, 'replacement'::text])),
  resolution_path text NOT NULL DEFAULT 'seller_review'::text CHECK (resolution_path = ANY (ARRAY['instant'::text, 'seller_review'::text, 'return_required'::text])),
  items_json jsonb,
  evidence_urls ARRAY DEFAULT '{}'::text[],
  description text,
  seller_note text,
  rejected_reason text,
  counter_offer_amount numeric CHECK (counter_offer_amount >= 0::numeric),
  seller_deadline timestamp with time zone,
  escalated_at timestamp with time zone,
  resolved_at timestamp with time zone,
  resolved_by text,
  return_label_url text,
  return_tracking_number text,
  buyer_shipped_at timestamp with time zone,
  return_received_at timestamp with time zone,
  CONSTRAINT refund_return_periods_pkey PRIMARY KEY (id),
  CONSTRAINT refund_return_periods_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.registries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text,
  image_url text DEFAULT ''::text,
  shared_date text,
  privacy text NOT NULL DEFAULT 'link'::text CHECK (privacy = ANY (ARRAY['public'::text, 'link'::text, 'private'::text])),
  delivery jsonb DEFAULT '{"showAddress": false}'::jsonb,
  CONSTRAINT registries_pkey PRIMARY KEY (id),
  CONSTRAINT registries_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
);
CREATE TABLE public.registry_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registry_id uuid NOT NULL,
  product_id uuid,
  quantity_desired integer NOT NULL CHECK (quantity_desired > 0),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  product_name text,
  product_snapshot jsonb,
  is_most_wanted boolean NOT NULL DEFAULT false,
  received_qty integer NOT NULL DEFAULT 0,
  requested_qty integer NOT NULL DEFAULT 1,
  selected_variant jsonb,
  CONSTRAINT registry_items_pkey PRIMARY KEY (id),
  CONSTRAINT registry_items_registry_id_fkey FOREIGN KEY (registry_id) REFERENCES public.registries(id),
  CONSTRAINT registry_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.review_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  image_url text NOT NULL CHECK (image_url ~ '^https?://'::text),
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_images_pkey PRIMARY KEY (id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
CREATE TABLE public.review_votes (
  review_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_votes_pkey PRIMARY KEY (review_id, buyer_id),
  CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id),
  CONSTRAINT review_votes_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful_count integer NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  seller_reply jsonb,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  order_item_id uuid,
  variant_snapshot jsonb CHECK (variant_snapshot IS NULL OR jsonb_typeof(variant_snapshot) = 'object'::text),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT reviews_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id)
);
CREATE TABLE public.seller_business_profiles (
  seller_id uuid NOT NULL,
  business_type text CHECK (business_type = ANY (ARRAY['sole_proprietor'::text, 'partnership'::text, 'corporation'::text])),
  business_registration_number text,
  tax_id_number text,
  address_line_1 text,
  address_line_2 text,
  city text,
  province text,
  postal_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_business_profiles_pkey PRIMARY KEY (seller_id),
  CONSTRAINT seller_business_profiles_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_categories_pkey PRIMARY KEY (id),
  CONSTRAINT seller_categories_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT seller_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.seller_chat_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  buyer_name text,
  product_id uuid,
  product_name text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT seller_chat_requests_pkey PRIMARY KEY (id),
  CONSTRAINT seller_chat_requests_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT seller_chat_requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT seller_chat_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.seller_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_data jsonb,
  read_at timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  seller_id uuid,
  CONSTRAINT seller_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT seller_notifications_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_payout_accounts (
  seller_id uuid NOT NULL,
  bank_name text,
  account_name text,
  account_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_payout_accounts_pkey PRIMARY KEY (seller_id),
  CONSTRAINT seller_payout_accounts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_payout_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  payout_method character varying NOT NULL DEFAULT 'bank_transfer'::character varying CHECK (payout_method::text = ANY (ARRAY['bank_transfer'::character varying, 'gcash'::character varying, 'maya'::character varying]::text[])),
  bank_name character varying,
  bank_account_name character varying,
  bank_account_number character varying,
  ewallet_provider character varying CHECK (ewallet_provider::text = ANY (ARRAY['gcash'::character varying, 'maya'::character varying]::text[])),
  ewallet_number character varying,
  auto_payout boolean DEFAULT true,
  min_payout_amount numeric DEFAULT 100.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_payout_settings_pkey PRIMARY KEY (id),
  CONSTRAINT seller_payout_settings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.seller_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  order_id uuid,
  payment_transaction_id uuid,
  gross_amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  currency character varying NOT NULL DEFAULT 'PHP'::character varying,
  payout_method character varying NOT NULL CHECK (payout_method::text = ANY (ARRAY['bank_transfer'::character varying, 'gcash'::character varying, 'maya'::character varying]::text[])),
  payout_account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'on_hold'::character varying]::text[])),
  processed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  escrow_transaction_id uuid,
  release_after timestamp with time zone,
  CONSTRAINT seller_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT seller_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id),
  CONSTRAINT seller_payouts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT seller_payouts_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id),
  CONSTRAINT seller_payouts_escrow_transaction_id_fkey FOREIGN KEY (escrow_transaction_id) REFERENCES public.payment_transactions(id)
);
CREATE TABLE public.seller_rejection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rejection_id uuid NOT NULL,
  document_field text NOT NULL CHECK (document_field = ANY (ARRAY['business_permit_url'::text, 'valid_id_url'::text, 'proof_of_address_url'::text, 'dti_registration_url'::text, 'tax_id_url'::text])),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_rejection_items_pkey PRIMARY KEY (id),
  CONSTRAINT seller_rejection_items_rejection_id_fkey FOREIGN KEY (rejection_id) REFERENCES public.seller_rejections(id)
);
CREATE TABLE public.seller_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  seller_id uuid NOT NULL,
  rejection_type text NOT NULL DEFAULT 'full'::text CHECK (rejection_type = ANY (ARRAY['full'::text, 'partial'::text])),
  CONSTRAINT seller_rejections_pkey PRIMARY KEY (id),
  CONSTRAINT seller_rejections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id),
  CONSTRAINT seller_rejections_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  tier_level text NOT NULL DEFAULT 'standard'::text CHECK (tier_level = ANY (ARRAY['standard'::text, 'premium_outlet'::text, 'trusted_brand'::text])),
  bypasses_assessment boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT seller_tiers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_verification_document_drafts (
  seller_id uuid NOT NULL,
  business_permit_url text,
  valid_id_url text,
  proof_of_address_url text,
  dti_registration_url text,
  tax_id_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  business_permit_updated_at timestamp with time zone,
  valid_id_updated_at timestamp with time zone,
  proof_of_address_updated_at timestamp with time zone,
  dti_registration_updated_at timestamp with time zone,
  tax_id_updated_at timestamp with time zone,
  CONSTRAINT seller_verification_document_drafts_pkey PRIMARY KEY (seller_id),
  CONSTRAINT seller_verification_document_drafts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_verification_documents (
  seller_id uuid NOT NULL,
  business_permit_url text,
  valid_id_url text,
  proof_of_address_url text,
  dti_registration_url text,
  tax_id_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_verification_documents_pkey PRIMARY KEY (seller_id),
  CONSTRAINT seller_verification_documents_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.sellers (
  id uuid NOT NULL,
  store_name text NOT NULL UNIQUE,
  store_description text,
  avatar_url text,
  owner_name text,
  approval_status text NOT NULL DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'needs_resubmission'::text, 'blacklisted'::text])),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  store_contact_number text,
  reapplication_attempts integer DEFAULT 0,
  blacklisted_at timestamp with time zone,
  cool_down_until timestamp with time zone,
  cooldown_count integer DEFAULT 0,
  temp_blacklist_count integer DEFAULT 0,
  temp_blacklist_until timestamp with time zone,
  is_permanently_blacklisted boolean DEFAULT false,
  store_banner_url text,
  is_vacation_mode boolean DEFAULT false,
  vacation_reason text,
  CONSTRAINT sellers_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.shipping_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  barangay text,
  city text NOT NULL,
  province text NOT NULL,
  region text NOT NULL,
  postal_code text NOT NULL,
  landmark text,
  delivery_instructions text,
  is_default boolean NOT NULL DEFAULT false,
  address_type text NOT NULL DEFAULT 'residential'::text CHECK (address_type = ANY (ARRAY['residential'::text, 'commercial'::text])),
  coordinates jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  phone_number text,
  CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_id uuid,
  event_type text NOT NULL,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'disabled'::text])),
  provider text DEFAULT 'none'::text,
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.store_followers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_followers_pkey PRIMARY KEY (id),
  CONSTRAINT store_followers_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT store_followers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid,
  priority text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting_response'::text, 'resolved'::text, 'closed'::text])),
  subject text NOT NULL,
  description text NOT NULL,
  order_id uuid,
  assigned_to uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  seller_id uuid,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ticket_categories(id),
  CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admins(id),
  CONSTRAINT support_tickets_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.suppression_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type = ANY (ARRAY['email'::text, 'phone'::text])),
  reason text NOT NULL CHECK (reason = ANY (ARRAY['hard_bounce'::text, 'soft_bounce_converted'::text, 'unsubscribed'::text, 'manual_blacklist'::text, 'spam_complaint'::text])),
  suppressed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT suppression_list_pkey PRIMARY KEY (id),
  CONSTRAINT suppression_list_suppressed_by_fkey FOREIGN KEY (suppressed_by) REFERENCES public.admins(id)
);
CREATE TABLE public.ticket_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_categories_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.ticket_categories(id)
);
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type = ANY (ARRAY['user'::text, 'admin'::text])),
  message text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_consent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
  is_consented boolean NOT NULL DEFAULT false,
  consent_source text NOT NULL DEFAULT 'signup'::text CHECK (consent_source = ANY (ARRAY['signup'::text, 'settings'::text, 'campaign'::text, 'admin'::text])),
  consented_at timestamp with time zone,
  revoked_at timestamp with time zone,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_consent_pkey PRIMARY KEY (id),
  CONSTRAINT user_consent_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_presence (
  user_id uuid NOT NULL,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text, 'qa_team'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  voucher_type text NOT NULL CHECK (voucher_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'shipping'::text])),
  value numeric NOT NULL CHECK (value > 0::numeric),
  min_order_value numeric NOT NULL DEFAULT 0 CHECK (min_order_value >= 0::numeric),
  max_discount numeric CHECK (max_discount > 0::numeric),
  seller_id uuid,
  claimable_from timestamp with time zone NOT NULL,
  claimable_until timestamp with time zone NOT NULL,
  usage_limit integer CHECK (usage_limit > 0),
  claim_limit integer,
  duration interval,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT vouchers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);