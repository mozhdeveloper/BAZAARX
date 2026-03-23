# BazaarPH Marketing Automation & Transactional Notifications Plan

> **Document Version:** 1.0  
> **Date:** March 19, 2026  
> **Status:** Planning  
> **Priority:** High  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Phase 1 — Database Schema & Infrastructure](#3-phase-1--database-schema--infrastructure)
4. [Phase 2 — Resend Email Integration (Edge Function)](#4-phase-2--resend-email-integration-edge-function)
5. [Phase 3 — Transactional Email Notifications](#5-phase-3--transactional-email-notifications)
6. [Phase 4 — Admin CRM & Marketing Automation Dashboard](#6-phase-4--admin-crm--marketing-automation-dashboard)
7. [Phase 5 — SMS API-Ready Infrastructure](#7-phase-5--sms-api-ready-infrastructure)
8. [Phase 6 — Admin Notification Channel Toggles](#8-phase-6--admin-notification-channel-toggles)
9. [Admin Sidebar Integration](#9-admin-sidebar-integration)
10. [Email Template Designs](#10-email-template-designs)
11. [Security & Compliance](#11-security--compliance)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Executive Summary

This plan outlines the implementation of a complete marketing automation and transactional notification system for BazaarPH. The system consists of three pillars:

| Pillar | Description | Status |
|--------|-------------|--------|
| **CRM & Marketing Automation** | Admin-facing dashboard for buyer segmentation, campaign management, and automated email/SMS marketing flows | New Feature |
| **Transactional Email Notifications** | Automated receipt and order status emails sent to buyers via Resend API on every transaction event | New Feature |
| **SMS Notifications (API-Ready)** | SMS notification infrastructure with provider abstraction layer, ready to plug in an SMS API when available | New Feature (Stub) |

**Tech Stack Additions:**
- **Email:** [Resend](https://resend.com) — API key `re_EtuFRFUq_...` (stored as Supabase edge function secret)
- **SMS:** Provider-agnostic abstraction (Semaphore, Twilio, or Vonage — TBD)
- **Templates:** React Email (JSX-based email templates via Resend)

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  CRM &       │  │  Notification│  │  Campaign      │ │
│  │  Buyer       │  │  Settings &  │  │  Builder &     │ │
│  │  Segments    │  │  Toggles     │  │  Scheduler     │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                 SUPABASE BACKEND                         │
│                                                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ Database Tables  │  │ Edge Functions                │  │
│  │                  │  │                               │  │
│  │ notification_    │  │ send-email/     (Resend API)  │  │
│  │   settings       │  │ send-sms/      (Stub/Ready)  │  │
│  │ email_templates  │  │ automation-    (Cron runner)  │  │
│  │ email_logs       │  │   engine/                     │  │
│  │ sms_logs         │  │                               │  │
│  │ marketing_       │  └──────────────────────────────┘  │
│  │   campaigns      │                                    │
│  │ buyer_segments   │  ┌──────────────────────────────┐  │
│  │ automation_      │  │ Database Triggers             │  │
│  │   workflows      │  │                               │  │
│  │                  │  │ on orders.payment_status →    │  │
│  │                  │  │   invoke send-email/          │  │
│  │                  │  │ on orders.shipment_status →   │  │
│  │                  │  │   invoke send-email/          │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1 — Database Schema & Infrastructure

### 3.1 New Tables

#### `notification_settings` — Global admin toggles for each notification channel

```sql
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  event_type text NOT NULL,
  -- Event types: order_placed, order_confirmed, order_shipped, order_delivered,
  -- order_cancelled, payment_received, refund_processed, welcome_email,
  -- abandoned_cart, marketing_campaign
  is_enabled boolean NOT NULL DEFAULT true,
  template_id uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_settings_pkey PRIMARY KEY (id),
  CONSTRAINT notification_settings_channel_event UNIQUE (channel, event_type),
  CONSTRAINT notification_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admins(id)
);
```

#### `email_templates` — Reusable email templates managed by admin

```sql
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  -- Slugs: order_receipt, order_confirmed, order_shipped, order_delivered,
  -- order_cancelled, refund_processed, welcome, abandoned_cart, marketing_blast
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  -- e.g. ["buyer_name", "order_number", "total_amount", "items"]
  category text NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'marketing', 'system')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
```

#### `email_logs` — Audit trail for all sent emails

```sql
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_id uuid,
  template_id uuid,
  event_type text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  resend_message_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT email_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id)
);
```

#### `sms_logs` — Audit trail for all SMS (API-ready)

```sql
CREATE TABLE public.sms_logs (
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
```

#### `marketing_campaigns` — CRM marketing campaign records

```sql
CREATE TABLE public.marketing_campaigns (
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
```

#### `buyer_segments` — Buyer audience segments for targeted campaigns

```sql
CREATE TABLE public.buyer_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filter_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Examples:
  -- { "registered_after": "2026-01-01", "min_orders": 3, "min_spent": 5000 }
  -- { "last_active_days": 30, "categories": ["Electronics"] }
  -- { "has_abandoned_cart": true }
  buyer_count integer DEFAULT 0,
  is_dynamic boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_segments_pkey PRIMARY KEY (id),
  CONSTRAINT buyer_segments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
```

#### `automation_workflows` — Automated trigger-based notification flows

```sql
CREATE TABLE public.automation_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  -- Triggers: order_placed, order_shipped, order_delivered, order_cancelled,
  -- buyer_registered, abandoned_cart, inactivity_30d, birthday
  channels jsonb NOT NULL DEFAULT '["email"]'::jsonb,
  -- ["email"], ["sms"], ["email", "sms"], ["email", "push"]
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
```

### 3.2 Default Seed Data

```sql
-- Default notification settings (all channels × all events)
INSERT INTO notification_settings (channel, event_type, is_enabled) VALUES
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
  ('push',  'marketing_campaign', false);
```

### 3.3 Indexes

```sql
CREATE INDEX idx_email_logs_recipient ON email_logs (recipient_id, created_at DESC);
CREATE INDEX idx_email_logs_event ON email_logs (event_type, created_at DESC);
CREATE INDEX idx_email_logs_status ON email_logs (status);
CREATE INDEX idx_sms_logs_recipient ON sms_logs (recipient_id, created_at DESC);
CREATE INDEX idx_sms_logs_status ON sms_logs (status);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns (status, scheduled_at);
CREATE INDEX idx_notification_settings_lookup ON notification_settings (channel, event_type);
```

---

## 4. Phase 2 — Resend Email Integration (Edge Function)

### 4.1 Secret Configuration

```bash
# Store Resend API key as a Supabase edge function secret
supabase secrets set RESEND_API_KEY=re_EtuFRFUq_28U6Nr1fXAf2q8gn89yAtfAt
supabase secrets set SENDER_EMAIL=noreply@bazaarph.com
supabase secrets set SENDER_NAME="BazaarPH"
```

> **Note:** The `SENDER_EMAIL` domain must be verified in the Resend dashboard before sending.

### 4.2 Edge Function: `send-email/index.ts`

**Location:** `supabase/functions/send-email/index.ts`

```typescript
/**
 * Edge Function: send-email
 * 
 * Sends transactional and marketing emails via the Resend API.
 * Checks notification_settings to respect admin toggles.
 * Logs all attempts to email_logs table.
 *
 * Request body:
 *   {
 *     to: string | string[];
 *     subject: string;
 *     html: string;
 *     text?: string;
 *     event_type: string;
 *     recipient_id?: string;
 *     template_id?: string;
 *     metadata?: Record<string, any>;
 *   }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { to, subject, html, text, event_type, recipient_id, template_id, metadata } = body;

    if (!to || !subject || !html || !event_type) {
      return new Response(JSON.stringify({ error: "to, subject, html, event_type required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Check if this event type is enabled ──
    const { data: setting } = await supabase
      .from("notification_settings")
      .select("is_enabled")
      .eq("channel", "email")
      .eq("event_type", event_type)
      .single();

    if (setting && !setting.is_enabled) {
      // Log as disabled
      await logEmail(supabase, { to, subject, event_type, recipient_id, template_id, status: "disabled", metadata });
      return new Response(JSON.stringify({ sent: false, reason: "Email channel disabled for this event" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Send via Resend ──
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "noreply@bazaarph.com";
    const senderName = Deno.env.get("SENDER_NAME") || "BazaarPH";

    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: recipients,
        subject,
        html,
        text: text || undefined,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      await logEmail(supabase, {
        to: recipients.join(", "),
        subject,
        event_type,
        recipient_id,
        template_id,
        status: "sent",
        resend_message_id: result.id,
        metadata,
      });
      return new Response(JSON.stringify({ sent: true, message_id: result.id }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      await logEmail(supabase, {
        to: recipients.join(", "),
        subject,
        event_type,
        recipient_id,
        template_id,
        status: "failed",
        error_message: result.message || JSON.stringify(result),
        metadata,
      });
      return new Response(JSON.stringify({ sent: false, error: result.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function logEmail(supabase: any, params: any) {
  await supabase.from("email_logs").insert({
    recipient_email: params.to,
    recipient_id: params.recipient_id || null,
    template_id: params.template_id || null,
    event_type: params.event_type,
    subject: params.subject,
    status: params.status,
    resend_message_id: params.resend_message_id || null,
    error_message: params.error_message || null,
    metadata: params.metadata || {},
  });
}
```

### 4.3 Web Service: `emailService.ts`

**Location:** `web/src/services/emailService.ts`

Service class that:
- Invokes the `send-email` edge function
- Provides template rendering utilities
- Accepts template slug + variables → fetches template → renders → sends

```typescript
// web/src/services/emailService.ts
export class EmailService {
  static async sendTransactionalEmail(params: {
    to: string;
    eventType: string;
    templateSlug: string;
    variables: Record<string, any>;
    recipientId?: string;
  }): Promise<{ sent: boolean; messageId?: string }>;

  static async renderTemplate(slug: string, variables: Record<string, any>): Promise<{
    subject: string;
    html: string;
  }>;
}
```

---

## 5. Phase 3 — Transactional Email Notifications

### 5.1 Transaction Events & Email Triggers

| # | Event | Trigger Point | Email Content | Recipient |
|---|-------|---------------|---------------|-----------|
| 1 | **Order Placed** | `orders` INSERT with `payment_status = 'paid'` | Order receipt with itemized breakdown, payment method, shipping address | Buyer |
| 2 | **Order Confirmed** | `orders.shipment_status` → `'processing'` | Confirmation with estimated delivery | Buyer |
| 3 | **Order Shipped** | `orders.shipment_status` → `'shipped'` | Shipping notification with tracking number | Buyer |
| 4 | **Order Delivered** | `orders.shipment_status` → `'delivered'` | Delivery confirmation, review prompt | Buyer |
| 5 | **Order Cancelled** | `orders.shipment_status` → `'returned'` or cancel action | Cancellation notice with refund details | Buyer |
| 6 | **Payment Received** | `payment_transactions.status` → `'paid'` | Payment confirmation receipt (like the ShopeePay receipt) | Buyer |
| 7 | **Refund Processed** | `payment_transactions.status` → `'refunded'` | Refund confirmation with amount | Buyer |
| 8 | **Welcome Email** | `buyers` INSERT | Welcome message with getting started guide | Buyer |

### 5.2 Receipt Email Template (Order Receipt)

Based on the ShopeePay receipt format provided, the order receipt email will include:

```
┌──────────────────────────────────────────────┐
│                  BazaarPH                     │
│           Order Receipt / Invoice             │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  BazaarPH                               │  │
│  │  [Platform Address]                     │  │
│  │  TIN: [If applicable]                   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Acknowledgement Receipt                      │
│  Date: March 19, 2026                         │
│                                               │
│  Order Number:    BZR-20260319-XXXXX          │
│  Buyer Name:      Malcolm Lim Cuady           │
│  Email:           buyer@email.com             │
│  Shipping To:     2 mt holy, Santa Elena...   │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ Item           Qty   Price     Subtotal │  │
│  │ ────────────── ───── ──────── ──────── │  │
│  │ Product A       2    ₱500     ₱1,000   │  │
│  │ Product B       1    ₱421     ₱421     │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Subtotal:                        ₱1,421.00   │
│  Shipping:                          ₱100.00   │
│  Discount:                          -₱50.00   │
│  ──────────────────────────────────────────   │
│  TOTAL:                           ₱1,471.00   │
│                                               │
│  Payment Method: GCash                        │
│  Payment Status: ✓ PAID                       │
│                                               │
│  ──────────────────────────────────────────   │
│  "THIS DOCUMENT IS NOT VALID FOR                │
│   CLAIMING OF INPUT TAX"                       │
│  ──────────────────────────────────────────   │
│                                               │
│  Thank you for shopping at BazaarPH!          │
│  Track your order: [Link]                     │
│                                               │
│  © 2026 BazaarPH. All rights reserved.        │
└──────────────────────────────────────────────┘
```

### 5.3 Database Trigger (Webhook Approach)

Instead of Postgres triggers (which cannot call HTTP), use **Supabase Database Webhooks**:

```sql
-- Option A: Use pg_net extension (if available in Supabase plan)
-- Option B: Use Supabase Database Webhooks (Admin Dashboard → Database → Webhooks)

-- Webhook configuration:
-- Table: orders
-- Events: UPDATE
-- Condition: shipment_status changed OR payment_status changed
-- Target: Edge Function URL /send-email
```

**Recommended approach:** Call the `send-email` edge function from the **existing application code** at the point where order status changes are made — this is more reliable and testable than database triggers.

### 5.4 Integration Points (Existing Code)

Integrate email sending into these existing service files:

| File | Function | Email to Send |
|------|----------|---------------|
| `web/src/services/orderNotificationService.ts` → `sendStatusUpdateNotification()` | On status change | Status update email |
| `web/src/stores/admin/adminSellersStore.ts` | On order management actions | Confirmation emails |
| Checkout flow (after successful payment) | Order placed | Receipt email |
| Buyer registration (after profile creation) | New buyer | Welcome email |

---

## 6. Phase 4 — Admin CRM & Marketing Automation Dashboard

### 6.1 New Admin Pages

#### Page 1: `AdminCRM.tsx` — Customer Relationship Management

**Route:** `/admin/crm`  
**Sidebar Label:** "CRM & Marketing"  
**Icon:** `Mail` (lucide-react)

**Tabs:**

| Tab | Description |
|-----|-------------|
| **Buyer Segments** | Create/edit buyer segments with filter criteria (order count, spend amount, registration date, activity, category preferences) |
| **Campaigns** | Create, schedule, and manage email/SMS marketing campaigns |
| **Automation** | Define trigger-based automated workflows (welcome series, abandoned cart, re-engagement) |
| **Analytics** | Email open rates, click rates, delivery stats, campaign performance |

#### Page 2: `AdminNotificationSettings.tsx` — Notification Channel Controls

**Route:** `/admin/notification-settings`  
**Sidebar Label:** "Notifications"  
**Icon:** `Bell` (lucide-react)

**Sections:**

| Section | Description |
|---------|-------------|
| **Email Notifications** | Toggle each transactional email on/off (order receipt, shipping, delivery, etc.) |
| **SMS Notifications** | Toggle each SMS notification on/off (shows "API Not Connected" badge when no SMS provider configured) |
| **Push Notifications** | Toggle each push notification on/off |
| **Email Templates** | View/edit email templates, preview rendered output |
| **Delivery Logs** | View email/SMS delivery history with status, timestamps, and error details |

### 6.2 CRM — Buyer Segments Builder

The segment builder allows admins to create dynamic buyer audiences using filter criteria:

```typescript
interface SegmentFilter {
  // Registration
  registered_after?: string;   // ISO date
  registered_before?: string;

  // Purchase behavior
  min_orders?: number;
  max_orders?: number;
  min_total_spent?: number;
  max_total_spent?: number;
  last_order_within_days?: number;

  // Activity
  last_active_within_days?: number;
  inactive_for_days?: number;

  // Preferences
  preferred_categories?: string[];

  // Cart
  has_abandoned_cart?: boolean;
}
```

**Segment Preview Query** (executed dynamically):

```sql
SELECT b.id, p.email, p.first_name, p.last_name, p.phone,
       COUNT(o.id) as order_count,
       COALESCE(SUM(oi.price * oi.quantity), 0) as total_spent,
       MAX(o.created_at) as last_order_date
FROM buyers b
JOIN profiles p ON p.id = b.id
LEFT JOIN orders o ON o.buyer_id = b.id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE 1=1
  -- Dynamic filters applied based on segment criteria
GROUP BY b.id, p.email, p.first_name, p.last_name, p.phone
HAVING COUNT(o.id) >= :min_orders
   AND COALESCE(SUM(oi.price * oi.quantity), 0) >= :min_total_spent;
```

### 6.3 CRM — Campaign Builder

```
┌─────────────────────────────────────────────────────────┐
│  Create Campaign                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Campaign Name:    [________________________________]    │
│  Type:             ○ Email Blast  ○ SMS Blast  ○ Both   │
│                                                          │
│  Target Segment:   [Dropdown: All Buyers ▼            ] │
│                    Preview: 1,234 recipients              │
│                                                          │
│  ── Email Content ─────────────────────────────────────  │
│  Template:         [Dropdown: Select template ▼       ] │
│  Subject:          [________________________________]    │
│  Content:          [Rich text editor / HTML           ] │
│                    [                                   ] │
│  Preview:          [Rendered email preview            ] │
│                                                          │
│  ── SMS Content (if applicable) ───────────────────────  │
│  Message:          [________________________________]    │
│  Characters:       42/160                                │
│                                                          │
│  ── Schedule ──────────────────────────────────────────  │
│  ○ Send Now    ○ Schedule: [Date picker] [Time picker]  │
│                                                          │
│  [Cancel]  [Save as Draft]  [Send / Schedule Campaign]  │
└─────────────────────────────────────────────────────────┘
```

### 6.4 CRM — Automation Workflows

Pre-built automation templates:

| # | Workflow | Trigger | Delay | Channel | Content |
|---|---------|---------|-------|---------|---------|
| 1 | **Welcome Series** | `buyer_registered` | 0 min | Email | Welcome email with platform guide |
| 2 | **Order Receipt** | `order_placed` | 0 min | Email | Itemized receipt |
| 3 | **Shipping Update** | `order_shipped` | 0 min | Email + Push | Tracking info |
| 4 | **Delivery Confirmation** | `order_delivered` | 0 min | Email + Push | Delivery + review prompt |
| 5 | **Review Reminder** | `order_delivered` | 72 hours | Email | Reminder to leave a review |
| 6 | **Abandoned Cart** | `cart_inactive` | 24 hours | Email | Cart reminder with items |
| 7 | **Re-Engagement** | `inactivity_30d` | 0 min | Email | "We miss you" with recommendations |
| 8 | **Cancellation Follow-up** | `order_cancelled` | 1 hour | Email | Cancellation confirmation + alternatives |

### 6.5 CRM — Analytics Dashboard

| Metric | Description |
|--------|-------------|
| **Total Emails Sent** | Count from `email_logs` grouped by day/week/month |
| **Delivery Rate** | `delivered / sent * 100` |
| **Open Rate** | `opened / delivered * 100` (requires Resend webhook tracking) |
| **Click Rate** | `clicked / opened * 100` |
| **Bounce Rate** | `bounced / sent * 100` |
| **Campaign Performance** | Bar chart of sent/delivered/opened per campaign |
| **SMS Stats** | Sent/delivered/failed (when SMS API is connected) |

---

## 7. Phase 5 — SMS API-Ready Infrastructure

### 7.1 SMS Provider Abstraction

**Location:** `supabase/functions/send-sms/index.ts`

```typescript
/**
 * Edge Function: send-sms (API-Ready)
 *
 * Provider-agnostic SMS sender. Currently logs to sms_logs
 * with status='disabled'. When an SMS API is configured,
 * change the provider implementation.
 *
 * Supported providers (future):
 *   - Semaphore (Philippines local)
 *   - Twilio
 *   - Vonage (Nexmo)
 */
interface SMSProvider {
  name: string;
  send(to: string, message: string): Promise<{ id: string; status: string }>;
}

// Stub provider — logs but does not send
class NoopSMSProvider implements SMSProvider {
  name = 'none';
  async send(to: string, message: string) {
    return { id: 'noop', status: 'disabled' };
  }
}

// Future: Semaphore provider for PH
class SemaphoreSMSProvider implements SMSProvider {
  name = 'semaphore';
  async send(to: string, message: string) {
    // const apiKey = Deno.env.get("SEMAPHORE_API_KEY");
    // POST to https://api.semaphore.co/api/v4/messages
    throw new Error('Semaphore provider not configured');
  }
}

// Future: Twilio provider
class TwilioSMSProvider implements SMSProvider {
  name = 'twilio';
  async send(to: string, message: string) {
    // const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    // const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    throw new Error('Twilio provider not configured');
  }
}
```

### 7.2 SMS Service (Web)

**Location:** `web/src/services/smsService.ts`

```typescript
export class SMSService {
  static async sendSMS(params: {
    to: string;
    message: string;
    eventType: string;
    recipientId?: string;
  }): Promise<{ sent: boolean; status: string }>;

  static async isEnabled(eventType: string): Promise<boolean>;
}
```

### 7.3 Admin SMS Configuration UI

When no SMS API is connected, the admin sees:

```
┌──────────────────────────────────────────────────────┐
│  SMS Notifications                                    │
│                                                       │
│  ⚠️ SMS Provider: Not Connected                       │
│  Status: API-Ready — Configure an SMS provider to     │
│  enable SMS notifications.                            │
│                                                       │
│  Provider:  [Dropdown: None ▼ ]                       │
│             ○ None (Disabled)                          │
│             ○ Semaphore (PH Local)                     │
│             ○ Twilio (International)                   │
│             ○ Vonage / Nexmo                           │
│                                                       │
│  API Key:   [________________________________]        │
│  Sender:    [________________________________]        │
│                                                       │
│  [Test SMS]  [Save Configuration]                     │
│                                                       │
│  ── Per-Event Toggles ─────────────────────────────── │
│  Order Placed          [○ OFF]  (requires provider)   │
│  Order Shipped         [○ OFF]  (requires provider)   │
│  Order Delivered       [○ OFF]  (requires provider)   │
│  Payment Received      [○ OFF]  (requires provider)   │
│  Marketing Campaign    [○ OFF]  (requires provider)   │
└──────────────────────────────────────────────────────┘
```

---

## 8. Phase 6 — Admin Notification Channel Toggles

### 8.1 Toggle UI Design

**Location in sidebar:** "Notifications" section

```
┌──────────────────────────────────────────────────────┐
│  Notification Settings                   Admin Panel  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Master Controls                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 📧 Email Notifications  [████ ON ]  via Resend  │ │
│  │ 📱 SMS Notifications    [░░░░ OFF]  No Provider  │ │
│  │ 🔔 Push Notifications   [████ ON ]  via Expo    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ── Transactional Events ───────────────────────────  │
│                                                       │
│  Event                  Email    SMS     Push         │
│  ─────────────────────  ──────   ──────  ──────      │
│  Order Placed           [✓ ON]   [✗ OFF] [✓ ON]     │
│  Order Confirmed        [✓ ON]   [✗ OFF] [✓ ON]     │
│  Order Shipped          [✓ ON]   [✗ OFF] [✓ ON]     │
│  Order Delivered        [✓ ON]   [✗ OFF] [✓ ON]     │
│  Order Cancelled        [✓ ON]   [✗ OFF] [✓ ON]     │
│  Payment Received       [✓ ON]   [✗ OFF] [✓ ON]     │
│  Refund Processed       [✓ ON]   [✗ OFF] [✓ ON]     │
│  Welcome Email          [✓ ON]   [✗ OFF] [✗ OFF]    │
│  Abandoned Cart         [✗ OFF]  [✗ OFF] [✗ OFF]    │
│  Marketing Campaign     [✓ ON]   [✗ OFF] [✗ OFF]    │
│                                                       │
│  [Save Changes]                                       │
└──────────────────────────────────────────────────────┘
```

### 8.2 Toggle State Management

```typescript
// web/src/stores/admin/adminNotificationStore.ts
interface NotificationSetting {
  id: string;
  channel: 'email' | 'sms' | 'push';
  event_type: string;
  is_enabled: boolean;
}

export const useAdminNotifications = create<{
  settings: NotificationSetting[];
  loading: boolean;
  fetchSettings: () => Promise<void>;
  toggleSetting: (channel: string, eventType: string, enabled: boolean) => Promise<void>;
  bulkToggleChannel: (channel: string, enabled: boolean) => Promise<void>;
}>();
```

---

## 9. Admin Sidebar Integration

### 9.1 New Sidebar Items

Add these two items to the `allLinks` array in `AdminSidebar.tsx`:

```typescript
// After "Announcements" and before "Settings":

{
  label: 'CRM & Marketing',
  href: '/admin/crm',
  icon: <Mail className="h-5 w-5 flex-shrink-0" />,
  qaVisible: false,
},
{
  label: 'Notifications',
  href: '/admin/notification-settings',
  icon: <Bell className="h-5 w-5 flex-shrink-0" />,
  qaVisible: false,
},
```

### 9.2 Updated Sidebar Structure

```
Admin Sidebar (Final)
├── Dashboard
├── Categories
├── Products
├── Product Approvals
├── Product Requests
├── Flash Sales
├── Seller Approvals
├── Trusted Brands
├── Buyers
├── Orders
├── Returns
├── Payouts
├── Vouchers
├── Reviews
├── Analytics
├── Support Tickets
├── Announcements
├── CRM & Marketing        ← NEW
├── Notifications           ← NEW
└── Settings
```

### 9.3 Route Registration (App.tsx)

```typescript
// Lazy imports
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const AdminNotificationSettings = lazy(() => import("./pages/AdminNotificationSettings"));

// Routes (inside admin route block)
<Route path="/admin/crm" element={
  <ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}>
    <AdminCRM />
  </ProtectedAdminRoute>
} />
<Route path="/admin/notification-settings" element={
  <ProtectedAdminRoute allowedRoles={['super_admin', 'admin']}>
    <AdminNotificationSettings />
  </ProtectedAdminRoute>
} />
```

---

## 10. Email Template Designs

### 10.1 Base Template (Shared Layout)

All emails share a consistent layout:

```html
<!-- Base structure for all BazaarPH emails -->
<html>
<head>
  <style>
    /* Inline styles for email compatibility */
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #FF6A00; color: white; padding: 24px; text-align: center; }
    .body { padding: 32px 24px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px; }
    .button { background: #FF6A00; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BazaarPH</h1>
    </div>
    <div class="body">
      <!-- Template-specific content -->
    </div>
    <div class="footer">
      <p>© 2026 BazaarPH. All rights reserved.</p>
      <p>You received this email because you have an account at BazaarPH.</p>
    </div>
  </div>
</body>
</html>
```

### 10.2 Template Slugs & Variables

| Slug | Subject | Variables |
|------|---------|-----------|
| `order_receipt` | "Your BazaarPH Order Receipt — {{order_number}}" | `buyer_name`, `order_number`, `items[]`, `subtotal`, `shipping`, `discount`, `total`, `payment_method`, `shipping_address`, `order_date` |
| `order_confirmed` | "Your order {{order_number}} is confirmed!" | `buyer_name`, `order_number`, `estimated_delivery` |
| `order_shipped` | "Your order {{order_number}} is on its way!" | `buyer_name`, `order_number`, `tracking_number`, `courier` |
| `order_delivered` | "Your order {{order_number}} has been delivered" | `buyer_name`, `order_number`, `review_link` |
| `order_cancelled` | "Your order {{order_number}} has been cancelled" | `buyer_name`, `order_number`, `cancel_reason`, `refund_amount` |
| `payment_received` | "Payment confirmed — ₱{{amount}}" | `buyer_name`, `amount`, `payment_method`, `order_number`, `transaction_date` |
| `refund_processed` | "Refund processed — ₱{{amount}}" | `buyer_name`, `amount`, `refund_method`, `order_number` |
| `welcome` | "Welcome to BazaarPH! 🎉" | `buyer_name` |
| `abandoned_cart` | "You left items in your cart!" | `buyer_name`, `cart_items[]`, `cart_total` |
| `marketing_blast` | (Custom subject) | `buyer_name`, `content` |

---

## 11. Security & Compliance

### 11.1 API Key Security

- **NEVER** store the Resend API key in client-side code or `.env` files committed to Git
- Store as **Supabase Edge Function secret** only (accessed via `Deno.env.get()`)
- The web frontend calls the edge function; the edge function holds the API key

### 11.2 Email Compliance

| Requirement | Implementation |
|-------------|----------------|
| **CAN-SPAM / Anti-Spam** | Include unsubscribe link in marketing emails |
| **GDPR-like compliance** | Honor notification preferences, log all sends |
| **Rate limiting** | Resend handles rate limiting; batch large campaigns |
| **Domain verification** | Verify sender domain in Resend dashboard |
| **Bounce handling** | Log bounces via Resend webhooks → update `email_logs` |

### 11.3 Data Privacy

- Email logs retain recipient email but no PII beyond what's needed for delivery
- SMS logs store phone numbers only for delivery tracking
- Campaign analytics are aggregated, not individual-level
- Admin audit trail tracks who enabled/disabled which notification

### 11.4 Input Validation

- All email templates are server-rendered; no raw user input is injected into HTML
- Template variables are escaped before rendering
- SMS content is sanitized and length-limited (160 chars per segment)

---

## 12. Implementation Checklist

### Phase 1 — Database (Day 1)
- [ ] Create migration file with all new tables (`notification_settings`, `email_templates`, `email_logs`, `sms_logs`, `marketing_campaigns`, `buyer_segments`, `automation_workflows`)
- [ ] Add indexes
- [ ] Insert seed data (default notification settings, default email templates)
- [ ] Run migration on Supabase

### Phase 2 — Resend Integration (Day 2)
- [ ] Set Resend API key as Supabase secret
- [ ] Verify sender domain in Resend dashboard
- [ ] Create `send-email` edge function
- [ ] Create `web/src/services/emailService.ts`
- [ ] Test with a simple email send

### Phase 3 — Transactional Emails (Day 3-4)
- [ ] Build HTML email templates (order receipt, shipping, delivery, welcome, etc.)
- [ ] Integrate email sending into `orderNotificationService.ts`
- [ ] Integrate welcome email into buyer registration flow
- [ ] Integrate receipt email into checkout success flow
- [ ] Test all 8 transactional email types

### Phase 4 — Admin CRM Dashboard (Day 5-7)
- [ ] Create `AdminCRM.tsx` with tabs (Segments, Campaigns, Automation, Analytics)
- [ ] Build buyer segment builder with filter UI
- [ ] Build campaign composer with template selection and preview
- [ ] Build automation workflow manager
- [ ] Build analytics dashboard with charts
- [ ] Create `adminNotificationStore.ts` (Zustand)
- [ ] Create `adminCRMStore.ts` (Zustand)

### Phase 5 — SMS API-Ready (Day 7)
- [ ] Create `send-sms` edge function with provider abstraction
- [ ] Create `web/src/services/smsService.ts`
- [ ] Add SMS provider configuration UI in notification settings
- [ ] Ensure SMS toggles show "API Not Connected" state

### Phase 6 — Notification Toggles (Day 8)
- [ ] Create `AdminNotificationSettings.tsx`
- [ ] Build toggle grid (event × channel matrix)
- [ ] Build master channel toggles
- [ ] Build email/SMS delivery log viewer
- [ ] Integrate toggle checks into `send-email` and `send-sms` edge functions

### Phase 7 — Sidebar & Routes (Day 1 — do first)
- [ ] Add "CRM & Marketing" and "Notifications" to `AdminSidebar.tsx`
- [ ] Add lazy imports and routes to `App.tsx`
- [ ] Verify sidebar navigation works

### Phase 8 — Testing & QA (Day 9-10)
- [ ] Test email delivery for all transaction types
- [ ] Test admin toggle enable/disable for each channel × event
- [ ] Test campaign creation and sending
- [ ] Test segment filtering accuracy
- [ ] Test SMS stub (logs as disabled)
- [ ] Test email template rendering with real order data
- [ ] Verify email logs are recorded correctly
- [ ] Security review: API key exposure, XSS in templates, SQL injection in segments

---

## Appendix A: File Structure (New Files)

```
supabase/
  functions/
    send-email/
      index.ts                    ← Resend email sender edge function
    send-sms/
      index.ts                    ← SMS stub edge function (API-ready)

supabase-migrations/
  XXX_marketing_automation.sql    ← All new tables + seeds

web/src/
  services/
    emailService.ts               ← Email service (calls edge function)
    smsService.ts                 ← SMS service (calls edge function)
  stores/admin/
    adminNotificationStore.ts     ← Notification settings state
    adminCRMStore.ts              ← CRM segments/campaigns state
  pages/
    AdminCRM.tsx                  ← CRM & Marketing page (4 tabs)
    AdminNotificationSettings.tsx ← Notification toggles + logs page
  components/admin/
    SegmentBuilder.tsx            ← Buyer segment filter builder
    CampaignComposer.tsx          ← Email/SMS campaign composer
    AutomationWorkflowEditor.tsx  ← Automation workflow manager
    EmailTemplatePreview.tsx      ← Email template preview renderer
    NotificationToggleGrid.tsx    ← Event × channel toggle matrix
    DeliveryLogViewer.tsx         ← Email/SMS delivery log table
```

## Appendix B: Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Supabase Edge Function Secret | Resend API key for sending emails |
| `SENDER_EMAIL` | Supabase Edge Function Secret | Verified sender email address |
| `SENDER_NAME` | Supabase Edge Function Secret | Sender display name |
| `SEMAPHORE_API_KEY` | Supabase Edge Function Secret (future) | Semaphore SMS API key |
| `TWILIO_ACCOUNT_SID` | Supabase Edge Function Secret (future) | Twilio SMS Account SID |
| `TWILIO_AUTH_TOKEN` | Supabase Edge Function Secret (future) | Twilio SMS Auth Token |

## Appendix C: Resend API Reference

```bash
# Send email via Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_EtuFRFUq_..." \
  -H "Content-Type: application/json" \
  -d '{
    "from": "BazaarPH <noreply@bazaarph.com>",
    "to": "buyer@example.com",
    "subject": "Your Order Receipt",
    "html": "<html>...</html>"
  }'

# Response (success):
# { "id": "msg_xxxxxxxx" }
```

---

*This document serves as the complete implementation blueprint for the BazaarPH Marketing Automation & Transactional Notification System. All phases should be implemented sequentially, with Phase 7 (sidebar integration) done first to provide navigation scaffolding.*
