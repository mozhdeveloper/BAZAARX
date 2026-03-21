# Order Email Notification Flow — BazaarPH

> **Purpose**: Define the complete buyer email notification lifecycle for every order status change, including the digital receipt on payment, and the admin toggle system that controls each notification independently.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BUYER PLACES ORDER                          │
│  orders.shipment_status = 'waiting_for_seller'                       │
│  orders.payment_status  = 'pending_payment'                          │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     STATUS CHANGE HAPPENS                            │
│  (seller updates shipment_status OR payment gateway updates payment) │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  1. Log to order_status_history                                      │
│  2. Send in-app chat message (orderNotificationService)              │
│  3. Send push notification                                           │
│  4. Call transactional email helper ──┐                               │
│  5. (Future) Call SMS service ────────┤                               │
└──────────────────────────────────────┘                               │
               ┌───────────────────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│            emailService.sendTemplatedEmail()                         │
│  1. Fetch template from email_templates by slug                      │
│  2. Render HTML with {{variables}}                                   │
│  3. Call send-email edge function                                    │
└──────────────┬───────────────────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│          send-email Supabase Edge Function                           │
│  1. Check notification_settings (channel='email', event_type=X)      │
│     └─ If is_enabled = false → return { sent: false, reason: '...' } │
│  2. Send via Resend API (RESEND_API_KEY secret)                      │
│  3. Log to email_logs (status, recipient, event_type, timestamp)     │
│  4. Return { sent: true, message_id }                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Unique Email Per Status — Matrix

Every order status change triggers a **different, uniquely designed email**. Each has its own template slug, subject line, content, CTAs, and colour accent. The admin can toggle each one independently.

### 2a. Shipment Status Emails (buyer receives)

| # | Status | Template Slug | Subject Line | Unique Content | CTA Button | Accent |
|---|--------|---------------|-------------|----------------|------------|--------|
| 1 | `waiting_for_seller` | `order_receipt` | "Your BazaarPH Order Receipt — {{order_number}}" | Full itemized receipt, subtotal, shipping, discount, total, payment method, shipping address | Track Your Order | Amber `#D97706` |
| 2 | `processing` | `order_confirmed` | "Your order {{order_number}} has been confirmed!" | Seller has accepted and is preparing. Shows estimated delivery date | Track Order | Amber |
| 3 | `ready_to_ship` | `order_ready_to_ship` | "Your order {{order_number}} is packed and ready!" | Items packed, awaiting courier pickup. Estimated pickup window | Track Order | Amber |
| 4 | `shipped` | `order_shipped` | "Your order {{order_number}} is on its way! 📦" | Tracking number, courier name, tracking link table | Track Shipment | Amber |
| 5 | `out_for_delivery` | `order_out_for_delivery` | "Your order {{order_number}} is out for delivery! 🚚" | Courier attempting delivery today. Reminder to have someone receive | Track Live | Amber |
| 6 | `delivered` | `order_delivered` | "Your order {{order_number}} has been delivered! 🎉" | Delivered successfully. Request for review/feedback | Leave a Review | Green `#16A34A` |
| 7 | `failed_to_deliver` | `order_failed_delivery` | "Delivery attempt failed for {{order_number}}" | Courier could not deliver. Reason shown. Reschedule or contact seller | Contact Seller | Red `#C53030` |
| 8 | `cancelled` | `order_cancelled` | "Your order {{order_number}} has been cancelled" | Cancel reason, refund amount, refund timeline (3-5 business days) | Continue Shopping | Gray |
| 9 | `returned` | `order_returned` | "Return confirmed for {{order_number}}" | Return accepted, refund amount, refund method, timeline | View Return Status | Amber |

### 2b. Payment Status Emails (buyer receives)

| # | Status | Template Slug | Subject Line | Unique Content | CTA Button |
|---|--------|---------------|-------------|----------------|------------|
| 10 | `paid` | `payment_received` | "Payment confirmed — ₱{{amount}}" | Payment confirmation table: order #, amount, method, transaction date. **Includes digital receipt section** (see Section 3) | View Order |
| 11 | `refunded` | `refund_processed` | "Refund processed — ₱{{amount}}" | Refund amount, original order #, refund method, 3-5 day timeline | Continue Shopping |
| 12 | `partially_refunded` | `partial_refund_processed` | "Partial refund of ₱{{amount}} for {{order_number}}" | Partial refund amount, what was refunded, remaining order total | View Order |
| 13 | `payment_failed` | `payment_failed` | "Payment failed for order {{order_number}}" | Payment could not be processed, retry link, alternative methods | Retry Payment |

### 2c. Non-Order Emails

| # | Event | Template Slug | Subject Line | Notes |
|---|-------|---------------|-------------|-------|
| 14 | New signup | `welcome` | "Welcome to BazaarPH! 🎉" | Account welcome, platform features, CTA to start shopping |
| 15 | Abandoned cart | `abandoned_cart` | "You left items in your cart!" | Cart items, total, urgency nudge (disabled by default) |
| 16 | Marketing blast | `marketing_blast` | "{{subject}}" | Admin-composed content, fully dynamic |

---

## 3. Digital Receipt on Payment (`paid` status)

When `payment_status` changes to `paid`, the buyer receives **both** a payment confirmation **and** an embedded digital receipt. This is a single email with two logical sections.

### 3a. Digital Receipt Content

```
┌─────────────────────────────────────────┐
│         🧾 DIGITAL RECEIPT              │
│         BazaarPH Order Receipt          │
├─────────────────────────────────────────┤
│  Receipt No:    RCP-20260319-XXXXX      │
│  Date:          March 19, 2026          │
│  Order:         ORD-XXXXXXXXXX          │
│  Buyer:         {{buyer_name}}          │
│  Email:         {{buyer_email}}         │
├─────────────────────────────────────────┤
│  ITEMS PURCHASED                        │
│  ┌──────────────────────┬───┬──────┐    │
│  │ Item                 │Qty│ Price│    │
│  ├──────────────────────┼───┼──────┤    │
│  │ {{item_name}}        │ 2 │ ₱599 │    │
│  │ {{item_name}}        │ 1 │ ₱299 │    │
│  └──────────────────────┴───┴──────┘    │
│                                         │
│  Subtotal:              ₱1,497.00       │
│  Shipping Fee:          ₱   50.00       │
│  Discount:             -₱  100.00       │
│  ─────────────────────────────────      │
│  TOTAL PAID:            ₱1,447.00       │
│                                         │
│  Payment Method:   GCash               │
│  Transaction ID:   TXN-XXXXXXXXXX       │
│  Status:               ✓ PAID           │
│                                         │
│  Shipping Address:                      │
│  {{full_address}}                       │
├─────────────────────────────────────────┤
│  This document is not valid for         │
│  claiming of input tax.                 │
│  © 2026 BazaarPH. All rights reserved.  │
└─────────────────────────────────────────┘
```

### 3b. Template Variables for Digital Receipt

```typescript
{
  buyer_name:       string,     // "Juan dela Cruz"
  buyer_email:      string,     // "juan@email.com"
  receipt_number:   string,     // "RCP-20260319-AB12X"
  order_number:     string,     // "ORD-XXXXXXXXXX"
  order_date:       string,     // "March 19, 2026 at 2:30 PM"
  items_html:       string,     // Pre-rendered HTML table rows
  subtotal:         string,     // "1,497.00"
  shipping:         string,     // "50.00"
  discount:         string,     // "100.00"
  total:            string,     // "1,447.00"
  payment_method:   string,     // "GCash"
  transaction_id:   string,     // "TXN-XXXXXXXXXX"
  transaction_date: string,     // "March 19, 2026 at 2:30 PM"
  shipping_address: string,     // Full formatted address
  track_url:        string,     // Deep link to order tracking
}
```

### 3c. Receipt Number Generation

```
RCP-{YYYYMMDD}-{5-char alphanumeric}
Example: RCP-20260319-X9K2F
```

- Generated client-side at the moment `payment_status` flips to `paid`
- Stored in `orders.receipt_number` column (to be added)
- Each receipt number is globally unique

---

## 4. Admin Toggle System

### 4a. How It Works

The `notification_settings` table has a **unique constraint**: `(channel, event_type)`. This means each combination of channel + event has exactly one row with an `is_enabled` boolean.

```sql
-- Example rows in notification_settings:
('email', 'order_placed',      true)   -- Receipt email ON
('email', 'order_confirmed',   true)   -- Confirmed email ON
('email', 'order_shipped',     true)   -- Shipped email ON
('email', 'order_delivered',   true)   -- Delivered email ON
('email', 'order_cancelled',   true)   -- Cancelled email ON
('email', 'payment_received',  true)   -- Payment + receipt ON
('email', 'refund_processed',  true)   -- Refund email ON
('email', 'payment_failed',    false)  -- Payment failed OFF (new)
('email', 'order_ready_to_ship', true) -- Ready to ship ON (new)
('email', 'order_out_for_delivery', true) -- Out for delivery ON (new)
('email', 'order_failed_delivery', true)  -- Failed delivery ON (new)
('email', 'order_returned',    true)   -- Returned email ON (new)
('email', 'partial_refund',    true)   -- Partial refund ON (new)
('email', 'welcome_email',     true)   -- Welcome email ON
('email', 'abandoned_cart',    false)  -- Abandoned cart OFF
('email', 'marketing_campaign', true)  -- Marketing blast ON
```

### 4b. Edge Function Gate

Every email goes through the `send-email` edge function. Before calling Resend, it queries:

```sql
SELECT is_enabled FROM notification_settings
WHERE channel = 'email' AND event_type = $event_type
```

- If `is_enabled = false` → returns `{ sent: false, reason: "Email notifications disabled for this event" }` and logs to `email_logs` with `status: 'disabled'`
- If `is_enabled = true` (or no row found, defaults to true) → proceeds to send via Resend
- Admin sees all disabled sends in the Notification logs tab

### 4c. Admin UI (AdminNotificationSettings page)

| Feature | Description |
|---------|-------------|
| **Master toggle per channel** | Turn off ALL email / ALL SMS / ALL push in one click |
| **Per-event toggle** | Toggle individual events (e.g., disable "Order Shipped" email but keep others) |
| **Log viewer** | See all sent/disabled/failed/bounced emails with timestamp, recipient, event type |
| **Bulk actions** | Enable/disable all events for a channel at once |

### 4d. Toggle Flow

```
Admin flips toggle OFF for "order_shipped" email
        │
        ▼
adminNotificationStore.toggleSetting(id, false)
        │
        ▼
UPDATE notification_settings SET is_enabled = false
WHERE id = $id
        │
        ▼
Next time a seller marks an order as shipped:
  → transactionalEmails.sendOrderShippedEmail() is called
    → emailService.sendTemplatedEmail() calls send-email edge function
      → Edge function checks notification_settings
        → is_enabled = false
          → Returns { sent: false, reason: "disabled" }
          → Logged to email_logs with status: "disabled"
          → Buyer does NOT receive the email
```

---

## 5. Implementation Plan — New Templates & Events

### 5a. New Email Templates to Add (migration)

These templates don't exist yet and need to be created:

| Slug | Event Type | Status |
|------|-----------|--------|
| `order_ready_to_ship` | `order_ready_to_ship` | **NEW** |
| `order_out_for_delivery` | `order_out_for_delivery` | **NEW** |
| `order_failed_delivery` | `order_failed_delivery` | **NEW** |
| `order_returned` | `order_returned` | **NEW** |
| `partial_refund_processed` | `partial_refund` | **NEW** |
| `payment_failed` | `payment_failed` | **NEW** |
| `digital_receipt` | `payment_received` | **UPGRADE** — enhance existing `payment_received` template to include full receipt |

### 5b. New Notification Settings to Seed

```sql
INSERT INTO notification_settings (channel, event_type, is_enabled)
VALUES
  ('email', 'order_ready_to_ship',    true),
  ('email', 'order_out_for_delivery', true),
  ('email', 'order_failed_delivery',  true),
  ('email', 'order_returned',         true),
  ('email', 'partial_refund',         true),
  ('email', 'payment_failed',         false),
  -- SMS equivalents (disabled for now — noop provider)
  ('sms', 'order_ready_to_ship',      false),
  ('sms', 'order_out_for_delivery',   false),
  ('sms', 'order_failed_delivery',    false),
  ('sms', 'order_returned',           false),
  ('sms', 'partial_refund',           false),
  ('sms', 'payment_failed',           false),
  -- Push equivalents
  ('push', 'order_ready_to_ship',     true),
  ('push', 'order_out_for_delivery',  true),
  ('push', 'order_failed_delivery',   true),
  ('push', 'order_returned',          true),
  ('push', 'partial_refund',          false),
  ('push', 'payment_failed',          true)
ON CONFLICT (channel, event_type) DO NOTHING;
```

### 5c. New Transactional Email Functions

Add to `web/src/services/transactionalEmails.ts`:

```typescript
// Ready to Ship
export async function sendOrderReadyToShipEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  estimatedPickup: string;
})

// Out for Delivery
export async function sendOrderOutForDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  courierName: string;
  trackingUrl: string;
})

// Failed Delivery
export async function sendOrderFailedDeliveryEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  failureReason: string;
  rescheduleUrl: string;
})

// Order Returned
export async function sendOrderReturnedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  refundMethod: string;
})

// Digital Receipt (enhanced payment email)
export async function sendDigitalReceiptEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  receiptNumber: string;
  buyerName: string;
  buyerEmailDisplay: string;
  orderDate: string;
  itemsHtml: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  paymentMethod: string;
  transactionId: string;
  transactionDate: string;
  shippingAddress: string;
  trackUrl: string;
})

// Partial Refund
export async function sendPartialRefundEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  refundAmount: string;
  remainingTotal: string;
  refundMethod: string;
  refundedItems: string;
})

// Payment Failed
export async function sendPaymentFailedEmail(params: {
  buyerEmail: string;
  buyerId: string;
  orderNumber: string;
  buyerName: string;
  retryUrl: string;
})
```

### 5d. Database Change — `receipt_number` Column

```sql
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE;
```

---

## 6. Complete Buyer Email Journey

```
                          BUYER JOURNEY TIMELINE
═══════════════════════════════════════════════════════════════════

Step 1: SIGN UP
  └─ 📧 Welcome Email (welcome)
       "Welcome to BazaarPH! 🎉"

Step 2: BROWSE & ADD TO CART
  └─ (no email yet)
  └─ 📧 Abandoned Cart reminder if they leave (abandoned_cart) [optional]

Step 3: PLACE ORDER
  └─ 📧 Order Receipt (order_receipt)
       "Your BazaarPH Order Receipt — ORD-XXXXXXXXXX"
       Contains: Full itemized list, subtotal, shipping, discount, total
       CTA: Track Your Order

Step 4: PAYMENT CONFIRMED
  └─ 📧 Payment + Digital Receipt (payment_received)
       "Payment confirmed — ₱1,447.00"
       Contains: Payment details table + FULL DIGITAL RECEIPT
       Receipt No: RCP-20260319-X9K2F
       CTA: View Order
       Note: This serves as the buyer's proof of payment

Step 5: SELLER CONFIRMS
  └─ 📧 Order Confirmed (order_confirmed)
       "Your order ORD-XXXXXXXXXX has been confirmed!"
       Contains: Seller accepted, estimated delivery date
       CTA: Track Order

Step 6: PACKED & READY
  └─ 📧 Ready to Ship (order_ready_to_ship) ← NEW
       "Your order ORD-XXXXXXXXXX is packed and ready!"
       Contains: Items packed, waiting for courier pickup
       CTA: Track Order

Step 7: SHIPPED
  └─ 📧 Order Shipped (order_shipped)
       "Your order ORD-XXXXXXXXXX is on its way! 📦"
       Contains: Tracking number, courier, tracking link
       CTA: Track Shipment

Step 8: OUT FOR DELIVERY
  └─ 📧 Out for Delivery (order_out_for_delivery) ← NEW
       "Your order ORD-XXXXXXXXXX is out for delivery! 🚚"
       Contains: Courier en route, delivery today reminder
       CTA: Track Live

Step 9a: DELIVERED ✓
  └─ 📧 Order Delivered (order_delivered)
       "Your order ORD-XXXXXXXXXX has been delivered! 🎉"
       Contains: Delivered confirmation, review request
       CTA: Leave a Review

Step 9b: FAILED DELIVERY ✗
  └─ 📧 Failed Delivery (order_failed_delivery) ← NEW
       "Delivery attempt failed for ORD-XXXXXXXXXX"
       Contains: Failure reason, reschedule option
       CTA: Contact Seller

Step 10a: CANCELLED
  └─ 📧 Order Cancelled (order_cancelled)
       "Your order ORD-XXXXXXXXXX has been cancelled"
       Contains: Cancel reason, refund amount, refund timeline
       CTA: Continue Shopping

Step 10b: RETURNED
  └─ 📧 Return Confirmed (order_returned) ← NEW
       "Return confirmed for ORD-XXXXXXXXXX"
       Contains: Return accepted, refund amount, method, timeline
       CTA: View Return Status

Step 11a: FULL REFUND
  └─ 📧 Refund Processed (refund_processed)
       "Refund processed — ₱1,447.00"
       Contains: Full refund details, method, 3-5 day timeline
       CTA: Continue Shopping

Step 11b: PARTIAL REFUND
  └─ 📧 Partial Refund (partial_refund_processed) ← NEW
       "Partial refund of ₱299.00 for ORD-XXXXXXXXXX"
       Contains: What was refunded, amount, remaining total
       CTA: View Order

Step 11c: PAYMENT FAILED
  └─ 📧 Payment Failed (payment_failed) ← NEW
       "Payment failed for order ORD-XXXXXXXXXX"
       Contains: Payment could not be processed, retry link
       CTA: Retry Payment
```

---

## 7. Email Template Design Standards

All email templates follow a consistent design:

```
┌────────────────────────────────────────┐
│  HEADER BAR                            │
│  Background: #D97706 (brand-primary)   │
│  Logo text: "BazaarPH" in white        │
│  Subtitle per template                 │
├────────────────────────────────────────┤
│                                        │
│  BODY                                  │
│  Background: #FFFFFF                   │
│  Font: Segoe UI, Tahoma, sans-serif    │
│  Heading: #2D2522 (text-headline)      │
│  Body text: #555                       │
│  Tables: #e5e7eb borders, #f9fafb alt  │
│                                        │
│  CTA BUTTON                            │
│  Background: #D97706                   │
│  Text: white, bold, 14px              │
│  Border-radius: 8px                    │
│  Padding: 12px 32px                    │
│                                        │
├────────────────────────────────────────┤
│  FOOTER                                │
│  Background: #f9fafb                   │
│  Text: #9ca3af, 12px                   │
│  Tax disclaimer (for receipts)         │
│  © 2026 BazaarPH                       │
└────────────────────────────────────────┘
```

**Important**: The current seeded templates use `#FF6A00` in the header. These need to be updated to `#D97706` to match the actual BazaarPH brand palette defined in `globals.css`.

---

## 8. Integration Points — Where to Call Emails

### 8a. Seller Updates Shipment Status

**File**: `web/src/services/orderNotificationService.ts` → `sendStatusUpdateNotification()`

After logging the status change and sending chat + push, add:

```typescript
// Inside sendStatusUpdateNotification, after push notification
switch (newStatus) {
  case 'processing':
    await sendOrderConfirmedEmail({ ... });
    break;
  case 'ready_to_ship':
    await sendOrderReadyToShipEmail({ ... });
    break;
  case 'shipped':
    await sendOrderShippedEmail({ ... });
    break;
  case 'out_for_delivery':
    await sendOrderOutForDeliveryEmail({ ... });
    break;
  case 'delivered':
    await sendOrderDeliveredEmail({ ... });
    break;
  case 'failed_to_deliver':
    await sendOrderFailedDeliveryEmail({ ... });
    break;
  case 'cancelled':
    await sendOrderCancelledEmail({ ... });
    break;
  case 'returned':
    await sendOrderReturnedEmail({ ... });
    break;
}
```

### 8b. Payment Status Changes

**Location**: Wherever `payment_status` is updated (checkout flow, payment webhook handler)

```typescript
// On payment_status → 'paid'
const receiptNumber = generateReceiptNumber(); // RCP-YYYYMMDD-XXXXX
await supabase.from('orders').update({ receipt_number: receiptNumber }).eq('id', orderId);
await sendDigitalReceiptEmail({ receiptNumber, ... });

// On payment_status → 'refunded'
await sendRefundProcessedEmail({ ... });

// On payment_status → 'partially_refunded'
await sendPartialRefundEmail({ ... });

// On payment_status → 'payment_failed'
await sendPaymentFailedEmail({ ... });
```

### 8c. User Signup

**Location**: Auth callback / signup success handler

```typescript
await sendWelcomeEmail({ buyerEmail, buyerId, buyerName });
```

---

## 9. Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase-migrations/023_order_email_enhancements.sql` | **CREATE** | New templates + notification settings for missing statuses + `receipt_number` column |
| `web/src/services/transactionalEmails.ts` | **MODIFY** | Add 6 new email helper functions |
| `web/src/services/orderNotificationService.ts` | **MODIFY** | Wire email calls into `sendStatusUpdateNotification()` switch block |
| `web/src/services/receiptService.ts` | **CREATE** | `generateReceiptNumber()`, `buildItemsHtml()`, `formatReceiptData()` |
| `supabase/functions/send-email/index.ts` | **NO CHANGE** | Already gates on `notification_settings` — works as-is |
| `web/src/pages/AdminNotificationSettings.tsx` | **MINOR** | New event types will auto-appear from DB — may need display labels |
| `web/src/stores/admin/adminNotificationStore.ts` | **NO CHANGE** | Already generic — fetches all rows |

---

## 10. Event Type → Display Label Mapping

For the Admin Notification Settings UI:

```typescript
const EVENT_LABELS: Record<string, string> = {
  order_placed:           'Order Placed (Receipt)',
  order_confirmed:        'Order Confirmed',
  order_ready_to_ship:    'Ready to Ship',
  order_shipped:          'Order Shipped',
  order_out_for_delivery: 'Out for Delivery',
  order_delivered:        'Order Delivered',
  order_failed_delivery:  'Failed Delivery',
  order_cancelled:        'Order Cancelled',
  order_returned:         'Order Returned',
  payment_received:       'Payment Received (Digital Receipt)',
  payment_failed:         'Payment Failed',
  refund_processed:       'Refund Processed',
  partial_refund:         'Partial Refund',
  welcome_email:          'Welcome Email',
  abandoned_cart:         'Abandoned Cart Reminder',
  marketing_campaign:     'Marketing Campaign',
};
```

---

## 11. Summary

- **16 unique email templates** — each order status gets its own uniquely designed email
- **Digital receipt** is embedded inside the `payment_received` email when `paid` status is set
- **Receipt number** generated as `RCP-{YYYYMMDD}-{5-char}`, stored in `orders.receipt_number`
- **Admin toggles** control every email independently via `notification_settings` table
- **Edge function gate** — `send-email` checks `is_enabled` before every send, logs disabled sends
- **Zero SMS API dependency** — SMS uses noop provider until `SMS_PROVIDER` secret is configured
- **Brand-consistent** — all templates use `#D97706` amber header, `Segoe UI` font, `8px` rounded buttons
