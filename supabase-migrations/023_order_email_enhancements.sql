-- =============================================================================
-- Migration 023: Order Email Enhancements
-- Adds receipt_number column, new per-status email templates, digital receipt,
-- and notification_settings rows for all missing order events.
-- Date: 2026-03-19
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add receipt_number to orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_receipt_number_idx
  ON public.orders (receipt_number)
  WHERE receipt_number IS NOT NULL;

COMMENT ON COLUMN public.orders.receipt_number IS
  'Unique receipt number generated on payment confirmation. Format: RCP-YYYYMMDD-XXXXX';

-- ---------------------------------------------------------------------------
-- 2. Fix brand color in ALL existing email templates
--    Old colour: #FF6A00 (orange)  →  Correct brand colour: #D97706 (amber)
-- ---------------------------------------------------------------------------
UPDATE public.email_templates
SET
  html_body  = REPLACE(html_body,  'background:#FF6A00', 'background:#D97706'),
  updated_at = NOW()
WHERE html_body LIKE '%background:#FF6A00%';

-- Fix CTA button colour too (can appear with or without trailing font-size)
UPDATE public.email_templates
SET
  html_body  = REPLACE(html_body,
    'background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px',
    'background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px'),
  updated_at = NOW()
WHERE html_body LIKE '%background:#FF6A00;color:#fff;padding:12px 32px%font-size:14px%';

UPDATE public.email_templates
SET
  html_body  = REPLACE(html_body,
    'background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600"',
    'background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600"'),
  updated_at = NOW()
WHERE html_body LIKE '%background:#FF6A00;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600"%';

-- ---------------------------------------------------------------------------
-- 3. Insert new email templates (idempotent via ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------
INSERT INTO public.email_templates (name, slug, subject, html_body, variables, category) VALUES

-- ── Ready to Ship ────────────────────────────────────────────────────────────
(
  'Order Ready to Ship',
  'order_ready_to_ship',
  'Your order {{order_number}} is packed and ready! 📦',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#D97706;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Packed &amp; Ready</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">Your order is packed and ready! 📦</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Great news! Your order <strong>{{order_number}}</strong> has been packed and is waiting for courier pickup.</p><p style="margin:0 0 24px;font-size:14px;color:#555">Expected courier pickup: <strong>{{estimated_pickup}}</strong></p><div style="text-align:center"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Track Order</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","estimated_pickup","track_url"]',
  'transactional'
),

-- ── Out for Delivery ─────────────────────────────────────────────────────────
(
  'Order Out for Delivery',
  'order_out_for_delivery',
  'Your order {{order_number}} is out for delivery! 🚚',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#D97706;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Out for Delivery</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">Almost there! Your order is on the way 🚚</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Your order <strong>{{order_number}}</strong> is out for delivery today via <strong>{{courier_name}}</strong>.</p><p style="margin:0 0 24px;font-size:14px;color:#555">Please make sure someone is available to receive the package.</p><div style="text-align:center"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Track Live</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","courier_name","track_url"]',
  'transactional'
),

-- ── Failed Delivery ──────────────────────────────────────────────────────────
(
  'Order Failed Delivery',
  'order_failed_delivery',
  'Delivery attempt failed for order {{order_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#C53030;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Delivery Attempt Failed</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">We couldn''t deliver your order</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Our courier was unable to deliver order <strong>{{order_number}}</strong>.</p><p style="margin:0 0 8px;font-size:14px;color:#555">Reason: <strong>{{failure_reason}}</strong></p><p style="margin:0 0 24px;font-size:14px;color:#555">Please contact the seller to reschedule your delivery or arrange a pickup.</p><div style="text-align:center"><a href="{{reschedule_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Contact Seller</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","failure_reason","reschedule_url"]',
  'transactional'
),

-- ── Order Returned ───────────────────────────────────────────────────────────
(
  'Order Returned',
  'order_returned',
  'Return confirmed for order {{order_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#D97706;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Return Confirmed</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">Return confirmed for your order</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">We have received and confirmed the return for order <strong>{{order_number}}</strong>.</p><table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Refund Amount</td><td style="color:#555">&#x20B1;{{refund_amount}}</td></tr><tr><td style="font-weight:600;color:#374151">Refund Method</td><td style="color:#555">{{refund_method}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Processing Time</td><td style="color:#555">3&ndash;5 business days</td></tr></table><div style="text-align:center"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Return Status</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","refund_amount","refund_method","track_url"]',
  'transactional'
),

-- ── Partial Refund ───────────────────────────────────────────────────────────
(
  'Partial Refund Processed',
  'partial_refund_processed',
  'Partial refund of &#x20B1;{{refund_amount}} for order {{order_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#D97706;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Partial Refund</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">Partial refund processed</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">A partial refund has been processed for order <strong>{{order_number}}</strong>.</p><table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Refunded Amount</td><td style="color:#16a34a;font-weight:600">&#x20B1;{{refund_amount}}</td></tr><tr><td style="font-weight:600;color:#374151">Refund Method</td><td style="color:#555">{{refund_method}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151">Remaining Order Total</td><td style="color:#555">&#x20B1;{{remaining_total}}</td></tr><tr><td style="font-weight:600;color:#374151">Processing Time</td><td style="color:#555">3&ndash;5 business days</td></tr></table><div style="text-align:center"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Order</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","refund_amount","refund_method","remaining_total","track_url"]',
  'transactional'
),

-- ── Payment Failed ───────────────────────────────────────────────────────────
(
  'Payment Failed',
  'payment_failed',
  'Payment failed for order {{order_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#C53030;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">Payment Failed</p></td></tr><tr><td style="padding:32px"><h2 style="margin:0 0 16px;color:#2D2522">We couldn''t process your payment</h2><p style="margin:0 0 16px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>,</p><p style="margin:0 0 8px;font-size:14px;color:#555">Unfortunately, the payment for order <strong>{{order_number}}</strong> could not be processed.</p><p style="margin:0 0 24px;font-size:14px;color:#555">Please try again with a different payment method or contact your bank or e-wallet provider.</p><div style="text-align:center"><a href="{{retry_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Retry Payment</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","order_number","retry_url"]',
  'transactional'
),

-- ── Digital Receipt (payment confirmed + full receipt) ────────────────────────
(
  'Digital Receipt',
  'digital_receipt',
  'Your BazaarPH Digital Receipt — {{receipt_number}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digital Receipt</title></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Tahoma,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)"><tr><td style="background:#D97706;padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:28px">BazaarPH</h1><p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px">&#x1F9FE; OFFICIAL DIGITAL RECEIPT</p></td></tr><tr><td style="padding:32px"><p style="margin:0 0 24px;font-size:16px;color:#2D2522">Hi <strong>{{buyer_name}}</strong>, your payment has been confirmed!</p><table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:24px"><tr style="background:#FDE8C8"><td colspan="2" style="padding:10px 12px;font-weight:700;color:#92400E;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Receipt Details</td></tr><tr><td style="font-weight:600;color:#374151;padding:8px 12px">Receipt No.</td><td style="color:#D97706;font-weight:700;padding:8px 12px">{{receipt_number}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151;padding:8px 12px">Order No.</td><td style="color:#555;padding:8px 12px">{{order_number}}</td></tr><tr><td style="font-weight:600;color:#374151;padding:8px 12px">Order Date</td><td style="color:#555;padding:8px 12px">{{order_date}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151;padding:8px 12px">Buyer</td><td style="color:#555;padding:8px 12px">{{buyer_name}}</td></tr><tr><td style="font-weight:600;color:#374151;padding:8px 12px">Email</td><td style="color:#555;padding:8px 12px">{{buyer_email}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151;padding:8px 12px">Shipping Address</td><td style="color:#555;padding:8px 12px">{{shipping_address}}</td></tr></table><p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em">Items Purchased</p><div style="margin-bottom:24px">{{items_html}}</div><table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px"><tr><td style="color:#555;padding:4px 0">Subtotal</td><td style="text-align:right;color:#555">&#x20B1;{{subtotal}}</td></tr><tr><td style="color:#555;padding:4px 0">Shipping</td><td style="text-align:right;color:#555">&#x20B1;{{shipping}}</td></tr><tr><td style="color:#16a34a;padding:4px 0">Discount</td><td style="text-align:right;color:#16a34a">-&#x20B1;{{discount}}</td></tr><tr><td colspan="2" style="border-top:2px solid #e5e7eb;padding:0"></td></tr><tr><td style="font-weight:700;font-size:16px;color:#2D2522;padding:10px 0 4px">TOTAL PAID</td><td style="text-align:right;font-weight:700;font-size:16px;color:#2D2522;padding:10px 0 4px">&#x20B1;{{total}}</td></tr></table><table width="100%" cellpadding="8" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:14px"><tr style="background:#FDE8C8"><td colspan="2" style="padding:10px 12px;font-weight:700;color:#92400E;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Payment Information</td></tr><tr><td style="font-weight:600;color:#374151;padding:8px 12px">Payment Method</td><td style="color:#555;padding:8px 12px">{{payment_method}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151;padding:8px 12px">Transaction ID</td><td style="color:#555;padding:8px 12px">{{transaction_id}}</td></tr><tr><td style="font-weight:600;color:#374151;padding:8px 12px">Transaction Date</td><td style="color:#555;padding:8px 12px">{{transaction_date}}</td></tr><tr style="background:#f9fafb"><td style="font-weight:600;color:#374151;padding:8px 12px">Status</td><td style="color:#16a34a;font-weight:700;padding:8px 12px">&#x2713; PAID</td></tr></table><div style="text-align:center;margin:24px 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Your Order</a></div></td></tr><tr><td style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb"><p style="margin:0 0 4px;font-size:12px;color:#9ca3af">This document is not valid for claiming of input tax.</p><p style="margin:0 0 4px;font-size:12px;color:#9ca3af">This serves as your official proof of payment with BazaarPH.</p><p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 BazaarPH. All rights reserved.</p></td></tr></table></td></tr></table></body></html>',
  '["buyer_name","buyer_email","receipt_number","order_number","order_date","items_html","subtotal","shipping","discount","total","payment_method","transaction_id","transaction_date","shipping_address","track_url"]',
  'transactional'
)

ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Seed notification_settings for new event types (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_settings (channel, event_type, is_enabled) VALUES
  -- Email (all new statuses enabled except payment_failed which is disabled by default)
  ('email', 'order_ready_to_ship',       true),
  ('email', 'order_out_for_delivery',    true),
  ('email', 'order_failed_delivery',     true),
  ('email', 'order_returned',            true),
  ('email', 'partial_refund',            true),
  ('email', 'payment_failed',            false),
  ('email', 'digital_receipt',           true),
  -- SMS (all disabled — noop provider until SMS_PROVIDER secret is configured)
  ('sms',   'order_ready_to_ship',       false),
  ('sms',   'order_out_for_delivery',    false),
  ('sms',   'order_failed_delivery',     false),
  ('sms',   'order_returned',            false),
  ('sms',   'partial_refund',            false),
  ('sms',   'payment_failed',            false),
  ('sms',   'digital_receipt',           false),
  -- Push notifications
  ('push',  'order_ready_to_ship',       true),
  ('push',  'order_out_for_delivery',    true),
  ('push',  'order_failed_delivery',     true),
  ('push',  'order_returned',            true),
  ('push',  'partial_refund',            false),
  ('push',  'payment_failed',            true),
  ('push',  'digital_receipt',           false)
ON CONFLICT (channel, event_type) DO NOTHING;
