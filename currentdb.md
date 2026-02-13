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
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
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
CREATE TABLE public.discount_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
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
  CONSTRAINT discount_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT discount_campaigns_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
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
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type = ANY (ARRAY['buyer'::text, 'seller'::text])),
  content text NOT NULL,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
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
CREATE TABLE public.product_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT product_approvals_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_approvals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.product_assessment_logistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_assessment_logistics_pkey PRIMARY KEY (id),
  CONSTRAINT product_assessment_logistics_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_assessment_logistics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.product_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending_digital_review'::text CHECK (status = ANY (ARRAY['pending_digital_review'::text, 'waiting_for_sample'::text, 'pending_physical_review'::text, 'verified'::text, 'for_revision'::text, 'rejected'::text])),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  revision_requested_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  assigned_to uuid,
  notes text,
  CONSTRAINT product_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT product_assessments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT product_assessments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
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
  CONSTRAINT product_rejections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.product_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT product_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT product_revisions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.product_assessments(id),
  CONSTRAINT product_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
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
  approval_status text NOT NULL DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'reclassified'::text])),
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
CREATE TABLE public.refund_return_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  is_returnable boolean NOT NULL DEFAULT true,
  return_window_days integer NOT NULL DEFAULT 7 CHECK (return_window_days >= 0),
  return_reason text,
  refund_amount numeric CHECK (refund_amount >= 0::numeric),
  refund_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  CONSTRAINT registries_pkey PRIMARY KEY (id),
  CONSTRAINT registries_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id)
);
CREATE TABLE public.registry_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registry_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity_desired integer NOT NULL CHECK (quantity_desired > 0),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
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
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id),
  CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
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
CREATE TABLE public.seller_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_rejections_pkey PRIMARY KEY (id),
  CONSTRAINT seller_rejections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.seller_verification_documents (
  seller_id uuid NOT NULL,
  business_permit_url text,
  valid_id_url text,
  proof_of_address_url text,
  dti_registration_url text,
  tax_id_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT seller_verification_documents_pkey PRIMARY KEY (seller_id),
  CONSTRAINT seller_verification_documents_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.sellers (
  id uuid NOT NULL,
  store_name text NOT NULL UNIQUE,
  store_description text,
  avatar_url text,
  owner_name text,
  approval_status text NOT NULL DEFAULT 'pending'::text CHECK (approval_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
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
  CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
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
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ticket_categories(id),
  CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admins(id)
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
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text])),
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