# 📧 BazaarPH Email Automation Compliance Plan

> **Version:** 1.0  
> **Date:** June 2025  
> **Brand:** BazaarPH — Primary `#D97706` (Amber)  
> **Scope:** Align all email & SMS automation with Philippine regulations, Lazada/Shopee industry standards, and all 50 BazaarX Business Rules (BR-EMA-001 through BR-EMA-050)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Philippine Regulatory Requirements](#2-philippine-regulatory-requirements)
3. [Lazada & Shopee Industry Standards](#3-lazada--shopee-industry-standards)
4. [Current Implementation Status](#4-current-implementation-status)
5. [BazaarX Business Rules Gap Analysis](#5-bazaarx-business-rules-gap-analysis)
6. [Database Schema Modifications](#6-database-schema-modifications)
7. [Edge Function Modifications](#7-edge-function-modifications)
8. [Email Template Standards](#8-email-template-standards)
9. [Contact Validation & Suppression](#9-contact-validation--suppression)
10. [Consent Management System](#10-consent-management-system)
11. [Campaign Approval Workflow](#11-campaign-approval-workflow)
12. [SLA & Monitoring](#12-sla--monitoring)
13. [Role-Based Access Control](#13-role-based-access-control)
14. [Implementation Phases](#14-implementation-phases)
15. [Testing & Verification](#15-testing--verification)

---

## 1. Executive Summary

BazaarPH currently has **15 transactional email functions**, **9 seeded templates** (7 more in migration 023), a Resend-powered `send-email` edge function with admin toggle gating, and `email_logs` for audit logging.

**What's Missing (Critical Gaps):**

| Gap Area | BRD Rules Affected | Priority |
|----------|-------------------|----------|
| Message categorization | BR-EMA-001 | 🔴 Critical |
| Marketing consent tracking | BR-EMA-003, 004, 033–035 | 🔴 Critical |
| Quiet hours enforcement | BR-EMA-005 | 🟡 High |
| Frequency limits | BR-EMA-006 | 🟡 High |
| Email retry logic (3x) | BR-EMA-019 | 🔴 Critical |
| Bounce suppression (hard/soft) | BR-EMA-021, 030–032 | 🔴 Critical |
| Contact validation | BR-EMA-027–029 | 🟡 High |
| Legal footer on marketing | BR-EMA-018 | 🔴 Critical |
| Template approval workflow | BR-EMA-015–016 | 🟡 High |
| Campaign approval workflow | BR-EMA-036–038 | 🟡 High |
| Consent timestamp logging | BR-EMA-033–035 | 🔴 Critical |
| Suppression/blacklist | BR-EMA-039–041 | 🟡 High |
| Delivery SLAs | BR-EMA-042–044 | 🟢 Medium |
| Incident escalation | BR-EMA-045–047 | 🟢 Medium |
| RBAC for automation | BR-EMA-048–050 | 🟡 High |

---

## 2. Philippine Regulatory Requirements

### 2a. Republic Act No. 10173 — Data Privacy Act of 2012

The **Data Privacy Act (DPA)** is the primary regulation governing email communications in the Philippines. Enforced by the **National Privacy Commission (NPC)**.

| Requirement | Description | BazaarPH Impact |
|-------------|-------------|-----------------|
| **Lawful Basis for Processing** | Personal data (email addresses) can only be collected and processed with explicit consent or for contractual necessity. | Transactional emails (order confirmations, etc.) are permitted without marketing consent under "contractual necessity." Marketing emails require explicit opt-in. |
| **Consent Must Be Freely Given** | Consent for marketing emails cannot be a condition of service. Must be a separate, affirmative action. | Registration flow must have a **separate, unchecked** marketing consent checkbox. Cannot bundle with Terms of Service acceptance. |
| **Right to Object / Unsubscribe** | Data subjects have the right to object to processing at any time, including withdrawal of consent. | Every marketing email must include a **one-click unsubscribe link**. System must honor opt-out within **10 business days** (NPC standard, aim for instant). |
| **Data Minimization** | Only collect data necessary for the stated purpose. | Emails should only reference order/payment data relevant to the notification. No unnecessary personal data in email body. |
| **Security of Processing** | Adequate safeguards for personal data during transmission and storage. | Use TLS-encrypted email delivery (Resend uses TLS). Store email logs with restricted access. |
| **Notification of Breach** | NPC and affected individuals must be notified within 72 hours of a data breach. | If email logs or user data are breached, automated incident alerting must trigger. |
| **Retention Limits** | Personal data should only be retained as long as necessary. | Email logs retained for **12 months** per BR-EMA-024, then purged or anonymized. |

### 2b. Republic Act No. 10175 — Cybercrime Prevention Act of 2012

| Requirement | BazaarPH Impact |
|-------------|-----------------|
| **Anti-Spam Provisions** | Mass commercial emails without consent constitute an offense under cybercrime law. Marketing campaigns require explicit opt-in. |
| **Computer-Related Fraud** | Misleading email content (phishing-style) is criminal. All BazaarPH emails must clearly identify the sender as BazaarPH with no deceptive subject lines. |

### 2c. NPC Advisory Opinions (Relevant)

| Advisory | Key Guidance |
|----------|-------------|
| **NPC Advisory No. 2018-038** | Unsubscribe mechanism must be **clearly visible** and **functional within 10 business days** of request. |
| **NPC Advisory No. 2017-055** | Marketing consent must be **separate from service agreement**. Pre-ticked checkboxes do not constitute valid consent. |
| **NPC Advisory on Breach Notification** | Personal information controllers must notify NPC within 72 hours; affected data subjects within a "reasonable time." |

### 2d. BIR (Bureau of Internal Revenue) Requirements

| Requirement | BazaarPH Impact |
|-------------|-----------------|
| **Electronic Receipts** | Digital receipts sent via email are acceptable as supplementary proof of purchase but are **not valid for claiming input tax**. Must include disclaimer. |
| **Required Receipt Elements** | Receipt must show: seller name, buyer name, date, items, amounts, payment method. Our digital receipt template already includes all of these. |
| **Disclaimer** | Must include: *"This document is not valid for claiming of input tax."* — Already present in our receipt template. |

### 2e. Philippine Format Standards

| Element | Standard | Example |
|---------|----------|---------|
| **Currency** | Philippine Peso — ₱ prefix, 2 decimal places, comma grouping | ₱1,447.00 |
| **Date Format** | Month Day, Year — or DD/MM/YYYY (Filipino standard) | March 19, 2026 |
| **Time Format** | 12-hour with AM/PM | 2:30 PM |
| **Phone Numbers** | E.164 format: +63XXXXXXXXXX (10 digits after +63) | +639171234567 |
| **Address Format** | Unit/Floor, Building, Street, Barangay, City, Province, ZIP | Unit 5A, Vista Mall, Rizal Ave., Brgy. San Isidro, Makati City, Metro Manila, 1200 |
| **Names** | Filipino names may include "dela Cruz", "de los Santos" — handle multi-word surnames | Juan dela Cruz |

---

## 3. Lazada & Shopee Industry Standards

### 3a. Transactional Email Patterns (Must Match)

Philippine buyers expect the **Lazada/Shopee standard** email flow. BazaarPH must match or exceed this:

| # | Trigger | Lazada Pattern | Shopee Pattern | BazaarPH Status |
|---|---------|---------------|----------------|-----------------|
| 1 | **Order Placed** | Immediate confirmation with order summary + item images | Receipt-style email with itemized breakdown | ✅ `order_receipt` template |
| 2 | **Payment Confirmed** | Separate payment receipt, payment method shown | Combined with order confirmation or separate | ✅ `payment_received` template |
| 3 | **Seller Confirmed** | "Seller is preparing your order" | "Seller is packing your parcel" | ✅ `order_confirmed` template |
| 4 | **Ready to Ship** | "Your parcel is packed and waiting for courier" | "Parcel is ready to ship" | ✅ `order_ready_to_ship` (migration 023) |
| 5 | **Shipped / In Transit** | Tracking number + courier name + tracking link | Same, with estimated delivery date | ✅ `order_shipped` template |
| 6 | **Out for Delivery** | "Your parcel is out for delivery today" | "Driver is on the way" | ✅ `order_out_for_delivery` (migration 023) |
| 7 | **Delivered** | "Parcel delivered" + prompt to rate | "Order received" + rate seller/product | ✅ `order_delivered` template |
| 8 | **Failed Delivery** | "Delivery failed — reschedule or contact" | "Unable to deliver — action required" | ✅ `order_failed_delivery` (migration 023) |
| 9 | **Cancelled** | Cancellation reason + refund timeline | Same with refund estimate | ✅ `order_cancelled` template |
| 10 | **Returned** | Return accepted + refund timeline | Return processed notification | ✅ `order_returned` (migration 023) |
| 11 | **Refund Processed** | Refund amount + method + 3-7 day timeline | Same | ✅ `refund_processed` template |
| 12 | **Payment Failed** | "Payment unsuccessful — retry or try another method" | Same with retry CTA | ✅ `payment_failed` (migration 023) |

### 3b. Email Design Standards (Lazada/Shopee Pattern)

| Element | Industry Standard | BazaarPH Implementation |
|---------|-------------------|------------------------|
| **Header** | Brand logo + brand color gradient | Amber `#D97706` gradient header with BazaarPH wordmark |
| **Subject Line** | Order number always included, emoji for key events | ✅ Already follows this pattern |
| **Peso Format** | ₱ symbol, comma-separated, 2 decimals | ✅ Using `₱{{amount}}` format |
| **CTA Button** | Single prominent action button per email | ✅ Each template has one CTA |
| **Tracking Section** | Courier name, tracking number, clickable tracking link | ✅ Included in shipped/out_for_delivery emails |
| **Footer** | Company name, address, support link, unsubscribe (marketing only) | ⚠️ **Needs standardization** — missing legal footer on marketing emails |
| **Mobile Responsive** | Single-column layout, 600px max-width | ✅ Templates use max-width:600px |
| **Estimated Delivery** | Always shown after shipment | ⚠️ Need to ensure this variable is populated |
| **Rate/Review Prompt** | Post-delivery email includes rating CTA | ✅ Delivered email includes "Leave a Review" CTA |

### 3c. Timing Standards (Lazada/Shopee Benchmark)

| Event | Expected Timing | BRD Requirement |
|-------|----------------|-----------------|
| Order placed → Receipt email | Within **60 seconds** | BR-EMA-042: 60-second SLA |
| Payment confirmed → Payment email | Within **60 seconds** | BR-EMA-042 |
| Status change → Notification | Within **60 seconds** | BR-EMA-042 |
| Marketing campaign → Delivery | Within scheduled window ±5 min | BR-EMA-043 |
| Unsubscribe → Effect | **Immediate** (PH law: max 10 business days) | BR-EMA-004 |

### 3d. Marketing Email Standards

| Feature | Lazada | Shopee | BazaarPH Plan |
|---------|--------|--------|---------------|
| **Opt-in** | Separate checkbox during registration | Same | ❌ **Must add** — separate marketing consent checkbox |
| **Frequency** | 2-3 per week max | 2-3 per week max | BR-EMA-006: Email ≤3/week, SMS ≤2/week |
| **Quiet Hours** | No emails 9 PM – 8 AM | Similar | BR-EMA-005: 21:00-08:00 restriction |
| **Unsubscribe** | One-click footer link | Same | BR-EMA-004/018: Must include in every marketing email |
| **Personalization** | Name, recommended products | Name, browsing history | BR-EMA-017: Validate variables before send |

---

## 4. Current Implementation Status

### 4a. What's Working ✅

| Component | Status | Notes |
|-----------|--------|-------|
| `send-email` edge function | ✅ Deployed | Resend API, notification_settings gate, email_logs |
| `send-sms` edge function | ✅ Deployed | Noop mode (no SMS provider yet) |
| `emailService.ts` | ✅ Complete | Template fetch, variable rendering, XSS escaping |
| `transactionalEmails.ts` | ✅ 15 functions | All order lifecycle + payment + refund + welcome |
| `orderNotificationService.ts` | ✅ Wired | Chat + push + email dispatch on status change |
| `receiptService.ts` | ✅ Created | Receipt number gen, order data fetch, HTML builder |
| `email_templates` table | ✅ 9 seeded (+ 7 in migration 023) | 16 total templates |
| `notification_settings` table | ✅ Active | Per-channel, per-event toggle |
| `email_logs` table | ✅ Logging | Status: queued/sent/delivered/bounced/failed/disabled |
| BazaarPH branding | ✅ Fixed | All templates use `#D97706` amber (migration 023 fixes old `#FF6A00`) |
| Digital receipt | ✅ Designed | ₱ format, BIR disclaimer, receipt number |

### 4b. What's Missing ❌

| Component | BRD Rules | Status |
|-----------|-----------|--------|
| Message category field | BR-EMA-001 | ❌ No `category` column on email dispatch |
| Marketing consent system | BR-EMA-003, 004, 033–035 | ❌ No consent table, no opt-in tracking |
| Quiet hours enforcement | BR-EMA-005 | ❌ Not implemented |
| Frequency limiting | BR-EMA-006 | ❌ Not implemented |
| Template approval workflow | BR-EMA-015, 016 | ❌ No approval_status/version columns |
| Legal footer auto-append | BR-EMA-018 | ❌ No footer enforcement |
| Email retry logic (3x) | BR-EMA-019 | ❌ Edge function fails once and stops |
| Bounce suppression | BR-EMA-021, 030–032 | ❌ No bounce tracking/suppression |
| Queue during downtime | BR-EMA-022 | ❌ No message queue |
| Log retention policy | BR-EMA-024 | ❌ No auto-purge |
| Contact validation | BR-EMA-027–029 | ❌ No email/phone validation |
| Campaign approval flow | BR-EMA-036–038 | ❌ No approval states on campaigns |
| Suppression/blacklist | BR-EMA-039–041 | ❌ No suppression_list table |
| Delivery SLA monitoring | BR-EMA-042–044 | ❌ No timing measurement |
| Provider failure escalation | BR-EMA-045–047 | ❌ No alerting |
| RBAC for automation | BR-EMA-048–050 | ❌ No role gates on settings |

---

## 5. BazaarX Business Rules Gap Analysis

### Complete mapping of all 50 rules to current status:

#### Section A: Rule Classification & Communication Governance

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-001 | Communication Categorization | ❌ | No category field on dispatch | Add `category` column to `email_logs`; require category on every `send-email` call |
| BR-EMA-002 | Mandatory Transactional Delivery | ✅ | Transactional emails bypass marketing suppression | Already handled — `notification_settings` gates by event_type, transactional events always enabled |
| BR-EMA-003 | Marketing Consent Requirement | ❌ | No consent tracking | Create `user_consent` table; check consent before marketing sends |
| BR-EMA-004 | Unsubscribe Enforcement | ❌ | No unsubscribe mechanism | Add unsubscribe endpoint + link in marketing emails |
| BR-EMA-005 | Quiet Hours Restriction | ❌ | No time-based gating | Add quiet hours check (21:00–08:00 PHT) in edge function for marketing emails |
| BR-EMA-006 | Frequency Limitation | ❌ | No rate tracking | Add weekly send count query before marketing dispatch |

#### Section B: Transactional Automation Rules

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-007 | Order Confirmation Notification | ✅ | — | `sendOrderReceiptEmail()` triggers on order creation |
| BR-EMA-008 | Payment Confirmation Notification | ✅ | — | `sendPaymentReceivedEmail()` triggers on payment |
| BR-EMA-009 | Shipment Notification | ✅ | — | `sendOrderShippedEmail()` includes tracking details |
| BR-EMA-010 | Delivery Notification | ✅ | — | `sendOrderDeliveredEmail()` on delivery |
| BR-EMA-011 | Refund Notification | ✅ | — | `sendRefundProcessedEmail()` on refund |
| BR-EMA-012 | Security Notification | ⚠️ Partial | Password reset exists (Supabase Auth), but no suspicious login alert | Add suspicious login detection + email; Supabase Auth handles password reset natively |

#### Section C: OTP & Security Rules

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-013 | OTP Validity (5 min) | ✅ | Handled by Supabase Auth | Supabase Auth OTP expires per project config |
| BR-EMA-014 | OTP Retry Limitation | ✅ | Supabase Auth rate limiting | Verify rate limit config in Supabase dashboard |

#### Section D: Template Governance & Content Control

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-015 | Template Approval Requirement | ❌ | No approval workflow | Add `approval_status` column to `email_templates` (draft/pending/approved/rejected) |
| BR-EMA-016 | Template Version Control | ❌ | No version history | Create `email_template_versions` table |
| BR-EMA-017 | Personalization Validation | ⚠️ Partial | Template rendering doesn't validate required variables | Add required variable check before send in `emailService.renderTemplate()` |
| BR-EMA-018 | Legal Footer Inclusion | ❌ | No auto-appended footer for marketing | Auto-append legal footer with unsubscribe link for `category='marketing'` |

#### Section E: Delivery & Failure Handling

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-019 | Email Retry Logic (3x) | ❌ | Single attempt then fail | Add retry loop in `send-email` edge function (3 attempts, exponential backoff) |
| BR-EMA-020 | SMS Retry Logic (1x) | ❌ | No retry | Add single retry in `send-sms` edge function |
| BR-EMA-021 | Bounce Suppression (3 hard) | ❌ | No bounce tracking | Create `bounce_logs` table; suppress after 3 hard bounces |
| BR-EMA-022 | Queue During Downtime | ❌ | No queue system | Use Supabase `pgmq` extension or custom queue table |

#### Section F: Logging, Audit & Compliance

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-023 | Communication Logging | ✅ | — | `email_logs` table captures all sends |
| BR-EMA-024 | Log Retention (12 months) | ❌ | No auto-purge | Add scheduled function/cron to purge logs older than 12 months |
| BR-EMA-025 | Data Privacy Compliance | ⚠️ Partial | Logging exists but no consent enforcement | Implement consent checks per Section A gap |
| BR-EMA-026 | Performance Monitoring | ❌ | No open/click tracking | Add Resend webhook for open/click events; store in `email_events` table |

#### Section G: Contact Validation

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-027 | Contact Format Validation | ❌ | No pre-send validation | Add email regex + phone E.164 validation before dispatch |
| BR-EMA-028 | Invalid Contact Blocking | ❌ | No blocking | Query suppression status before send |
| BR-EMA-029 | Country Code Standardization | ❌ | No phone normalization | Add PH phone normalization (+63 prefix, strip leading 0) |

#### Section H: Bounce Suppression Enhancement

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-030 | Hard Bounce → Immediate suppress | ❌ | No bounce handling | Mark contact invalid on hard bounce via Resend webhook |
| BR-EMA-031 | Soft Bounce → Retry first | ❌ | No soft bounce logic | Retry per BR-EMA-019, then flag if persistent |
| BR-EMA-032 | Soft-to-Hard Conversion (3x) | ❌ | No conversion logic | After 3 consecutive soft bounces, convert to hard suppress |

#### Section I: Consent Timestamp Logging

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-033 | Consent Timestamp Logging | ❌ | No consent records | `user_consent` table with `opted_in_at`, `opted_out_at` |
| BR-EMA-034 | Consent Source Tracking | ❌ | No source field | Add `consent_source` column (signup, campaign, manual) |
| BR-EMA-035 | Immutable Consent Records | ❌ | No immutability | Use append-only `consent_log` table (INSERT only, no UPDATE/DELETE) |

#### Section J: Campaign Approval Workflow

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-036 | Campaign Approval | ❌ | No approval states | Add `approval_status` to `marketing_campaigns` |
| BR-EMA-037 | Scheduled Campaign Lock | ❌ | No lock mechanism | Prevent edits when `status='scheduled'` |
| BR-EMA-038 | Emergency Campaign Suspension | ❌ | No suspend action | Add `suspended` status + admin action |

#### Section K: Blacklist / Suppression List Governance

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-039 | Global Suppression List | ❌ | No table | Create `suppression_list` table |
| BR-EMA-040 | Manual Blacklisting | ❌ | No admin UI | Add blacklist action in Admin CRM |
| BR-EMA-041 | Suppression Override Restriction | ❌ | No enforcement | Check suppression_list before ALL sends (even if consented) |

#### Section L: SLA & Delivery Time Standards

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-042 | Transactional SLA (60s) | ⚠️ Partial | Emails fire on status change but no timing measurement | Log `queued_at` and `sent_at` timestamps; alert if >60s |
| BR-EMA-043 | Marketing Delivery Window (±5 min) | ❌ | No scheduled dispatch | Implement campaign scheduler with timing validation |
| BR-EMA-044 | Queue Threshold Alert | ❌ | No queue monitoring | Add queue depth check + admin alert |

#### Section M: Escalation & Incident Handling

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-045 | Provider Failure Escalation | ❌ | No alerting | Monitor failure rate; alert DevOps when >threshold |
| BR-EMA-046 | Domain Reputation Monitoring | ❌ | No monitoring | Track bounce rate; alert if >5% |
| BR-EMA-047 | Incident Logging | ⚠️ Partial | Error logs exist in edge function | Formalize with `incident_log` table |

#### Section N: Role-Based Access Control

| Rule | Title | Status | Gap | Action Required |
|------|-------|--------|-----|-----------------|
| BR-EMA-048 | Role Restriction Enforcement | ❌ | No role checks on automation settings | Add RLS policies; validate `user_role` on notification_settings mutations |
| BR-EMA-049 | Log Immutability | ⚠️ Partial | No UPDATE/DELETE on email_logs but not enforced via RLS | Add RLS: `INSERT` only for service role; `SELECT` for admin |
| BR-EMA-050 | Seller Limitation | ❌ | Sellers can potentially access settings | RLS: Block seller role from notification_settings, email_templates |

---

## 6. Database Schema Modifications

### 6a. New Tables

#### `user_consent` — Marketing Consent Tracking (BR-EMA-003, 004, 033, 034)

```sql
CREATE TABLE user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  is_consented BOOLEAN NOT NULL DEFAULT false,
  consent_source TEXT NOT NULL CHECK (
    consent_source IN ('signup', 'settings', 'campaign', 'admin')
  ),
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- Index for fast consent checks
CREATE INDEX idx_user_consent_lookup ON user_consent(user_id, channel, is_consented);
```

#### `consent_log` — Immutable Consent History (BR-EMA-035)

```sql
CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutability: No UPDATE or DELETE policies
-- RLS: Only service_role can INSERT; admin can SELECT
```

#### `bounce_logs` — Bounce Tracking (BR-EMA-021, 030–032)

```sql
CREATE TABLE bounce_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  bounce_type TEXT NOT NULL CHECK (bounce_type IN ('hard', 'soft')),
  reason TEXT,
  resend_event_id TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bounce_logs_email ON bounce_logs(email, bounce_type, logged_at);
```

#### `suppression_list` — Global Suppression (BR-EMA-039–041)

```sql
CREATE TABLE suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,                  -- email or phone
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
  reason TEXT NOT NULL CHECK (
    reason IN ('hard_bounce', 'soft_bounce_converted', 'unsubscribed', 'manual_blacklist', 'spam_complaint')
  ),
  suppressed_by UUID REFERENCES auth.users(id),  -- NULL = system
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact, contact_type)
);

CREATE INDEX idx_suppression_lookup ON suppression_list(contact, contact_type);
```

#### `email_template_versions` — Template History (BR-EMA-016)

```sql
CREATE TABLE email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version_number)
);
```

#### `email_events` — Resend Webhook Events (BR-EMA-026)

```sql
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES email_logs(id),
  resend_message_id TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'complained')
  ),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_events_message ON email_events(resend_message_id);
```

### 6b. Column Additions to Existing Tables

#### `email_logs` — Add category + timing (BR-EMA-001, 042)

```sql
ALTER TABLE email_logs ADD COLUMN category TEXT CHECK (
  category IN ('transactional', 'security', 'marketing')
);
ALTER TABLE email_logs ADD COLUMN queued_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE email_logs ADD COLUMN sent_at TIMESTAMPTZ;
ALTER TABLE email_logs ADD COLUMN retry_count INTEGER DEFAULT 0;
```

#### `email_templates` — Add approval workflow (BR-EMA-015)

```sql
ALTER TABLE email_templates ADD COLUMN approval_status TEXT
  DEFAULT 'approved' CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected')
  );
ALTER TABLE email_templates ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE email_templates ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE email_templates ADD COLUMN version INTEGER DEFAULT 1;
```

#### `marketing_campaigns` — Add approval + suspension (BR-EMA-036–038)

```sql
ALTER TABLE marketing_campaigns ADD COLUMN approval_status TEXT
  DEFAULT 'draft' CHECK (
    approval_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'suspended')
  );
ALTER TABLE marketing_campaigns ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE marketing_campaigns ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE marketing_campaigns ADD COLUMN scheduled_at TIMESTAMPTZ;
ALTER TABLE marketing_campaigns ADD COLUMN locked BOOLEAN DEFAULT false;
```

### 6c. Row-Level Security Policies (BR-EMA-048–050)

```sql
-- email_logs: Read-only for admin; INSERT for service_role only
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_insert_service" ON email_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "email_logs_select_admin" ON email_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'super_admin')
    )
  );

-- No UPDATE or DELETE policies = immutable (BR-EMA-049)

-- notification_settings: Only admin can modify (BR-EMA-050)
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_admin_only" ON notification_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'super_admin')
    )
  );

-- consent_log: INSERT only, no update/delete (BR-EMA-035)
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_log_insert_only" ON consent_log
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "consent_log_read_admin" ON consent_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_role IN ('admin', 'super_admin')
    )
  );
```

---

## 7. Edge Function Modifications

### 7a. `send-email` — Enhanced Edge Function

The `send-email` edge function must be modified to enforce all dispatch-time business rules:

```
┌──────────────────────────────────────────────────────────┐
│                    send-email Flow (Enhanced)              │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  1. CATEGORIZE (BR-EMA-001)                               │
│     └─ Require `category` field (transactional/security/  │
│        marketing) — block dispatch if missing              │
│                                                            │
│  2. VALIDATE CONTACT (BR-EMA-027, 028)                    │
│     └─ Email regex validation                              │
│     └─ Check suppression_list — block if suppressed        │
│                                                            │
│  3. CHECK CONSENT (BR-EMA-003) — Marketing only           │
│     └─ Query user_consent WHERE channel='email'            │
│        AND is_consented=true                                │
│     └─ Skip for transactional/security (BR-EMA-002)       │
│                                                            │
│  4. CHECK QUIET HOURS (BR-EMA-005) — Marketing only       │
│     └─ If PHT 21:00–08:00 → queue, don't send             │
│                                                            │
│  5. CHECK FREQUENCY (BR-EMA-006) — Marketing only         │
│     └─ Count marketing emails sent this week               │
│     └─ If ≥3 → block                                      │
│                                                            │
│  6. CHECK NOTIFICATION SETTING (existing)                  │
│     └─ notification_settings.is_enabled for event_type     │
│                                                            │
│  7. VALIDATE TEMPLATE (BR-EMA-015, 017)                   │
│     └─ If using template: check approval_status='approved' │
│     └─ Validate required variables are present             │
│                                                            │
│  8. APPEND LEGAL FOOTER (BR-EMA-018) — Marketing only     │
│     └─ Auto-append unsubscribe link + legal disclosure     │
│                                                            │
│  9. SEND VIA RESEND with RETRY (BR-EMA-019)               │
│     └─ Attempt 1 → if fail → wait 5s → Attempt 2          │
│     └─ → if fail → wait 15s → Attempt 3                   │
│     └─ → if all fail → log as 'failed'                    │
│                                                            │
│  10. LOG (BR-EMA-023, 042)                                 │
│      └─ Log to email_logs with category, queued_at,        │
│         sent_at, retry_count                               │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### 7b. Retry Logic Implementation (BR-EMA-019)

```typescript
// Pseudocode for retry logic in send-email edge function
const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 5000, 15000]; // ms

let lastError = '';
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  if (attempt > 0) {
    await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
  }
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  
  if (res.ok) {
    // Log success with retry_count = attempt
    return { sent: true, retry_count: attempt };
  }
  
  lastError = await res.text();
  
  // Don't retry on 4xx (client errors) — only on 5xx (server errors)
  if (res.status < 500) break;
}
// All retries exhausted
// Log failure with retry_count = MAX_RETRIES
```

### 7c. New Edge Function: `email-webhook` — Resend Event Handler

```
Purpose: Receive Resend webhook events (delivered, bounced, opened, clicked, complained)
Endpoint: POST /functions/v1/email-webhook

Flow:
  1. Verify webhook signature (Resend signing secret)
  2. Parse event type
  3. INSERT into email_events table
  4. If event = 'bounced':
     a. INSERT into bounce_logs (hard or soft)
     b. If hard bounce → INSERT into suppression_list immediately (BR-EMA-030)
     c. If soft bounce → count consecutive soft bounces
        → If ≥3 → convert to hard, add to suppression_list (BR-EMA-032)
  5. If event = 'complained' → INSERT into suppression_list (spam_complaint)
```

### 7d. New Edge Function: `process-email-queue` — Quiet Hours Queue Processor

```
Purpose: Process marketing emails deferred due to quiet hours
Trigger: Supabase pg_cron — every 15 minutes between 08:00-21:00 PHT

Flow:
  1. Query email_logs WHERE status='queued' AND category='marketing'
  2. If current time is within permitted hours (08:00-21:00 PHT):
     a. For each queued email: dispatch via Resend
     b. Update status to 'sent' or 'failed'
  3. If still in quiet hours: skip
```

---

## 8. Email Template Standards

### 8a. BazaarPH Email Template Structure (Lazada/Shopee Standard)

Every BazaarPH email follows this structure:

```
┌─────────────────────────────────────────────────────┐
│  HEADER                                              │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Amber #D97706 gradient background              │ │
│  │  BazaarPH logo (white) — centered               │ │
│  │  Tagline: "Your Local Online Marketplace"       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  GREETING                                             │
│  Hi {{buyer_name}},                                  │
│                                                       │
│  MAIN CONTENT                                         │
│  [Status-specific content]                            │
│  ┌───────────────────────────────────────────────┐   │
│  │  Order Details Box (rounded, light bg)         │   │
│  │  Order #: {{order_number}}                     │   │
│  │  Date: {{order_date}}                          │   │
│  │  Items table (if applicable)                   │   │
│  │  Amounts in ₱ format                           │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  CTA BUTTON                                           │
│  ┌──────────────────────┐                             │
│  │  [Action Text]       │  — Amber #D97706 bg        │
│  └──────────────────────┘                             │
│                                                       │
│  FOOTER (Transactional)                               │
│  ─────────────────────────────────────────────        │
│  BazaarPH · Your Local Online Marketplace             │
│  Need help? Contact us at support@bazaar.ph           │
│  © 2025 BazaarPH. All rights reserved.               │
│                                                       │
│  FOOTER (Marketing — BR-EMA-018)                     │
│  ─────────────────────────────────────────────        │
│  BazaarPH · Your Local Online Marketplace             │
│  You received this because you opted in to            │
│  marketing emails from BazaarPH.                      │
│  [Unsubscribe] · [Manage Preferences]                │
│  BazaarPH, [Business Address, Philippines]            │
│  © 2025 BazaarPH. All rights reserved.               │
│  This email complies with RA 10173 (Data Privacy      │
│  Act) and RA 10175 (Cybercrime Prevention Act).       │
└─────────────────────────────────────────────────────┘
```

### 8b. Subject Line Standards (Matching Lazada/Shopee)

| Event | Subject Line Format | Example |
|-------|-------------------|---------|
| Order Placed | "Your BazaarPH Order Receipt — {{order_number}}" | Your BazaarPH Order Receipt — ORD-20260319 |
| Payment Confirmed | "Payment confirmed — ₱{{amount}}" | Payment confirmed — ₱1,447.00 |
| Seller Confirmed | "Your order {{order_number}} has been confirmed!" | Your order ORD-20260319 has been confirmed! |
| Ready to Ship | "Your order {{order_number}} is packed and ready!" | Your order ORD-20260319 is packed and ready! |
| Shipped | "Your order {{order_number}} is on its way! 📦" | Your order ORD-20260319 is on its way! 📦 |
| Out for Delivery | "Your order {{order_number}} is out for delivery! 🚚" | Your order ORD-20260319 is out for delivery! 🚚 |
| Delivered | "Your order {{order_number}} has been delivered! 🎉" | Your order ORD-20260319 has been delivered! 🎉 |
| Failed Delivery | "Delivery attempt failed for {{order_number}}" | Delivery attempt failed for ORD-20260319 |
| Cancelled | "Your order {{order_number}} has been cancelled" | Your order ORD-20260319 has been cancelled |
| Returned | "Return confirmed for {{order_number}}" | Return confirmed for ORD-20260319 |
| Refund | "Refund processed — ₱{{amount}}" | Refund processed — ₱1,447.00 |
| Partial Refund | "Partial refund of ₱{{amount}} for {{order_number}}" | Partial refund of ₱500.00 for ORD-20260319 |
| Payment Failed | "Payment failed for order {{order_number}}" | Payment failed for order ORD-20260319 |
| Welcome | "Welcome to BazaarPH! 🎉" | Welcome to BazaarPH! 🎉 |

### 8c. Philippine Format Requirements in Templates

| Element | Requirement | Implementation |
|---------|-------------|----------------|
| **Currency** | ₱ prefix, comma grouping, 2 decimal places | `formatAmount()` in `receiptService.ts` — e.g., `₱1,447.00` |
| **Dates** | Filipino-readable: "Month Day, Year at H:MM AM/PM" | `formatReceiptDate()` — e.g., "March 19, 2026 at 2:30 PM" |
| **Addresses** | Full PH format with barangay | Street, Barangay, City, Province, ZIP |
| **Phone** | +63 format, no leading zero | `+639171234567` not `09171234567` |
| **Receipt Disclaimer** | BIR requirement | *"This document is not valid for claiming of input tax."* |
| **Legal Footer** | DPA + Anti-Spam compliance | *"This email complies with RA 10173 and RA 10175."* |

### 8d. Branding Specifications

| Property | Value | Usage |
|----------|-------|-------|
| **Primary Color** | `#D97706` (Amber 600) | Header gradient, CTA buttons, accent borders |
| **Primary Dark** | `#B45309` (Amber 700) | CTA hover, header gradient end |
| **Accent Light** | `#FDE8C8` | Light backgrounds, info boxes |
| **Text Headline** | `#2D2522` | Main headings |
| **Text Body** | `#4A4A4A` | Body text |
| **Success Green** | `#16A34A` | Delivered status accent |
| **Error Red** | `#C53030` | Failed/cancelled status accent |
| **Font** | System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | All email text |
| **Logo** | White BazaarPH wordmark on amber background | Email header |
| **Max Width** | 600px | Email container (mobile responsive) |
| **Sender Name** | BazaarPH | `From: BazaarPH <no-reply@bazaar.ph>` |
| **Reply-To** | support@bazaar.ph | For customer replies |

---

## 9. Contact Validation & Suppression

### 9a. Email Validation (BR-EMA-027)

Before every email dispatch, validate the recipient address:

```typescript
// Validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}
```

### 9b. Phone Number Normalization (BR-EMA-029)

Philippine phone numbers must follow E.164 format:

```typescript
function normalizePHPhone(phone: string): string | null {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle formats: 09XX, 639XX, +639XX
  if (digits.startsWith('63') && digits.length === 12) {
    return `+${digits}`;          // Already E.164
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+63${digits.slice(1)}`; // Convert 09XX → +639XX
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return `+63${digits}`;         // Missing prefix
  }
  
  return null; // Invalid format
}
```

### 9c. Suppression Check Flow (BR-EMA-028, 039–041)

```
Before EVERY email send:
  1. Query suppression_list WHERE contact = recipient_email
     AND contact_type = 'email'
  2. If found → BLOCK send, log status='suppressed'
  3. If not found → proceed with send

Before EVERY marketing email:
  4. Also check user_consent WHERE user_id = X
     AND channel = 'email' AND is_consented = true
  5. If no consent → BLOCK send, log status='no_consent'
```

---

## 10. Consent Management System

### 10a. Registration Flow Modification

The user registration/signup flow must be modified to collect **separate** marketing consent:

```
┌─────────────────────────────────────────────┐
│  CREATE ACCOUNT                              │
│                                               │
│  Email: [_________________________]          │
│  Password: [_____________________]           │
│  First Name: [___________________]           │
│  Last Name: [____________________]           │
│                                               │
│  ☑ I agree to the Terms of Service           │ ← Required
│    and Privacy Policy                         │
│                                               │
│  ☐ I'd like to receive promotional           │ ← Optional, UNCHECKED
│    emails and offers from BazaarPH            │
│                                               │
│  [  Create Account  ]                         │
└─────────────────────────────────────────────┘
```

**Key Rules (Philippine DPA Compliance):**
- Marketing checkbox must be **separate** from Terms of Service
- Marketing checkbox must be **unchecked by default** (no pre-ticked)
- Consent language must be **clear and specific**
- Users must be able to change preference at any time from Settings

### 10b. Buyer Settings: Notification Preferences

Add a "Notification Preferences" section in buyer settings:

```
┌─────────────────────────────────────────────┐
│  NOTIFICATION PREFERENCES                    │
│                                               │
│  Transactional Notifications                  │
│  (Order updates, payment confirmations,       │
│   delivery status — these cannot be disabled) │
│  Email: ✅ Always On                          │
│  Push:  ✅ Always On                          │
│                                               │
│  Marketing & Promotions                       │
│  Email: [Toggle ON/OFF]                       │
│  SMS:   [Toggle ON/OFF]                       │
│  Push:  [Toggle ON/OFF]                       │
│                                               │
│  Last updated: March 19, 2026 at 2:30 PM    │
│                                               │
│  [Save Preferences]                           │
└─────────────────────────────────────────────┘
```

### 10c. Unsubscribe Flow (BR-EMA-004)

```
Marketing email footer contains:
  [Unsubscribe from marketing emails]
  ↓ clicks link
  GET /unsubscribe?token={{signed_jwt}}
  ↓
  1. Verify JWT token (contains user_id + channel)
  2. UPDATE user_consent SET is_consented = false, revoked_at = now()
  3. INSERT INTO consent_log (action='opt_out', source='email_link')
  4. Show confirmation page: "You've been unsubscribed from BazaarPH marketing emails."
  5. Include link to manage all preferences in app
```

---

## 11. Campaign Approval Workflow

### 11a. Campaign Lifecycle (BR-EMA-036–038)

```
   DRAFT                PENDING              APPROVED            SCHEDULED
  ┌──────┐  Submit   ┌──────────┐  Approve ┌──────────┐  Lock  ┌───────────┐
  │      │──────────▶│          │─────────▶│          │───────▶│           │
  │Draft │           │ Pending  │          │ Approved │        │ Scheduled │
  │      │◀──────────│ Approval │◀─────────│          │        │ (Locked)  │
  └──────┘  Reject   └──────────┘  Revert  └──────────┘        └─────┬─────┘
                                                                      │
                                                              Dispatch │
                                                                      ▼
                                                               ┌───────────┐
                                   SUSPENDED                   │  Sending  │
                                  ┌───────────┐                └─────┬─────┘
                                  │           │◀── Admin Suspend ────┘
                                  │ Suspended │                      │
                                  │           │                Complete
                                  └───────────┘                      ▼
                                                               ┌───────────┐
                                                               │ Completed │
                                                               └───────────┘
```

### 11b. Campaign Approval Rules

| Rule | Enforcement |
|------|-------------|
| Only Super Admin / Marketing Admin can approve campaigns | Role check on approval action |
| Scheduled campaigns are locked from editing (BR-EMA-037) | Block UPDATE when `locked=true` |
| Admin can suspend active campaigns immediately (BR-EMA-038) | Set `approval_status='suspended'`, halt dispatch |
| All campaign state changes are logged | INSERT into `campaign_audit_log` |

---

## 12. SLA & Monitoring

### 12a. Delivery SLA Requirements

| Category | SLA | Measurement | Alert Threshold |
|----------|-----|-------------|-----------------|
| Transactional | ≤60 seconds (BR-EMA-042) | `sent_at - queued_at` | >60s → alert |
| Marketing (scheduled) | Within ±5 min of schedule (BR-EMA-043) | `sent_at - scheduled_at` | >5 min deviation → alert |
| Queue depth | System-defined threshold (BR-EMA-044) | Count of `status='queued'` | >100 pending → alert |

### 12b. Monitoring Dashboard Metrics (BR-EMA-026, 042–044)

| Metric | Source | Display |
|--------|--------|---------|
| **Delivery Rate** | email_logs: sent / total | Percentage card |
| **Bounce Rate** | email_logs: bounced / total | Percentage card (alert if >5%) |
| **Open Rate** | email_events: opened / delivered | Percentage card (marketing only) |
| **Click Rate** | email_events: clicked / delivered | Percentage card (marketing only) |
| **Avg Delivery Time** | sent_at - queued_at | Seconds card |
| **Failure Rate** | email_logs: failed / total | Percentage card (alert if >2%) |
| **Queue Depth** | email_logs: COUNT WHERE status='queued' | Number card |
| **Suppression Count** | suppression_list: COUNT | Number card |

### 12c. Provider Failure Escalation (BR-EMA-045–046)

```
Monitoring Rules:
  - If failure rate > 10% in last 1 hour → ALERT DevOps
  - If bounce rate > 5% in last 24 hours → FLAG domain reputation review
  - If delivery rate < 80% in last 24 hours → ESCALATE to admin

Alert Channels:
  1. Admin notification in BazaarPH dashboard
  2. Email to DevOps team (separate alert email, not through BazaarPH system)
  3. (Future) Slack/Discord webhook integration
```

---

## 13. Role-Based Access Control

### 13a. Permission Matrix (BR-EMA-048–050)

| Resource | Super Admin | Admin | Marketing | Seller | Buyer |
|----------|------------|-------|-----------|--------|-------|
| notification_settings | Read/Write | Read/Write | Read | ❌ | ❌ |
| email_templates | Read/Write | Read/Write | Read | ❌ | ❌ |
| email_logs | Read | Read | Read (own campaigns) | ❌ | ❌ |
| consent_log | Read | Read | ❌ | ❌ | ❌ |
| suppression_list | Read/Write | Read/Write | Read | ❌ | ❌ |
| marketing_campaigns | Read/Write | Read/Write | Read/Write | ❌ | ❌ |
| Campaign approval | ✅ Approve | ✅ Approve | ❌ Submit only | ❌ | ❌ |
| Manual blacklist | ✅ | ✅ | ❌ | ❌ | ❌ |
| Template approval | ✅ Approve | ✅ Approve | ❌ Submit only | ❌ | ❌ |

### 13b. Seller Restrictions (BR-EMA-050)

Sellers are **completely blocked** from:
- Viewing or modifying `notification_settings`
- Editing `email_templates`
- Accessing `email_logs` or `consent_log`
- Modifying any transactional, security, or consent enforcement rules

This is enforced via **Supabase RLS policies** at the database level — no client-side bypass possible.

---

## 14. Implementation Phases

### Phase 1: Critical Compliance (Week 1-2) 🔴

**Goal:** Meet minimum regulatory requirements and core BRD rules.

| # | Task | BRD Rules | Files Affected |
|---|------|-----------|----------------|
| 1.1 | Create `user_consent` + `consent_log` tables | BR-EMA-003, 033–035 | New migration SQL |
| 1.2 | Create `bounce_logs` + `suppression_list` tables | BR-EMA-021, 030–032, 039 | New migration SQL |
| 1.3 | Add `category` column to `email_logs` | BR-EMA-001 | Migration SQL |
| 1.4 | Add `retry_count`, `queued_at`, `sent_at` columns | BR-EMA-019, 042 | Migration SQL |
| 1.5 | Update `send-email` edge function with categorization | BR-EMA-001 | `send-email/index.ts` |
| 1.6 | Add retry logic (3x with backoff) to `send-email` | BR-EMA-019 | `send-email/index.ts` |
| 1.7 | Add email validation before dispatch | BR-EMA-027 | `send-email/index.ts` |
| 1.8 | Add suppression check before dispatch | BR-EMA-028, 039–041 | `send-email/index.ts` |
| 1.9 | Add consent check for marketing emails | BR-EMA-003 | `send-email/index.ts` |
| 1.10 | Auto-append legal footer on marketing emails | BR-EMA-018 | `send-email/index.ts` |
| 1.11 | Add marketing consent checkbox to registration | BR-EMA-003 | Registration page/component |
| 1.12 | Add unsubscribe endpoint | BR-EMA-004 | New edge function |
| 1.13 | Add unsubscribe link to all marketing templates | BR-EMA-004, 018 | Email template HTML |
| 1.14 | Add RLS policies for email tables | BR-EMA-048–050 | Migration SQL |

### Phase 2: Delivery Reliability (Week 3-4) 🟡

**Goal:** Implement bounce handling, quiet hours, and frequency limits.

| # | Task | BRD Rules | Files Affected |
|---|------|-----------|----------------|
| 2.1 | Create `email-webhook` edge function for Resend events | BR-EMA-030–032 | New edge function |
| 2.2 | Configure Resend webhook in dashboard | BR-EMA-030 | Resend configuration |
| 2.3 | Implement hard bounce → suppression logic | BR-EMA-030 | `email-webhook/index.ts` |
| 2.4 | Implement soft bounce tracking + conversion | BR-EMA-031, 032 | `email-webhook/index.ts` |
| 2.5 | Add quiet hours check (21:00–08:00 PHT) | BR-EMA-005 | `send-email/index.ts` |
| 2.6 | Add frequency limit check (≤3 emails/week) | BR-EMA-006 | `send-email/index.ts` |
| 2.7 | Create `process-email-queue` edge function | BR-EMA-005 | New edge function |
| 2.8 | Add phone number normalization (E.164 / +63) | BR-EMA-029 | `send-sms/index.ts` |
| 2.9 | Add SMS retry logic (1x) | BR-EMA-020 | `send-sms/index.ts` |
| 2.10 | Add buyer notification preferences page | BR-EMA-004 | New React component |

### Phase 3: Template & Campaign Governance (Week 5-6) 🟡

**Goal:** Implement approval workflows and version control.

| # | Task | BRD Rules | Files Affected |
|---|------|-----------|----------------|
| 3.1 | Add `approval_status`, `version` to email_templates | BR-EMA-015 | Migration SQL |
| 3.2 | Create `email_template_versions` table | BR-EMA-016 | Migration SQL |
| 3.3 | Auto-version on template save | BR-EMA-016 | `emailService.ts` or admin page |
| 3.4 | Block unapproved templates from dispatch | BR-EMA-015 | `send-email/index.ts` |
| 3.5 | Validate required template variables before send | BR-EMA-017 | `emailService.ts` |
| 3.6 | Add `approval_status` to marketing_campaigns | BR-EMA-036 | Migration SQL |
| 3.7 | Implement campaign approval UI in Admin CRM | BR-EMA-036 | `AdminCRM.tsx` |
| 3.8 | Implement scheduled campaign lock | BR-EMA-037 | Admin CRM + DB trigger |
| 3.9 | Add emergency campaign suspension action | BR-EMA-038 | `AdminCRM.tsx` |

### Phase 4: Monitoring & Incident Handling (Week 7-8) 🟢

**Goal:** Complete SLA monitoring, alerting, and reporting.

| # | Task | BRD Rules | Files Affected |
|---|------|-----------|----------------|
| 4.1 | Create `email_events` table for open/click tracking | BR-EMA-026 | Migration SQL |
| 4.2 | Process Resend open/click webhooks | BR-EMA-026 | `email-webhook/index.ts` |
| 4.3 | Add delivery time SLA monitoring | BR-EMA-042 | Monitoring query/dashboard |
| 4.4 | Add queue depth alerting | BR-EMA-044 | Cron function or query |
| 4.5 | Add provider failure rate alerting | BR-EMA-045 | Monitoring function |
| 4.6 | Add domain reputation monitoring (bounce rate) | BR-EMA-046 | Monitoring query |
| 4.7 | Formalize incident logging | BR-EMA-047 | `incident_log` table |
| 4.8 | Set up 12-month log retention policy | BR-EMA-024 | Scheduled purge function |
| 4.9 | Build email analytics dashboard in Admin | BR-EMA-026 | New Admin page component |
| 4.10 | Manual blacklist UI in Admin CRM | BR-EMA-040 | `AdminCRM.tsx` |

---

## 15. Testing & Verification

### 15a. Compliance Verification Checklist

#### Philippine Regulatory Compliance

- [ ] Marketing emails are only sent to users with explicit consent (DPA RA 10173)
- [ ] Marketing consent checkbox is **separate** from Terms of Service acceptance
- [ ] Marketing consent checkbox is **unchecked by default**
- [ ] Every marketing email has a visible, functional **unsubscribe link**
- [ ] Unsubscribe takes effect **immediately** upon click
- [ ] Consent timestamps are recorded and immutable
- [ ] Email logs are retained for 12 months minimum
- [ ] Digital receipts include BIR disclaimer text
- [ ] All amounts use ₱ Philippine Peso format with 2 decimal places
- [ ] Dates follow Filipino-readable format (Month Day, Year)
- [ ] Phone numbers normalized to E.164 (+63XXXXXXXXXX)
- [ ] No personal data beyond what's necessary in email content (data minimization)

#### Lazada/Shopee Standard Compliance

- [ ] All 12 transactional order lifecycle emails are implemented
- [ ] Each email has a distinct, descriptive subject line with order number
- [ ] Shipped email includes tracking number, courier name, tracking link
- [ ] Delivered email includes review/rating CTA
- [ ] Payment email includes ₱ amount breakdown
- [ ] Refund email includes refund amount, method, and 3-5 day timeline
- [ ] Emails are mobile-responsive (600px max-width, single column)
- [ ] Brand header with BazaarPH amber (#D97706) gradient is consistent
- [ ] One clear CTA button per email

#### BazaarX Business Rules (BR-EMA-001 through BR-EMA-050)

**Section A — Governance:**
- [ ] BR-EMA-001: Every outgoing email is categorized (transactional/security/marketing)
- [ ] BR-EMA-002: Transactional emails bypass marketing suppression
- [ ] BR-EMA-003: Marketing emails blocked without active consent
- [ ] BR-EMA-004: Unsubscribe immediately updates consent status
- [ ] BR-EMA-005: Marketing emails deferred during 21:00-08:00 PHT
- [ ] BR-EMA-006: Marketing email frequency ≤3/week per user

**Section B — Transactional:**
- [ ] BR-EMA-007: Order confirmation sent within 60 seconds
- [ ] BR-EMA-008: Payment confirmation sent immediately
- [ ] BR-EMA-009: Shipment notification includes tracking details
- [ ] BR-EMA-010: Delivery notification sent on confirmation
- [ ] BR-EMA-011: Refund notification sent without delay
- [ ] BR-EMA-012: Security alerts sent immediately

**Section C — Security:**
- [ ] BR-EMA-013: OTP expires within 5 minutes
- [ ] BR-EMA-014: OTP limited to 5 attempts per hour

**Section D — Templates:**
- [ ] BR-EMA-015: Only approved templates can be used in dispatch
- [ ] BR-EMA-016: Template edits create version records
- [ ] BR-EMA-017: Missing required variables block dispatch
- [ ] BR-EMA-018: Marketing emails include legal footer + unsubscribe

**Section E — Delivery:**
- [ ] BR-EMA-019: Failed emails retried 3 times with backoff
- [ ] BR-EMA-020: Failed SMS retried once
- [ ] BR-EMA-021: 3 consecutive hard bounces → contact suppressed
- [ ] BR-EMA-022: Messages queued during service downtime

**Section F — Logging:**
- [ ] BR-EMA-023: All communications logged with full metadata
- [ ] BR-EMA-024: Logs retained for 12 months minimum
- [ ] BR-EMA-025: Consent tracking and data security enforced
- [ ] BR-EMA-026: Open rate, click rate, delivery rate tracked

**Section G — Contact Validation:**
- [ ] BR-EMA-027: Email format validated before send
- [ ] BR-EMA-028: Invalid contacts blocked from receiving emails
- [ ] BR-EMA-029: Phone numbers normalized to E.164 (+63) standard

**Section H — Bounce Suppression:**
- [ ] BR-EMA-030: Hard bounce → immediate suppression
- [ ] BR-EMA-031: Soft bounce → retry before suppression
- [ ] BR-EMA-032: 3 consecutive soft bounces → convert to hard suppression

**Section I — Consent Logging:**
- [ ] BR-EMA-033: Consent timestamps recorded for all opt-in/opt-out
- [ ] BR-EMA-034: Consent source tracked (signup/campaign/manual/settings)
- [ ] BR-EMA-035: Consent records are immutable (append-only)

**Section J — Campaign Approval:**
- [ ] BR-EMA-036: Marketing campaigns require approval before activation
- [ ] BR-EMA-037: Scheduled campaigns locked from editing
- [ ] BR-EMA-038: Admin can suspend active campaigns immediately

**Section K — Suppression List:**
- [ ] BR-EMA-039: Global suppression list maintained and enforced
- [ ] BR-EMA-040: Admin can manually blacklist contacts
- [ ] BR-EMA-041: Blacklisted contacts blocked even if consented

**Section L — SLA Standards:**
- [ ] BR-EMA-042: Transactional emails dispatched within 60 seconds
- [ ] BR-EMA-043: Marketing delivery within scheduled window ±5 minutes
- [ ] BR-EMA-044: Queue threshold alerts trigger admin notification

**Section M — Incident Handling:**
- [ ] BR-EMA-045: Provider failure spike → DevOps escalation
- [ ] BR-EMA-046: Domain reputation drop → compliance review flag
- [ ] BR-EMA-047: All automation incidents logged with timestamp

**Section N — RBAC:**
- [ ] BR-EMA-048: Automation controls restricted by role
- [ ] BR-EMA-049: Communication logs are read-only (no edit/delete)
- [ ] BR-EMA-050: Sellers blocked from modifying transactional/security/consent rules

### 15b. Test Scenarios

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Place order → check email received | Receipt email arrives within 60s |
| 2 | Update shipment status to each state | Correct email per status, correct subject line |
| 3 | Send marketing email to user without consent | Email blocked, logged as 'no_consent' |
| 4 | Send marketing email at 22:00 PHT | Email queued, delivered after 08:00 |
| 5 | Send 4th marketing email in same week | 4th email blocked, logged as 'frequency_exceeded' |
| 6 | Click unsubscribe link in marketing email | Consent revoked immediately, confirmation page shown |
| 7 | Trigger hard bounce via Resend | Contact added to suppression_list |
| 8 | 3 soft bounces for same email | Contact converted to hard suppression |
| 9 | Send email to suppressed contact | Email blocked, logged as 'suppressed' |
| 10 | Resend API returns 500 error | 3 retry attempts before marking failed |
| 11 | Seller tries to access notification_settings | Access denied (RLS policy) |
| 12 | Submit template without approval | Template cannot be used in dispatch |
| 13 | Try to edit scheduled campaign | Edit blocked (locked) |
| 14 | Admin suspends active campaign | Campaign immediately stops sending |
| 15 | Send email with invalid recipient format | Email blocked, logged as 'invalid_contact' |

---

## Appendix A: Philippine Legal References

| Law / Regulation | Full Title | Key Provision |
|-----------------|-----------|---------------|
| **RA 10173** | Data Privacy Act of 2012 | Consent, data minimization, breach notification, retention limits |
| **RA 10175** | Cybercrime Prevention Act of 2012 | Anti-spam, computer-related fraud |
| **IRR of RA 10173** | Implementing Rules and Regulations | Detailed consent requirements, security measures |
| **NPC Circular 2016-01** | Rules of Procedure of the NPC | Complaint handling, breach notification procedures |
| **NPC Circular 2016-03** | Personal Data Breach Management | 72-hour notification requirement |
| **BIR RR No. 18-2012** | Electronic Invoicing/Receipting | Requirements for electronic commercial documents |

## Appendix B: Resend Webhook Event Types

| Event | Description | BazaarPH Action |
|-------|-------------|-----------------|
| `email.sent` | Email accepted by Resend | Update email_logs.status = 'sent' |
| `email.delivered` | Email delivered to recipient's inbox | Update email_logs.status = 'delivered' |
| `email.opened` | Recipient opened the email | INSERT into email_events (opened) |
| `email.clicked` | Recipient clicked a link | INSERT into email_events (clicked) |
| `email.bounced` | Email bounced (hard or soft) | INSERT into bounce_logs; evaluate suppression |
| `email.complained` | Recipient marked as spam | INSERT into suppression_list (spam_complaint) |
| `email.delivery_delayed` | Temporary delivery issue | Log for monitoring |

## Appendix C: File Inventory

| File | Purpose | Modification Needed |
|------|---------|-------------------|
| `supabase/functions/send-email/index.ts` | Email dispatch edge function | Add categorization, retry, validation, consent, quiet hours, frequency, legal footer |
| `supabase/functions/send-sms/index.ts` | SMS dispatch edge function | Add retry (1x), phone validation |
| `supabase/functions/email-webhook/index.ts` | **NEW** — Resend event handler | bounce tracking, open/click tracking |
| `supabase/functions/process-email-queue/index.ts` | **NEW** — Quiet hours queue processor | Process deferred marketing emails |
| `supabase/functions/unsubscribe/index.ts` | **NEW** — Unsubscribe endpoint | Handle one-click unsubscribe |
| `web/src/services/emailService.ts` | Client-side email service | Add variable validation (BR-EMA-017) |
| `web/src/services/transactionalEmails.ts` | 15 transactional email functions | Add category field to all calls |
| `web/src/services/orderNotificationService.ts` | Order status → email dispatch | No changes needed (already wired) |
| `web/src/services/receiptService.ts` | Receipt generation | No changes needed |
| `web/src/pages/AdminNotificationSettings.tsx` | Admin toggle page | Add template approval UI |
| `web/src/pages/AdminCRM.tsx` | Admin CRM page | Add campaign approval, blacklist UI |
| Registration component | User signup | Add marketing consent checkbox |
| Buyer settings component | User preferences | Add notification preferences section |
| New migration SQL | Schema changes | All new tables, columns, RLS policies |

---

> **Document Status:** Ready for review  
> **Next Step:** Begin Phase 1 implementation — Critical Compliance  
> **Owner:** Development Team  
> **Reviewer:** Super Admin / Compliance Team
