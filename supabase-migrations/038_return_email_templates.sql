-- =============================================================================
-- Migration 038: Return / Refund Lifecycle Email Templates
-- Adds 6 templates that cover every buyer-facing and seller-facing return event.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- Depends on: 026_email_template_redesign.sql (creates email_templates table +
--             _bx_email helper).
-- =============================================================================

INSERT INTO public.email_templates
  (name, slug, subject, html_body, variables, category, is_active)
VALUES

-- ─── 1. Buyer: Return Request Received ───────────────────────────────────────
(
  'Return Request Received',
  'return_requested',
  'We received your return request for order #{{order_number}}',
  _bx_email(
    '#D97706',
    'Return Request Received',
    'We''ll review it within 48 hours.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  We have received your return request for order <strong>#{{order_number}}</strong>.
  The seller has 48 hours to review your request.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;font-weight:600;color:#18181B">#{{order_number}}</span></td>
  </tr>
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Reason</span></td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;color:#18181B">{{return_reason}}</span></td>
  </tr>
  <tr>
    <td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Resolution path</span></td>
    <td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{resolution_path}}</span></td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#71717A;line-height:1.6">
  You will receive another email once the seller approves, rejects, or responds with a counter-offer.
</p>$body$,
    ''
  ),
  '["buyer_name","order_number","return_reason","resolution_path"]',
  'transactional',
  true
),

-- ─── 2. Buyer: Return Approved ────────────────────────────────────────────────
(
  'Return Approved',
  'return_approved',
  'Your return for order #{{order_number}} has been approved',
  _bx_email(
    '#16A34A',
    'Return Approved ✓',
    'Please ship the item back to the seller.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  Great news — your return request for order <strong>#{{order_number}}</strong> has been
  <strong style="color:#16A34A">approved</strong>. Please ship the item back to the seller as soon as possible.
</p>
<p style="margin:0 0 20px;font-size:14px;color:#52525B;line-height:1.6">
  Once the seller confirms receipt of the returned item, your refund will be processed within
  3–5 business days to your original payment method.
</p>
<p style="margin:0;font-size:13px;color:#71717A;line-height:1.6">
  Log in to BazaarX to access your return shipping label and mark the item as shipped.
</p>$body$,
    ''
  ),
  '["buyer_name","order_number","return_label_url"]',
  'transactional',
  true
),

-- ─── 3. Buyer: Return Rejected ────────────────────────────────────────────────
(
  'Return Rejected',
  'return_rejected',
  'Update on your return request for order #{{order_number}}',
  _bx_email(
    '#DC2626',
    'Return Request Update',
    'We''re sorry — your request was not approved.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  Unfortunately, your return request for order <strong>#{{order_number}}</strong> was
  <strong style="color:#DC2626">not approved</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
  <tr>
    <td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Reason from seller</span></td>
    <td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{reject_reason}}</span></td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#52525B;line-height:1.6">
  If you believe this decision is incorrect, you can escalate the case to BazaarX support
  by logging in and opening a dispute.
</p>$body$,
    ''
  ),
  '["buyer_name","order_number","reject_reason"]',
  'transactional',
  true
),

-- ─── 4. Buyer: Counter-Offer Received ────────────────────────────────────────
(
  'Return Counter-Offer',
  'return_counter_offered',
  'The seller has a counter-offer for your return on order #{{order_number}}',
  _bx_email(
    '#2563EB',
    'Counter-Offer Received',
    'Review the seller''s proposal and accept or decline.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{buyer_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  The seller has reviewed your return request for order <strong>#{{order_number}}</strong>
  and sent a counter-offer for your consideration.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
  <tr>
    <td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Offer details</span></td>
    <td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{offer_details}}</span></td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#52525B;line-height:1.6">
  Log in to BazaarX to <strong>accept</strong> or <strong>decline</strong> this offer
  before the deadline expires.
</p>$body$,
    ''
  ),
  '["buyer_name","order_number","offer_details"]',
  'transactional',
  true
),

-- ─── 5. Seller: New Return Request ────────────────────────────────────────────
(
  'Seller — New Return Request',
  'seller_return_request',
  'Return request on order #{{order_number}} from {{buyer_name}}',
  _bx_email(
    '#D97706',
    'New Return Request',
    'A buyer has submitted a return request. Please respond within 48 hours.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{seller_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  <strong>{{buyer_name}}</strong> has submitted a return request for order
  <strong>#{{order_number}}</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;font-weight:600;color:#18181B">#{{order_number}}</span></td>
  </tr>
  <tr>
    <td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Return reason</span></td>
    <td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{return_reason}}</span></td>
  </tr>
</table>
<p style="margin:0 0 20px;font-size:14px;color:#52525B;line-height:1.6">
  You have <strong>48 hours</strong> to approve, reject, or counter-offer.
  If you do not respond in time, the case will be escalated to BazaarX support.
</p>
<p style="margin:0;font-size:14px;color:#52525B">
  Log in to your Seller Dashboard → Returns to take action.
</p>$body$,
    ''
  ),
  '["seller_name","order_number","buyer_name","return_reason"]',
  'transactional',
  true
),

-- ─── 6. Seller: Buyer Shipped Return ─────────────────────────────────────────
(
  'Seller — Return Item Shipped',
  'seller_return_shipped',
  'Buyer has shipped the return for order #{{order_number}}',
  _bx_email(
    '#2563EB',
    'Return Item On Its Way',
    'Please confirm receipt once it arrives.',
    $body$<p style="margin:0 0 20px;font-size:15px;color:#18181B;line-height:1.6">Hi <strong>{{seller_name}}</strong>,</p>
<p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.6">
  The buyer has shipped the return item for order <strong>#{{order_number}}</strong>.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:13px;color:#71717A">Order number</span></td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid #F4F4F5"><span style="font-size:15px;font-weight:600;color:#18181B">#{{order_number}}</span></td>
  </tr>
  <tr>
    <td style="padding:10px 0"><span style="font-size:13px;color:#71717A">Tracking number</span></td>
    <td align="right" style="padding:10px 0"><span style="font-size:15px;color:#18181B">{{tracking_number}}</span></td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#52525B;line-height:1.6">
  Once you receive the item, log in to your Seller Dashboard → Returns and click
  <strong>"Confirm Received"</strong> to release the refund to the buyer.
</p>$body$,
    ''
  ),
  '["seller_name","order_number","tracking_number"]',
  'transactional',
  true
)
ON CONFLICT (slug) DO NOTHING;
