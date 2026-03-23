-- =============================================================================
-- Migration 026: Email Template Redesign
-- Clean, minimalistic Fresha-inspired design for all 16 email templates
-- Design: BazaarX brand, zinc palette, system fonts, 560px card, 4px accent bar
-- Date: 2026-03-20
-- =============================================================================

-- ─── Helper function (dropped at end) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION _bx_email(
  p_accent   text,   -- accent bar colour (#D97706 amber | #DC2626 red)
  p_heading  text,   -- centred h1 (NULL to skip heading section)
  p_subtitle text,   -- centred subtitle below heading
  p_body     text,   -- inner body HTML (greeting, details, CTA …)
  p_footer   text DEFAULT ''  -- extra footer lines before standard footer
) RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
SELECT
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]--></head>'
  || '<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">'
  || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5"><tr><td align="center" style="padding:40px 16px">'
  -- Logo
  || '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td align="center" style="padding:0 0 24px">'
  || '<span style="font-size:28px;font-weight:700;color:#18181B;letter-spacing:-0.5px">Bazaar<span style="color:#D97706">X</span></span>'
  || '</td></tr></table>'
  -- Card open
  || '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;border:1px solid #E4E4E7;overflow:hidden">'
  || '<tr><td style="height:4px;background:' || p_accent || ';font-size:0;line-height:0">&nbsp;</td></tr>'
  -- Heading (optional)
  || CASE WHEN p_heading IS NOT NULL AND p_heading <> '' THEN
       '<tr><td style="padding:40px 40px 0;text-align:center">'
       || '<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181B;line-height:1.3">' || p_heading || '</h1>'
       || '<p style="margin:0;font-size:15px;color:#71717A;line-height:1.5">' || COALESCE(p_subtitle,'') || '</p>'
       || '</td></tr>'
       || '<tr><td style="padding:24px 40px 0"><div style="border-top:1px solid #E4E4E7"></div></td></tr>'
       || '<tr><td style="padding:24px 40px 40px">' || p_body || '</td></tr>'
     ELSE
       '<tr><td style="padding:40px">' || p_body || '</td></tr>'
     END
  -- Card close
  || '</table>'
  -- Footer
  || '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:24px 0;text-align:center">'
  || p_footer
  || '<p style="margin:0 0 8px;font-size:13px;color:#A1A1AA">Need help? Reach us at support@bazaarx.ph</p>'
  || '<p style="margin:0;font-size:12px;color:#A1A1AA">&copy; 2026 BazaarX. All rights reserved.</p>'
  || '</td></tr></table>'
  || '</td></tr></table></body></html>';
$fn$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. ORDER RECEIPT
--    Code sends: buyer_name, order_number, order_date, items_html,
--                subtotal, shipping, total
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Your BazaarX order receipt — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Order Receipt',
    'Thank you for your purchase.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Here are your order details.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Date</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{order_date}}</span></td></tr>
</table>
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:0.08em">Items ordered</p>
<div style="margin:0 0 20px">{{items_html}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:6px 0"><span style="font-size:14px;color:#71717A">Subtotal</span></td><td align="right" style="padding:6px 0"><span style="font-size:14px;color:#18181B">&#8369;{{subtotal}}</span></td></tr>
<tr><td style="padding:6px 0"><span style="font-size:14px;color:#71717A">Shipping</span></td><td align="right" style="padding:6px 0"><span style="font-size:14px;color:#18181B">&#8369;{{shipping}}</span></td></tr>
<tr><td colspan="2" style="padding:8px 0 0"><div style="border-top:2px solid #E4E4E7"></div></td></tr>
<tr><td style="padding:12px 0 0"><span style="font-size:16px;font-weight:700;color:#18181B">Total</span></td><td align="right" style="padding:12px 0 0"><span style="font-size:16px;font-weight:700;color:#18181B">&#8369;{{total}}</span></td></tr>
</table>$body$,
    '<p style="margin:0 0 4px;font-size:12px;color:#A1A1AA">This document is not valid for claiming of input tax.</p>'
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_receipt';


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. ORDER CONFIRMED
--    Code sends: buyer_name, order_number, estimated_delivery
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Order confirmed — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Order Confirmed',
    'Your order has been confirmed and is being prepared.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your order <strong>#{{order_number}}</strong> has been confirmed by the seller and is now being prepared for shipment.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Estimated delivery</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{estimated_delivery}}</span></td></tr>
</table>
<p style="margin:0;font-size:14px;color:#71717A;line-height:1.6">You will receive another email when your order ships.</p>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_confirmed';


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. ORDER SHIPPED
--    Code sends: buyer_name, order_number, tracking_number, courier, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Your order is on its way — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Your Order is On Its Way',
    'Your package has been shipped and is heading to you.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your order <strong>#{{order_number}}</strong> has been shipped and is on its way.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Tracking number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#D97706;font-weight:600">{{tracking_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Courier</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{courier}}</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Track Shipment</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_shipped';


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. ORDER DELIVERED
--    Code sends: buyer_name, order_number
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Your order has been delivered — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Order Delivered',
    'Your package has been delivered successfully.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 8px;font-size:15px;color:#52525B;line-height:1.6">Your order <strong>#{{order_number}}</strong> has been delivered.</p>
<p style="margin:0;font-size:15px;color:#52525B;line-height:1.6">We hope you love your purchase! Your feedback helps other shoppers make better decisions.</p>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_delivered';


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. ORDER CANCELLED
--    Code sends: buyer_name, order_number, cancel_reason
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Order cancelled — #{{order_number}}',
  html_body  = _bx_email(
    '#DC2626',
    'Order Cancelled',
    'Your order has been cancelled.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your order <strong>#{{order_number}}</strong> has been cancelled.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Reason</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{cancel_reason}}</span></td></tr>
</table>
<p style="margin:0;font-size:14px;color:#71717A;line-height:1.6">If a payment was made, your refund will be processed within 3–5 business days.</p>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_cancelled';


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. PAYMENT RECEIVED
--    Code sends: buyer_name, order_number, payment_method, amount
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Payment confirmed — &#8369;{{amount}}',
  html_body  = _bx_email(
    '#D97706',
    'Payment Confirmed',
    'Your payment has been received.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your payment of <strong>&#8369;{{amount}}</strong> has been received and confirmed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Amount</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">&#8369;{{amount}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Payment method</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{payment_method}}</span></td></tr>
</table>$body$,
    '<p style="margin:0 0 4px;font-size:12px;color:#A1A1AA">This document is not valid for claiming of input tax.</p>'
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'payment_received';


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. REFUND PROCESSED
--    Code sends: buyer_name, order_number, amount, refund_method
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Refund processed — &#8369;{{amount}}',
  html_body  = _bx_email(
    '#D97706',
    'Refund Processed',
    'Your refund has been processed successfully.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your refund of <strong>&#8369;{{amount}}</strong> for order <strong>#{{order_number}}</strong> has been processed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Refund amount</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#16A34A;font-weight:600">&#8369;{{amount}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Refund method</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{refund_method}}</span></td></tr>
</table>
<p style="margin:0;font-size:14px;color:#71717A;line-height:1.6">Please allow 3–5 business days for the refund to appear in your account.</p>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'refund_processed';


-- ═════════════════════════════════════════════════════════════════════════════
-- 8. WELCOME
--    Code sends: buyer_name, shop_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Welcome to BazaarX!',
  html_body  = _bx_email(
    '#D97706',
    'Welcome to BazaarX',
    'Great to have you on board.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#52525B;line-height:1.6">Welcome to BazaarX — the Philippines' premier online marketplace. Here's what you can look forward to:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:8px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:14px;color:#52525B">&#10003;&nbsp; Browse from thousands of verified sellers</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:14px;color:#52525B">&#10003;&nbsp; Access exclusive deals and flash sales</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:14px;color:#52525B">&#10003;&nbsp; Earn BazaarCoins on every purchase</span></td></tr>
<tr><td style="padding:8px 0"><span style="font-size:14px;color:#52525B">&#10003;&nbsp; Chat directly with sellers</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{shop_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Start Shopping</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'welcome';


-- ═════════════════════════════════════════════════════════════════════════════
-- 9. MARKETING BLAST
--    Code sends: buyer_name, content, subject
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = '{{subject}}',
  html_body  = _bx_email(
    '#D97706',
    NULL,
    NULL,
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<div style="font-size:15px;color:#52525B;line-height:1.6">{{content}}</div>$body$,
    '<p style="margin:0 0 4px;font-size:12px;color:#A1A1AA">You received this because you have a BazaarX account.</p>'
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'marketing_blast';


-- ═════════════════════════════════════════════════════════════════════════════
-- 10. ORDER READY TO SHIP
--     Code sends: buyer_name, order_number, estimated_pickup, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Your order is ready to ship — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Ready to Ship',
    'Your order is packed and waiting for courier pickup.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Great news! Your order <strong>#{{order_number}}</strong> has been packed and is waiting for the courier to pick it up.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Estimated pickup</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{estimated_pickup}}</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Track Order</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_ready_to_ship';


-- ═════════════════════════════════════════════════════════════════════════════
-- 11. ORDER OUT FOR DELIVERY
--     Code sends: buyer_name, order_number, courier_name, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Out for delivery — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Out for Delivery',
    'Your order is on its way to you today.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your order <strong>#{{order_number}}</strong> is out for delivery today. Please make sure someone is available to receive it.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Courier</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{courier_name}}</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Track Live</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_out_for_delivery';


-- ═════════════════════════════════════════════════════════════════════════════
-- 12. ORDER FAILED DELIVERY
--     Code sends: buyer_name, order_number, failure_reason, reschedule_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Delivery attempt failed — #{{order_number}}',
  html_body  = _bx_email(
    '#DC2626',
    'Delivery Attempt Failed',
    'We were unable to deliver your order.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Our courier was unable to deliver order <strong>#{{order_number}}</strong>. Please reschedule your delivery or contact the seller.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Reason</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{failure_reason}}</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{reschedule_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reschedule Delivery</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_failed_delivery';


-- ═════════════════════════════════════════════════════════════════════════════
-- 13. ORDER RETURNED
--     Code sends: buyer_name, order_number, refund_amount, refund_method, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Return confirmed — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Return Confirmed',
    'Your return has been received and confirmed.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">Your return for order <strong>#{{order_number}}</strong> has been received and confirmed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Refund amount</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#16A34A;font-weight:600">&#8369;{{refund_amount}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Refund method</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{refund_method}}</span></td></tr>
</table>
<p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6">Please allow 3–5 business days for the refund to appear in your account.</p>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">View Return Status</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'order_returned';


-- ═════════════════════════════════════════════════════════════════════════════
-- 14. PARTIAL REFUND PROCESSED
--     Code sends: buyer_name, order_number, refund_amount, refund_method,
--                 remaining_total, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Partial refund processed — #{{order_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Partial Refund Processed',
    'A partial refund has been issued for your order.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 24px;font-size:15px;color:#52525B;line-height:1.6">A partial refund has been processed for order <strong>#{{order_number}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Refunded amount</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#16A34A;font-weight:600">&#8369;{{refund_amount}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Refund method</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{refund_method}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Remaining total</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B;font-weight:600">&#8369;{{remaining_total}}</span></td></tr>
</table>
<p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6">Please allow 3–5 business days for the refund to appear in your account.</p>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">View Order</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'partial_refund_processed';


-- ═════════════════════════════════════════════════════════════════════════════
-- 15. PAYMENT FAILED
--     Code sends: buyer_name, order_number, retry_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Payment failed — #{{order_number}}',
  html_body  = _bx_email(
    '#DC2626',
    'Payment Failed',
    'We were unable to process your payment.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 8px;font-size:15px;color:#52525B;line-height:1.6">The payment for order <strong>#{{order_number}}</strong> could not be processed.</p>
<p style="margin:0 0 28px;font-size:15px;color:#52525B;line-height:1.6">Please try again with a different payment method or contact your bank or e-wallet provider.</p>
<div style="text-align:center;padding:8px 0 0"><a href="{{retry_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Retry Payment</a></div>$body$
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'payment_failed';


-- ═════════════════════════════════════════════════════════════════════════════
-- 16. DIGITAL RECEIPT
--     Code sends: buyer_name, buyer_email, receipt_number, order_number,
--                 order_date, items_html, subtotal, shipping, discount, total,
--                 payment_method, transaction_id, transaction_date,
--                 shipping_address, track_url
-- ═════════════════════════════════════════════════════════════════════════════
UPDATE public.email_templates SET
  subject    = 'Your BazaarX digital receipt — {{receipt_number}}',
  html_body  = _bx_email(
    '#D97706',
    'Digital Receipt',
    'Your payment has been confirmed.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>, your payment has been confirmed.</p>
<p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:0.08em">Receipt details</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Receipt number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#D97706;font-weight:700">{{receipt_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B;font-weight:600">{{order_number}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order date</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{order_date}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Buyer</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{buyer_name}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Email</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{buyer_email}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Shipping address</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{shipping_address}}</span></td></tr>
</table>
<p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:0.08em">Items purchased</p>
<div style="margin:0 0 20px">{{items_html}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
<tr><td style="padding:6px 0"><span style="font-size:14px;color:#71717A">Subtotal</span></td><td align="right" style="padding:6px 0"><span style="font-size:14px;color:#18181B">&#8369;{{subtotal}}</span></td></tr>
<tr><td style="padding:6px 0"><span style="font-size:14px;color:#71717A">Shipping</span></td><td align="right" style="padding:6px 0"><span style="font-size:14px;color:#18181B">&#8369;{{shipping}}</span></td></tr>
<tr><td style="padding:6px 0"><span style="font-size:14px;color:#71717A">Discount</span></td><td align="right" style="padding:6px 0"><span style="font-size:14px;color:#16A34A">-&#8369;{{discount}}</span></td></tr>
<tr><td colspan="2" style="padding:8px 0 0"><div style="border-top:2px solid #E4E4E7"></div></td></tr>
<tr><td style="padding:12px 0 0"><span style="font-size:16px;font-weight:700;color:#18181B">Total Paid</span></td><td align="right" style="padding:12px 0 0"><span style="font-size:16px;font-weight:700;color:#18181B">&#8369;{{total}}</span></td></tr>
</table>
<p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#A1A1AA;text-transform:uppercase;letter-spacing:0.08em">Payment information</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Payment method</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{payment_method}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Transaction ID</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{transaction_id}}</span></td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Transaction date</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{transaction_date}}</span></td></tr>
<tr><td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Status</span></td><td align="right" style="padding:10px 0"><span style="font-size:15px;color:#16A34A;font-weight:700">&#10003; PAID</span></td></tr>
</table>
<div style="text-align:center;padding:8px 0 0"><a href="{{track_url}}" style="display:inline-block;background:#D97706;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">View Your Order</a></div>$body$,
    '<p style="margin:0 0 4px;font-size:12px;color:#A1A1AA">This document is not valid for claiming of input tax.</p><p style="margin:0 0 4px;font-size:12px;color:#A1A1AA">This serves as your official proof of payment with BazaarX.</p>'
  ),
  version    = version + 1,
  updated_at = NOW()
WHERE slug = 'digital_receipt';


-- ─── Cleanup ─────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS _bx_email(text, text, text, text, text);
