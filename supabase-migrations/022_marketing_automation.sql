-- ============================================================================
-- Migration: 022_marketing_automation.sql
-- Description: Marketing automation, CRM, transactional email/SMS infrastructure
-- Tables: notification_settings, email_templates, email_logs, sms_logs,
--         marketing_campaigns, buyer_segments, automation_workflows
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. buyer_segments (must exist before marketing_campaigns references it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filter_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  buyer_count integer DEFAULT 0,
  is_dynamic boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_segments_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);

ALTER TABLE public.buyer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage buyer segments"
  ON public.buyer_segments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. email_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'marketing', 'system')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. notification_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  event_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  template_id uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT notification_settings_channel_event UNIQUE (channel, event_type),
  CONSTRAINT notification_settings_template_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT notification_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admins(id)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4. email_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_id uuid,
  template_id uuid,
  event_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed', 'disabled')),
  resend_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT email_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id)
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
  ON public.email_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- Service role can insert logs (edge functions use service role)
CREATE POLICY "Service role can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. sms_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_phone text NOT NULL,
  recipient_id uuid,
  event_type text NOT NULL,
  message_body text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'disabled')),
  provider text DEFAULT 'none',
  provider_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sms logs"
  ON public.sms_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

CREATE POLICY "Service role can insert sms logs"
  ON public.sms_logs FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. marketing_campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL
    CHECK (campaign_type IN ('email_blast', 'sms_blast', 'multi_channel')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  segment_id uuid,
  template_id uuid,
  subject text,
  content text,
  sms_content text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_clicked integer DEFAULT 0,
  total_bounced integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_campaigns_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.buyer_segments(id),
  CONSTRAINT marketing_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT marketing_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 7. automation_workflows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_workflows (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_workflows_pkey PRIMARY KEY (id),
  CONSTRAINT automation_workflows_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT automation_workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation workflows"
  ON public.automation_workflows FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_event ON public.email_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs (status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs (status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_settings_lookup ON public.notification_settings (channel, event_type);

-- ---------------------------------------------------------------------------
-- 9. Seed default notification settings
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_settings (channel, event_type, is_enabled) VALUES
  ('email', 'order_placed',       true),
  ('email', 'order_confirmed',    true),
  ('email', 'order_shipped',      true),
  ('email', 'order_delivered',    true),
  ('email', 'order_cancelled',    true),
  ('email', 'payment_received',   true),
  ('email', 'refund_processed',   true),
  ('email', 'welcome_email',      true),
  ('email', 'abandoned_cart',     false),
  ('email', 'marketing_campaign', true),
  ('sms',   'order_placed',       false),
  ('sms',   'order_confirmed',    false),
  ('sms',   'order_shipped',      false),
  ('sms',   'order_delivered',    false),
  ('sms',   'order_cancelled',    false),
  ('sms',   'payment_received',   false),
  ('sms',   'refund_processed',   false),
  ('sms',   'welcome_email',      false),
  ('sms',   'abandoned_cart',     false),
  ('sms',   'marketing_campaign', false),
  ('push',  'order_placed',       true),
  ('push',  'order_confirmed',    true),
  ('push',  'order_shipped',      true),
  ('push',  'order_delivered',    true),
  ('push',  'order_cancelled',    true),
  ('push',  'payment_received',   true),
  ('push',  'refund_processed',   true),
  ('push',  'welcome_email',      false),
  ('push',  'abandoned_cart',     false),
  ('push',  'marketing_campaign', false)
ON CONFLICT (channel, event_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. Seed default email templates
-- ---------------------------------------------------------------------------
INSERT INTO public.email_templates (name, slug, subject, html_body, variables, category) VALUES
(
  'Order Receipt',
  'order_receipt',
  'Your BazaarPH Order Receipt — {{order_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Receipt</title></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Order Receipt</p></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 24px;font-size:14px;color:#555">Thank you for your order! Here is your receipt.</p><table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Order Number</td><td style="color:#555">{{order_number}}</td></tr><tr><td style="font-weight:600;color:#374151">Date</td><td style="color:#555">{{order_date}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Payment Method</td><td style="color:#555">{{payment_method}}</td></tr><tr><td style="font-weight:600;color:#374151">Shipping Address</td><td style="color:#555">{{shipping_address}}</td></tr></table><div style="margin:24px 0">{{items_html}}</div><table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px"><tr><td style="color:#555">Subtotal</td><td style="text-align:right;color:#555">₱{{subtotal}}</td></tr><tr><td style="color:#555">Shipping</td><td style="text-align:right;color:#555">₱{{shipping}}</td></tr><tr><td style="color:#555">Discount</td><td style="text-align:right;color:#16a34a">-₱{{discount}}</td></tr><tr style="border-top:2px solid #e5e7eb"><td style="font-weight:700;font-size:16px;color:#111;padding-top:12px">Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#111;padding-top:12px">₱{{total}}</td></tr></table><div style="text-align:center;margin:32px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Track Your Order</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0 0 4px;font-size:12px;color:#9ca3af">This document is not valid for claiming of input tax.</p><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","order_date","payment_method","shipping_address","items_html","subtotal","shipping","discount","total","track_url"]',
  'transactional'
),
(
  'Order Confirmed',
  'order_confirmed',
  'Your order {{order_number}} has been confirmed!',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Order Confirmed ✓</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your order <strong>{{order_number}}</strong> has been confirmed by the seller and is being prepared.</p><p style="margin:0 0 24px;font-size:14px;color:#555">Estimated delivery: <strong>{{estimated_delivery}}</strong></p><div style="text-align:center"><a href="{{track_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Track Order</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","estimated_delivery","track_url"]',
  'transactional'
),
(
  'Order Shipped',
  'order_shipped',
  'Your order {{order_number}} is on its way! 📦',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Your Order is on its Way! 📦</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your order <strong>{{order_number}}</strong> has been shipped.</p><table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Tracking Number</td><td style="color:#555">{{tracking_number}}</td></tr><tr><td style="font-weight:600;color:#374151">Courier</td><td style="color:#555">{{courier}}</td></tr></table><div style="text-align:center;margin:24px 0"><a href="{{track_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Track Shipment</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","tracking_number","courier","track_url"]',
  'transactional'
),
(
  'Order Delivered',
  'order_delivered',
  'Your order {{order_number}} has been delivered! 🎉',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Order Delivered! 🎉</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your order <strong>{{order_number}}</strong> has been delivered successfully.</p><p style="margin:0 0 24px;font-size:14px;color:#555">We hope you love your purchase! Your feedback means a lot to us and helps other shoppers.</p><div style="text-align:center"><a href="{{review_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Leave a Review</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","review_url"]',
  'transactional'
),
(
  'Order Cancelled',
  'order_cancelled',
  'Your order {{order_number}} has been cancelled',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Order Cancelled</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your order <strong>{{order_number}}</strong> has been cancelled.</p><p style="margin:0 0 8px;font-size:14px;color:#555">Reason: {{cancel_reason}}</p><p style="margin:0 0 24px;font-size:14px;color:#555">Refund amount: <strong>₱{{refund_amount}}</strong> — this will be processed within 3-5 business days.</p><div style="text-align:center"><a href="{{shop_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Continue Shopping</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","cancel_reason","refund_amount","shop_url"]',
  'transactional'
),
(
  'Payment Received',
  'payment_received',
  'Payment confirmed — ₱{{amount}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Payment Confirmed ✓</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">We have received your payment of <strong>₱{{amount}}</strong>.</p><table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Order Number</td><td style="color:#555">{{order_number}}</td></tr><tr><td style="font-weight:600;color:#374151">Amount</td><td style="color:#555">₱{{amount}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Payment Method</td><td style="color:#555">{{payment_method}}</td></tr><tr><td style="font-weight:600;color:#374151">Transaction Date</td><td style="color:#555">{{transaction_date}}</td></tr></table></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0 0 4px;font-size:12px;color:#9ca3af">This document is not valid for claiming of input tax.</p><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","amount","order_number","payment_method","transaction_date"]',
  'transactional'
),
(
  'Refund Processed',
  'refund_processed',
  'Refund processed — ₱{{amount}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Refund Processed</h2><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your refund of <strong>₱{{amount}}</strong> for order <strong>{{order_number}}</strong> has been processed.</p><p style="margin:0 0 24px;font-size:14px;color:#555">Refund method: <strong>{{refund_method}}</strong>. Please allow 3-5 business days for the refund to appear in your account.</p><div style="text-align:center"><a href="{{shop_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Continue Shopping</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","amount","order_number","refund_method","shop_url"]',
  'transactional'
),
(
  'Welcome Email',
  'welcome',
  'Welcome to BazaarPH! 🎉',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">Welcome aboard! 🎉</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#333">Hello, {{buyer_name}}!</h2><p style="margin:0 0 16px;font-size:14px;color:#555">Welcome to BazaarPH — the Philippines'' premier online marketplace. We''re thrilled to have you!</p><p style="margin:0 0 8px;font-size:14px;color:#555;font-weight:600">Here''s what you can do:</p><ul style="margin:0 0 24px;padding:0 0 0 20px;font-size:14px;color:#555"><li style="margin:0 0 8px">Browse thousands of products from verified sellers</li><li style="margin:0 0 8px">Get exclusive deals and flash sales</li><li style="margin:0 0 8px">Earn BazaarCoins on every purchase</li><li style="margin:0 0 8px">Chat directly with sellers</li></ul><div style="text-align:center"><a href="{{shop_url}}" style="display:inline-block;background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start Shopping</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","shop_url"]',
  'transactional'
),
(
  'Marketing Blast',
  'marketing_blast',
  '{{subject}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#FF6A00;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px;font-size:16px;color:#333">Hi <strong>{{buyer_name}}</strong>,</p><div style="font-size:14px;color:#555;line-height:1.6">{{content}}</div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0 0 8px;font-size:12px;color:#9ca3af">You received this because you have a BazaarPH account.</p><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","content","subject"]',
  'marketing'
)
ON CONFLICT (slug) DO NOTHING;
