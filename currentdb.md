## Table `_orphan_orders_audit_20260424`

PERMANENT FORENSIC RECORD — do not drop. Archived snapshot of all 54 orders that had no order_items rows as of 2026-04-24. 17 pending_payment rows were hard-deleted by migration 046 (abandoned carts). 20 paid + 17 refunded rows survived in public.orders. Migration 049 cleared the review flag from the 17 refunded rows (money-trail intact). The ~20 paid rows remain flagged with [ORPHAN_NEEDS_REVIEW_2026-04-24] in orders.notes until an admin manually reviews and closes each one.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `archived_at` | `timestamptz` |  |
| `reason` | `text` |  |
| `order_id` | `uuid` |  |
| `order_number` | `text` |  Nullable |
| `buyer_id` | `uuid` |  Nullable |
| `payment_status` | `text` |  Nullable |
| `shipment_status` | `text` |  Nullable |
| `order_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `full_row` | `jsonb` |  |
| `related_payments` | `jsonb` |  Nullable |
| `related_shipments` | `jsonb` |  Nullable |

## Table `admin_audit_logs`

Immutable audit trail for admin actions

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `admin_id` | `uuid` |  |
| `action` | `text` |  |
| `target_table` | `text` |  Nullable |
| `target_id` | `uuid` |  Nullable |
| `old_values` | `jsonb` |  Nullable |
| `new_values` | `jsonb` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `admin_notifications`

In-app notifications for admin role. Schema is intentionally identical to buyer_notifications and seller_notifications; the split is for RLS isolation against admins(id). Write via notificationService.notifyAdmin* (web/mobile). Do NOT query across notification tables; use the role-specific service method.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `admin_id` | `uuid` |  |
| `type` | `text` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `action_url` | `text` |  Nullable |
| `action_data` | `jsonb` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `priority` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `admin_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `data` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `uuid` |  Nullable |

## Table `admins`

Platform administrator data

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `permissions` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `ai_conversations`

AI chat conversation sessions

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `user_type` | `text` |  |
| `title` | `text` |  Nullable |
| `last_message_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `ai_messages`

Messages within AI conversations

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `conversation_id` | `uuid` |  |
| `sender` | `text` |  |
| `message` | `text` |  |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `admin_id` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `type` | `text` |  |
| `audience` | `text` |  |
| `image_url` | `text` |  Nullable |
| `action_url` | `text` |  Nullable |
| `action_data` | `jsonb` |  Nullable |
| `is_active` | `bool` |  |
| `scheduled_at` | `timestamptz` |  Nullable |
| `expires_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `automation_workflows`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `trigger_event` | `text` |  |
| `channels` | `jsonb` |  |
| `delay_minutes` | `int4` |  Nullable |
| `template_id` | `uuid` |  Nullable |
| `sms_template` | `text` |  Nullable |
| `is_enabled` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `bazcoin_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `amount` | `int4` |  |
| `balance_after` | `int4` |  |
| `reason` | `text` |  |
| `reference_id` | `uuid` |  Nullable |
| `reference_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `bounce_logs`

BR-EMA-021/030-032: Hard/soft bounce tracking. 3 consecutive soft → hard suppression.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `bounce_type` | `text` |  |
| `reason` | `text` |  Nullable |
| `resend_event_id` | `text` |  Nullable |
| `logged_at` | `timestamptz` |  |

## Table `buyer_notifications`

In-app notifications for buyer role. Schema is intentionally identical to seller_notifications and admin_notifications; the split is for RLS isolation against buyers(id). Write via notificationService.notifyBuyer* (web/mobile). Do NOT query across notification tables; use the role-specific service method.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `type` | `text` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `action_url` | `text` |  Nullable |
| `action_data` | `jsonb` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `priority` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `buyer_segments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `filter_criteria` | `jsonb` |  |
| `buyer_count` | `int4` |  Nullable |
| `is_dynamic` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `buyer_vouchers`

Buyer-claimed vouchers

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `voucher_id` | `uuid` |  |
| `valid_from` | `timestamptz` |  Nullable |
| `valid_until` | `timestamptz` |  Nullable |
| `usage_count` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `buyers`

Buyer-specific data - linked via user_roles

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `avatar_url` | `text` |  Nullable |
| `preferences` | `jsonb` |  Nullable |
| `bazcoins` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `cart_items`

Cart line items

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `cart_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `variant_id` | `uuid` |  Nullable |
| `quantity` | `int4` |  |
| `personalized_options` | `jsonb` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `carts`

Shopping cart

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  Nullable Unique |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `categories`

Hierarchical product category system

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `slug` | `text` |  Unique |
| `description` | `text` |  Nullable |
| `parent_id` | `uuid` |  Nullable |
| `icon` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `sort_order` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `is_active` | `bool` |  |

## Table `comment_upvotes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `comment_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `consent_log`

Append-only audit trail of consent grant/revoke events. Required for PH Data Privacy Act (RA 10173) compliance — proves WHEN a user changed consent and from WHERE (ip_address, user_agent). Complementary to user_consent which holds the CURRENT state per (user_id, channel). Never UPDATE or DELETE rows here.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `channel` | `text` |  |
| `action` | `text` |  |
| `source` | `text` |  |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `logged_at` | `timestamptz` |  |

## Table `contributor_tiers`

Gamification tiers for product_request comment upvoting (bc_multiplier). Distinct from seller_tiers (QA bypass) and buyer_segments (marketing audience).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `tier` | `text` |  |
| `max_upvotes` | `int4` |  |
| `bc_multiplier` | `numeric` |  |
| `updated_at` | `timestamptz` |  |

## Table `conversations`

Buyer-seller conversations

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `order_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `courier_rate_cache`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `courier_code` | `text` |  |
| `origin_city` | `varchar` |  |
| `destination_city` | `varchar` |  |
| `weight_kg` | `numeric` |  |
| `service_type` | `text` |  |
| `rate` | `numeric` |  |
| `estimated_days` | `int4` |  Nullable |
| `cached_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |

## Table `delivery_bookings`

3PL courier booking record (J&T, Lalamove, etc.) created when seller books a courier pickup. Complementary to order_shipments (the canonical per-(order, seller) shipment line created at checkout). Linked by (order_id, seller_id).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `buyer_id` | `uuid` |  |
| `courier_code` | `text` |  |
| `courier_name` | `text` |  |
| `service_type` | `text` |  |
| `booking_reference` | `text` |  Nullable |
| `tracking_number` | `text` |  Nullable |
| `waybill_url` | `text` |  Nullable |
| `pickup_address` | `jsonb` |  |
| `delivery_address` | `jsonb` |  |
| `package_weight` | `numeric` |  Nullable |
| `package_dimensions` | `jsonb` |  Nullable |
| `package_description` | `text` |  Nullable |
| `declared_value` | `numeric` |  Nullable |
| `shipping_fee` | `numeric` |  |
| `insurance_fee` | `numeric` |  Nullable |
| `cod_amount` | `numeric` |  Nullable |
| `is_cod` | `bool` |  Nullable |
| `status` | `text` |  |
| `booked_at` | `timestamptz` |  Nullable |
| `picked_up_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `estimated_delivery` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `delivery_tracking_events`

Courier-side tracking scans (delivery_booking_id, courier_status_code). Distinct from order_status_history (order-side admin/seller actions).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `delivery_booking_id` | `uuid` |  |
| `status` | `text` |  |
| `description` | `text` |  Nullable |
| `location` | `varchar` |  Nullable |
| `courier_status_code` | `varchar` |  Nullable |
| `event_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `discount_campaigns`

Seller PRICE-DISCOUNT campaigns (discount_value, badge, min_purchase_amount). Distinct from marketing_campaigns (email/SMS blasts). Do NOT merge.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `campaign_type` | `text` |  |
| `discount_type` | `text` |  |
| `discount_value` | `numeric` |  |
| `max_discount_amount` | `numeric` |  Nullable |
| `min_purchase_amount` | `numeric` |  |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  |
| `status` | `text` |  |
| `badge_text` | `text` |  Nullable |
| `badge_color` | `text` |  Nullable |
| `priority` | `int4` |  |
| `claim_limit` | `int4` |  Nullable |
| `per_customer_limit` | `int4` |  |
| `applies_to` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `campaign_scope` | `text` |  Nullable |

## Table `email_events`

BR-EMA-026: Resend webhook events for open/click/delivery tracking.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email_log_id` | `uuid` |  Nullable |
| `resend_message_id` | `text` |  Nullable |
| `event_type` | `text` |  |
| `metadata` | `jsonb` |  Nullable |
| `occurred_at` | `timestamptz` |  |

## Table `email_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `recipient_email` | `text` |  |
| `recipient_id` | `uuid` |  Nullable |
| `template_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `subject` | `text` |  |
| `status` | `text` |  |
| `resend_message_id` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `delivered_at` | `timestamptz` |  Nullable |
| `category` | `text` |  Nullable |
| `queued_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `retry_count` | `int4` |  Nullable |

## Table `email_template_versions`

BR-EMA-016: Every template modification creates a new version record.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `template_id` | `uuid` |  |
| `version_number` | `int4` |  |
| `subject` | `text` |  |
| `html_body` | `text` |  |
| `text_body` | `text` |  Nullable |
| `variables` | `jsonb` |  Nullable |
| `changed_by` | `uuid` |  Nullable |
| `change_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `email_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `subject` | `text` |  |
| `html_body` | `text` |  |
| `text_body` | `text` |  Nullable |
| `variables` | `jsonb` |  Nullable |
| `category` | `text` |  |
| `is_active` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `approval_status` | `text` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `version` | `int4` |  Nullable |

## Table `featured_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  Unique |
| `seller_id` | `uuid` |  |
| `is_active` | `bool` |  |
| `priority` | `int4` |  |
| `featured_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `flash_sale_submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slot_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `submitted_price` | `numeric` |  |
| `submitted_stock` | `int4` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `global_flash_sale_slots`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `start_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  |
| `min_discount_percentage` | `numeric` |  |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `inventory_movements`

Append-only stock change ledger. Every mutation of product_variants.stock should write a row here via decrement_stock_atomic / increment_stock RPC.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `variant_id` | `uuid` |  |
| `product_id` | `uuid` |  Nullable |
| `delta` | `int4` |  |
| `reason` | `text` |  |
| `order_id` | `uuid` |  Nullable |
| `actor_id` | `uuid` |  Nullable |
| `notes` | `text` |  Nullable |
| `metadata` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `low_stock_alerts`

Automated inventory alerts

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `threshold` | `int4` |  |
| `acknowledged` | `bool` |  |
| `acknowledged_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `marketing_campaigns`

Email/SMS MARKETING blasts to buyer_segments (segment_id, template_id, total_opened/clicked). Distinct from discount_campaigns (price reductions). Do NOT merge.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `campaign_type` | `text` |  |
| `status` | `text` |  |
| `segment_id` | `uuid` |  Nullable |
| `template_id` | `uuid` |  Nullable |
| `subject` | `text` |  Nullable |
| `content` | `text` |  Nullable |
| `sms_content` | `text` |  Nullable |
| `scheduled_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `total_recipients` | `int4` |  Nullable |
| `total_sent` | `int4` |  Nullable |
| `total_delivered` | `int4` |  Nullable |
| `total_opened` | `int4` |  Nullable |
| `total_clicked` | `int4` |  Nullable |
| `total_bounced` | `int4` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `approval_status` | `text` |  Nullable |
| `approved_by` | `uuid` |  Nullable |
| `approved_at` | `timestamptz` |  Nullable |
| `locked` | `bool` |  |
| `seller_id` | `uuid` |  Nullable |

## Table `messages`

Conversation messages

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `conversation_id` | `uuid` |  |
| `sender_id` | `uuid` |  Nullable |
| `sender_type` | `text` |  Nullable |
| `content` | `text` |  |
| `image_url` | `text` |  Nullable |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `message_type` | `message_type_enum` |  Nullable |
| `message_content` | `text` |  Nullable |
| `order_event_type` | `order_event_enum` |  Nullable |
| `media_url` | `text` |  Nullable |
| `media_type` | `text` |  Nullable |
| `reply_to_message_id` | `uuid` |  Nullable |
| `target_seller_id` | `uuid` |  Nullable |

## Table `notification_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `channel` | `text` |  |
| `event_type` | `text` |  |
| `is_enabled` | `bool` |  |
| `template_id` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `order_cancellations`

Order cancellation records

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `reason` | `text` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `cancelled_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `order_discounts`

Order discount applications

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `order_id` | `uuid` |  |
| `campaign_id` | `uuid` |  Nullable |
| `discount_amount` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `order_events`

Drives chat-message generation from order state changes (has conversation_id, message_generated). Distinct from order_status_history (full audit timeline) and delivery_tracking_events (courier scans). All three required.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `conversation_id` | `uuid` |  Nullable |
| `event_type` | `order_event_enum` |  |
| `message_generated` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `order_items`

Order line items

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `product_id` | `uuid` |  Nullable |
| `product_name` | `text` |  |
| `primary_image_url` | `text` |  Nullable |
| `price` | `numeric` |  |
| `price_discount` | `numeric` |  |
| `shipping_price` | `numeric` |  |
| `shipping_discount` | `numeric` |  |
| `quantity` | `int4` |  |
| `variant_id` | `uuid` |  Nullable |
| `personalized_options` | `jsonb` |  Nullable |
| `rating` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `warranty_expiration_date` | `timestamptz` |  Nullable |
| `warranty_start_date` | `timestamptz` |  Nullable |
| `warranty_type` | `warranty_type_enum` |  Nullable |
| `warranty_duration_months` | `int4` |  Nullable |
| `warranty_provider_name` | `text` |  Nullable |
| `warranty_provider_contact` | `text` |  Nullable |
| `warranty_provider_email` | `text` |  Nullable |
| `warranty_terms_url` | `text` |  Nullable |
| `warranty_claimed` | `bool` |  Nullable |
| `warranty_claimed_at` | `timestamptz` |  Nullable |
| `warranty_claim_reason` | `text` |  Nullable |
| `warranty_claim_status` | `text` |  Nullable |
| `warranty_claim_notes` | `text` |  Nullable |

## Table `order_payments`

Canonical 1-per-order payment record. Required for ALL orders (POS + ONLINE). Mobile and web checkout both insert here. UNIQUE(order_id) enforces the 1-per-order invariant. For external gateway tracking (PayMongo etc), see payment_transactions.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  Unique |
| `payment_method` | `jsonb` |  Nullable |
| `payment_reference` | `text` |  Nullable |
| `payment_date` | `timestamptz` |  Nullable |
| `amount` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `order_recipients`

Order recipient details

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `is_registry_recipient` | `bool` |  Nullable |

## Table `order_shipments`

Canonical per-(order, seller) shipment line created at checkout from the buyer's shipping breakdown. Complementary to delivery_bookings (the optional 3PL booking record added when a courier is engaged).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `shipping_method` | `text` |  |
| `shipping_method_label` | `text` |  |
| `calculated_fee` | `numeric` |  |
| `fee_breakdown` | `jsonb` |  |
| `origin_zone` | `text` |  |
| `destination_zone` | `text` |  |
| `estimated_days_text` | `text` |  |
| `chargeable_weight_kg` | `numeric` |  |
| `tracking_number` | `text` |  Nullable |
| `status` | `text` |  |
| `shipped_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `order_status_history`

Order timeline audit trail

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `status` | `text` |  |
| `note` | `text` |  Nullable |
| `changed_by` | `uuid` |  Nullable |
| `changed_by_role` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `order_vouchers`

Order voucher applications

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `order_id` | `uuid` |  |
| `voucher_id` | `uuid` |  |
| `discount_amount` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `orders`

Order master table

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_number` | `text` |  Unique |
| `buyer_id` | `uuid` |  Nullable |
| `order_type` | `text` |  |
| `pos_note` | `text` |  Nullable |
| `recipient_id` | `uuid` |  Nullable |
| `address_id` | `uuid` |  Nullable |
| `payment_status` | `text` |  |
| `shipment_status` | `text` |  |
| `paid_at` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `receipt_number` | `text` |  Nullable |
| `shipping_address_snapshot` | `jsonb` |  Nullable |
| `recipient_snapshot` | `jsonb` |  Nullable |
| `is_registry_order` | `bool` |  Nullable |
| `registry_id` | `uuid` |  Nullable |

## Table `payment_method_banks`

Bank transfer payment details

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `payment_method_id` | `uuid` | Primary |
| `bank_name` | `text` |  Nullable |
| `account_number_last4` | `text` |  Nullable |

## Table `payment_method_cards`

Card payment method details

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `payment_method_id` | `uuid` | Primary |
| `card_last4` | `text` |  Nullable |
| `card_brand` | `text` |  Nullable |
| `expiry_month` | `int4` |  Nullable |
| `expiry_year` | `int4` |  Nullable |

## Table `payment_method_wallets`

E-wallet payment method details

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `payment_method_id` | `uuid` | Primary |
| `e_wallet_provider` | `text` |  Nullable |
| `e_wallet_account_number` | `text` |  Nullable |

## Table `payment_methods`

Normalized payment methods

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `payment_type` | `text` |  |
| `label` | `text` |  |
| `is_default` | `bool` |  |
| `is_verified` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payment_transactions`

Gateway-attempt log. 0..N per order. Only created when an external payment gateway (PayMongo etc) is invoked. Contains gateway_*_id, escrow_status, gateway-specific metadata. Optional — not required for OFFLINE/POS or COD orders.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `buyer_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `gateway` | `text` |  |
| `gateway_payment_intent_id` | `text` |  Nullable |
| `gateway_payment_method_id` | `text` |  Nullable |
| `gateway_source_id` | `text` |  Nullable |
| `gateway_checkout_url` | `text` |  Nullable |
| `amount` | `numeric` |  |
| `currency` | `text` |  |
| `payment_type` | `text` |  |
| `status` | `text` |  |
| `description` | `text` |  Nullable |
| `statement_descriptor` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `failure_reason` | `text` |  Nullable |
| `paid_at` | `timestamptz` |  Nullable |
| `refunded_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `escrow_status` | `text` |  |
| `escrow_held_at` | `timestamptz` |  Nullable |
| `escrow_release_at` | `timestamptz` |  Nullable |
| `escrow_released_at` | `timestamptz` |  Nullable |

## Table `pos_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  Unique |
| `accept_cash` | `bool` |  Nullable |
| `accept_card` | `bool` |  Nullable |
| `accept_gcash` | `bool` |  Nullable |
| `accept_maya` | `bool` |  Nullable |
| `barcode_scanner_enabled` | `bool` |  Nullable |
| `sound_enabled` | `bool` |  Nullable |
| `multi_branch_enabled` | `bool` |  Nullable |
| `default_branch` | `text` |  Nullable |
| `tax_enabled` | `bool` |  Nullable |
| `tax_rate` | `numeric` |  Nullable |
| `tax_name` | `text` |  Nullable |
| `tax_inclusive` | `bool` |  Nullable |
| `receipt_header` | `text` |  Nullable |
| `receipt_footer` | `text` |  Nullable |
| `show_logo_on_receipt` | `bool` |  Nullable |
| `receipt_template` | `text` |  Nullable |
| `auto_print_receipt` | `bool` |  Nullable |
| `printer_type` | `text` |  Nullable |
| `cash_drawer_enabled` | `bool` |  Nullable |
| `default_opening_cash` | `numeric` |  Nullable |
| `staff_tracking_enabled` | `bool` |  Nullable |
| `require_staff_login` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `scanner_type` | `text` |  Nullable |
| `auto_add_on_scan` | `bool` |  Nullable |
| `logo_url` | `text` |  Nullable |
| `printer_name` | `text` |  Nullable |
| `enable_low_stock_alert` | `bool` |  Nullable |
| `low_stock_threshold` | `int4` |  Nullable |

## Table `product_ad_boosts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `boost_type` | `text` |  |
| `duration_days` | `int4` |  |
| `daily_budget` | `numeric` |  |
| `total_budget` | `numeric` |  |
| `cost_per_day` | `numeric` |  |
| `total_cost` | `numeric` |  |
| `currency` | `text` |  |
| `status` | `text` |  |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  |
| `paused_at` | `timestamptz` |  Nullable |
| `impressions` | `int4` |  |
| `clicks` | `int4` |  |
| `orders_generated` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `product_approvals`

Product approval events

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assessment_id` | `uuid` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |

## Table `product_assessment_logistics`

Assessment logistics and notes

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assessment_id` | `uuid` |  |
| `details` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |
| `logistics_method` | `text` |  Nullable |
| `courier_service` | `text` |  Nullable |
| `tracking_number` | `text` |  Nullable |
| `dropoff_date` | `date` |  Nullable |
| `dropoff_time` | `time` |  Nullable |
| `dropoff_slot` | `text` |  Nullable |
| `batch_id` | `uuid` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `product_assessments`

Quality assurance workflow

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  Unique |
| `status` | `text` |  |
| `submitted_at` | `timestamptz` |  |
| `verified_at` | `timestamptz` |  Nullable |
| `revision_requested_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `notes` | `text` |  Nullable |
| `admin_accepted_at` | `timestamptz` |  Nullable |
| `admin_accepted_by` | `uuid` |  Nullable |

## Table `product_discounts`

Product-specific discounts

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `campaign_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `discount_type` | `text` |  Nullable |
| `discount_value` | `numeric` |  Nullable |
| `sold_count` | `int4` |  |
| `priority` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `override_discount_type` | `text` |  Nullable |
| `override_discount_value` | `numeric` |  Nullable |

## Table `product_images`

Product images with ordering

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `image_url` | `text` |  |
| `alt_text` | `text` |  Nullable |
| `sort_order` | `int4` |  |
| `is_primary` | `bool` |  |
| `uploaded_at` | `timestamptz` |  |

## Table `product_rejections`

Per-assessment rejection record. Currently 0 rows (no products rejected yet) but actively written by qaService in web and mobile when admin rejects. Do NOT drop.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assessment_id` | `uuid` |  Nullable |
| `product_id` | `uuid` |  Nullable |
| `description` | `text` |  Nullable |
| `vendor_submitted_category` | `text` |  Nullable |
| `admin_reclassified_category` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |

## Table `product_request_comments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `type` | `text` |  |
| `content` | `text` |  |
| `is_admin_only` | `bool` |  |
| `bc_awarded` | `int4` |  |
| `upvotes` | `int4` |  |
| `admin_upvotes` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `product_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_name` | `text` |  |
| `description` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `requested_by_name` | `text` |  Nullable |
| `requested_by_id` | `uuid` |  Nullable |
| `votes` | `int4` |  |
| `comments_count` | `int4` |  |
| `status` | `text` |  |
| `priority` | `text` |  |
| `estimated_demand` | `int4` |  Nullable |
| `admin_notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `title` | `text` |  Nullable |
| `summary` | `text` |  Nullable |
| `sourcing_stage` | `text` |  Nullable |
| `demand_count` | `int4` |  |
| `staked_bazcoins` | `int4` |  |
| `linked_product_id` | `uuid` |  Nullable |
| `rejection_hold_reason` | `text` |  Nullable |
| `merged_into_id` | `uuid` |  Nullable |
| `converted_at` | `timestamptz` |  Nullable |
| `reward_amount` | `int4` |  |

## Table `product_revisions`

Product revision requests

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assessment_id` | `uuid` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |

## Table `product_tags`

Product tags

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `tag` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `product_variants`

Product variants with barcode support for POS

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `sku` | `text` |  Unique |
| `barcode` | `text` |  Nullable Unique |
| `variant_name` | `text` |  |
| `size` | `text` |  Nullable |
| `color` | `text` |  Nullable |
| `option_1_value` | `text` |  Nullable |
| `option_2_value` | `text` |  Nullable |
| `price` | `numeric` |  |
| `stock` | `int4` |  |
| `thumbnail_url` | `text` |  Nullable |
| `embedding` | `vector` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `products`

Main product catalog - fully normalized

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `category_id` | `uuid` |  |
| `brand` | `text` |  Nullable |
| `sku` | `text` |  Nullable Unique |
| `specifications` | `jsonb` |  Nullable |
| `approval_status` | `text` |  |
| `variant_label_1` | `text` |  Nullable |
| `variant_label_2` | `text` |  Nullable |
| `price` | `numeric` |  |
| `low_stock_threshold` | `int4` |  |
| `weight` | `numeric` |  Nullable |
| `dimensions` | `jsonb` |  Nullable |
| `is_free_shipping` | `bool` |  |
| `disabled_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `image_embedding` | `vector` |  Nullable |
| `seller_id` | `uuid` |  Nullable |
| `size_guide_image` | `text` |  Nullable |
| `has_warranty` | `bool` |  Nullable |
| `warranty_type` | `warranty_type_enum` |  Nullable |
| `warranty_duration_months` | `int4` |  Nullable |
| `warranty_policy` | `text` |  Nullable |
| `warranty_provider_name` | `text` |  Nullable |
| `warranty_provider_contact` | `text` |  Nullable |
| `warranty_provider_email` | `text` |  Nullable |
| `warranty_terms_url` | `text` |  Nullable |

## Table `profiles`

Base user profile table - all users have an entry here

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `last_login_at` | `timestamptz` |  Nullable |

## Table `push_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `token` | `text` |  Unique |
| `platform` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `qa_review_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `assessment_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `reviewer_id` | `uuid` |  |
| `action` | `text` |  |
| `notes` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `qa_submission_batch_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `batch_id` | `uuid` |  |
| `assessment_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `qa_submission_batches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  |
| `batch_code` | `text` |  Unique |
| `submission_type` | `text` |  |
| `status` | `text` |  |
| `notes` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `submitted_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `qa_team_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `display_name` | `text` |  Nullable |
| `specialization` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `max_concurrent_reviews` | `int4` |  |
| `permissions` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `refund_return_periods`

Return and refund policy records

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_id` | `uuid` |  Unique |
| `is_returnable` | `bool` |  |
| `return_window_days` | `int4` |  |
| `return_reason` | `text` |  Nullable |
| `refund_amount` | `numeric` |  Nullable |
| `refund_date` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `status` | `text` |  |
| `return_type` | `text` |  |
| `resolution_path` | `text` |  |
| `items_json` | `jsonb` |  Nullable |
| `evidence_urls` | `_text` |  Nullable |
| `description` | `text` |  Nullable |
| `seller_note` | `text` |  Nullable |
| `rejected_reason` | `text` |  Nullable |
| `counter_offer_amount` | `numeric` |  Nullable |
| `seller_deadline` | `timestamptz` |  Nullable |
| `escalated_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `uuid` |  Nullable |
| `return_label_url` | `text` |  Nullable |
| `return_tracking_number` | `text` |  Nullable |
| `buyer_shipped_at` | `timestamptz` |  Nullable |
| `return_received_at` | `timestamptz` |  Nullable |
| `resolution_source` | `text` |  Nullable |

## Table `registries`

Privacy-first gift registry

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `event_type` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `category` | `text` |  Nullable |
| `image_url` | `text` |  Nullable |
| `shared_date` | `text` |  Nullable |
| `privacy` | `text` |  |
| `delivery` | `jsonb` |  Nullable |

## Table `registry_items`

Registry wish items

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `registry_id` | `uuid` |  |
| `product_id` | `uuid` |  Nullable |
| `quantity_desired` | `int4` |  |
| `priority` | `text` |  |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `product_name` | `text` |  Nullable |
| `product_snapshot` | `jsonb` |  Nullable |
| `is_most_wanted` | `bool` |  |
| `received_qty` | `int4` |  |
| `requested_qty` | `int4` |  |
| `selected_variant` | `jsonb` |  Nullable |

## Table `request_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `uploaded_by` | `uuid` |  Nullable |
| `file_url` | `text` |  |
| `file_type` | `text` |  |
| `caption` | `text` |  Nullable |
| `is_supplier_link` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `request_audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `admin_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `request_supports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `support_type` | `text` |  |
| `bazcoin_amount` | `int4` |  |
| `rewarded` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `return_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `return_id` | `uuid` |  |
| `sender_id` | `uuid` |  Nullable |
| `sender_role` | `text` |  |
| `body` | `text` |  |
| `attachments` | `_text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `review_images`

Review images

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `review_id` | `uuid` |  |
| `image_url` | `text` |  |
| `sort_order` | `int4` |  |
| `uploaded_at` | `timestamptz` |  |

## Table `review_votes`

Tracks which buyers found reviews helpful

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_id` | `uuid` | Primary |
| `buyer_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `reviews`

Product reviews

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `buyer_id` | `uuid` |  |
| `order_id` | `uuid` |  Nullable |
| `rating` | `int4` |  |
| `comment` | `text` |  Nullable |
| `helpful_count` | `int4` |  |
| `seller_reply` | `jsonb` |  Nullable |
| `is_verified_purchase` | `bool` |  |
| `is_hidden` | `bool` |  |
| `is_edited` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `order_item_id` | `uuid` |  Nullable |
| `variant_snapshot` | `jsonb` |  Nullable |

## Table `seller_business_profiles`

Seller business registration and address data

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `seller_id` | `uuid` | Primary |
| `business_type` | `text` |  Nullable |
| `business_registration_number` | `text` |  Nullable |
| `tax_id_number` | `text` |  Nullable |
| `address_line_1` | `text` |  Nullable |
| `address_line_2` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `province` | `text` |  Nullable |
| `postal_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `seller_categories`

Seller-category relationships

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  |
| `category_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `seller_chat_requests`

Chat requests from AI-assisted buyers to sellers

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  |
| `buyer_id` | `uuid` |  |
| `buyer_name` | `text` |  Nullable |
| `product_id` | `uuid` |  Nullable |
| `product_name` | `text` |  Nullable |
| `status` | `text` |  |
| `message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `responded_at` | `timestamptz` |  Nullable |

## Table `seller_notifications`

In-app notifications for seller role. Schema is intentionally identical to buyer_notifications and admin_notifications; the split is for RLS isolation against sellers(id). Write via notificationService.notifySeller* (web/mobile). Do NOT query across notification tables; use the role-specific service method.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type` | `text` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `action_url` | `text` |  Nullable |
| `action_data` | `jsonb` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `priority` | `text` |  |
| `created_at` | `timestamptz` |  |
| `seller_id` | `uuid` |  |

## Table `seller_payout_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  Unique |
| `payout_method` | `text` |  |
| `bank_name` | `text` |  Nullable |
| `bank_account_name` | `text` |  Nullable |
| `bank_account_number` | `text` |  Nullable |
| `ewallet_provider` | `text` |  Nullable |
| `ewallet_number` | `text` |  Nullable |
| `auto_payout` | `bool` |  Nullable |
| `min_payout_amount` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |

## Table `seller_payouts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  |
| `order_id` | `uuid` |  Nullable |
| `payment_transaction_id` | `uuid` |  Nullable |
| `gross_amount` | `numeric` |  |
| `platform_fee` | `numeric` |  |
| `net_amount` | `numeric` |  |
| `currency` | `varchar` |  |
| `payout_method` | `text` |  |
| `payout_account_details` | `jsonb` |  |
| `status` | `text` |  |
| `processed_at` | `timestamptz` |  Nullable |
| `failure_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `escrow_transaction_id` | `uuid` |  Nullable |
| `release_after` | `timestamptz` |  Nullable |

## Table `seller_rejection_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `rejection_id` | `uuid` |  |
| `document_field` | `text` |  |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `seller_rejections`

Seller rejection reasons with admin audit trail

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `description` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `seller_id` | `uuid` |  |
| `rejection_type` | `text` |  |

## Table `seller_tiers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `seller_id` | `uuid` |  Unique |
| `tier_level` | `text` |  |
| `bypasses_assessment` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `seller_verification_document_drafts`

Work-in-progress KYC documents the seller is still preparing/replacing. Promoted to seller_verification_documents on submission. Complementary to the canonical table — do NOT merge; this enables "save without submitting" UX.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `seller_id` | `uuid` | Primary |
| `business_permit_url` | `text` |  Nullable |
| `valid_id_url` | `text` |  Nullable |
| `proof_of_address_url` | `text` |  Nullable |
| `dti_registration_url` | `text` |  Nullable |
| `tax_id_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `business_permit_updated_at` | `timestamptz` |  Nullable |
| `valid_id_updated_at` | `timestamptz` |  Nullable |
| `proof_of_address_updated_at` | `timestamptz` |  Nullable |
| `dti_registration_updated_at` | `timestamptz` |  Nullable |
| `tax_id_updated_at` | `timestamptz` |  Nullable |

## Table `seller_verification_documents`

Canonical/submitted seller verification documents shown to admins for KYC review. Complementary to seller_verification_document_drafts (work-in-progress uploads not yet submitted for review).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `seller_id` | `uuid` | Primary |
| `business_permit_url` | `text` |  Nullable |
| `valid_id_url` | `text` |  Nullable |
| `proof_of_address_url` | `text` |  Nullable |
| `dti_registration_url` | `text` |  Nullable |
| `tax_id_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `sellers`

Seller-specific business data - linked via user_roles

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `store_name` | `text` |  Unique |
| `store_description` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `owner_name` | `text` |  Nullable |
| `approval_status` | `text` |  |
| `verified_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `store_contact_number` | `text` |  Nullable |
| `reapplication_attempts` | `int4` |  Nullable |
| `blacklisted_at` | `timestamptz` |  Nullable |
| `cool_down_until` | `timestamptz` |  Nullable |
| `cooldown_count` | `int4` |  Nullable |
| `temp_blacklist_count` | `int4` |  Nullable |
| `temp_blacklist_until` | `timestamptz` |  Nullable |
| `is_permanently_blacklisted` | `bool` |  Nullable |
| `store_banner_url` | `text` |  Nullable |
| `is_vacation_mode` | `bool` |  Nullable |
| `vacation_reason` | `text` |  Nullable |
| `suspended_at` | `timestamptz` |  Nullable |
| `suspension_reason` | `text` |  Nullable |
| `shipping_origin_lat` | `float8` |  Nullable |
| `shipping_origin_lng` | `float8` |  Nullable |

## Table `shipping_addresses`

Normalized shipping address book

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `label` | `text` |  |
| `address_line_1` | `text` |  |
| `address_line_2` | `text` |  Nullable |
| `barangay` | `text` |  Nullable |
| `city` | `text` |  |
| `province` | `text` |  |
| `region` | `text` |  |
| `postal_code` | `text` |  |
| `landmark` | `text` |  Nullable |
| `delivery_instructions` | `text` |  Nullable |
| `is_default` | `bool` |  |
| `address_type` | `text` |  |
| `coordinates` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `phone_number` | `text` |  Nullable |
| `is_pickup` | `bool` |  Nullable |
| `is_return` | `bool` |  Nullable |

## Table `shipping_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `volumetric_divisor` | `numeric` |  |
| `per_kg_increment` | `numeric` |  |
| `insurance_rate` | `numeric` |  |
| `free_shipping_threshold` | `numeric` |  |
| `bulky_weight_threshold` | `numeric` |  |
| `same_day_zones` | `_text` |  |

## Table `shipping_zones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `origin_zone` | `text` |  |
| `destination_zone` | `text` |  |
| `shipping_method` | `text` |  |
| `base_rate` | `numeric` |  |
| `odz_fee` | `numeric` |  |
| `estimated_days_min` | `int4` |  |
| `estimated_days_max` | `int4` |  |

## Table `sms_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `recipient_phone` | `text` |  |
| `recipient_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `message_body` | `text` |  |
| `status` | `text` |  |
| `provider` | `text` |  Nullable |
| `provider_message_id` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `delivered_at` | `timestamptz` |  Nullable |

## Table `store_followers`

Shop follower relationships

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `buyer_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `supplier_offers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `request_id` | `uuid` |  |
| `supplier_id` | `uuid` |  |
| `price` | `numeric` |  |
| `moq` | `int4` |  |
| `lead_time_days` | `int4` |  |
| `terms` | `text` |  Nullable |
| `quality_notes` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `support_tickets`

Support ticketing system

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `category_id` | `uuid` |  Nullable |
| `priority` | `text` |  |
| `status` | `text` |  |
| `subject` | `text` |  |
| `description` | `text` |  |
| `order_id` | `uuid` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `seller_id` | `uuid` |  Nullable |

## Table `suppression_list`

BR-EMA-028/039-041: Global suppression. Checked before every send. RA 10175 anti-spam compliant.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `contact` | `text` |  |
| `contact_type` | `text` |  |
| `reason` | `text` |  |
| `suppressed_by` | `uuid` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ticket_categories`

Support ticket category taxonomy

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `parent_id` | `uuid` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ticket_messages`

Ticket conversation thread

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `sender_id` | `uuid` |  |
| `sender_type` | `text` |  |
| `message` | `text` |  |
| `is_internal_note` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `trust_artifacts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `request_id` | `uuid` |  Nullable |
| `artifact_type` | `text` |  |
| `url` | `text` |  |
| `grade` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `user_consent`

Current consent state per (user_id, channel) — answers "is this user opted-in right now?". Updated when user changes consent; old state is preserved as a new row in consent_log. Complementary to consent_log (event audit trail).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `channel` | `text` |  |
| `is_consented` | `bool` |  |
| `consent_source` | `text` |  |
| `consented_at` | `timestamptz` |  Nullable |
| `revoked_at` | `timestamptz` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `user_presence`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `is_online` | `bool` |  Nullable |
| `last_seen` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `user_roles`

Multi-role junction table - users can be buyer AND seller simultaneously

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `role` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `verification_codes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `code` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `vouchers`

Promotional vouchers

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `code` | `text` |  Unique |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `voucher_type` | `text` |  |
| `value` | `numeric` |  |
| `min_order_value` | `numeric` |  |
| `max_discount` | `numeric` |  Nullable |
| `seller_id` | `uuid` |  Nullable |
| `claimable_from` | `timestamptz` |  |
| `claimable_until` | `timestamptz` |  |
| `usage_limit` | `int4` |  Nullable |
| `claim_limit` | `int4` |  Nullable |
| `duration` | `interval` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `warranty_actions_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `warranty_claim_id` | `uuid` |  Nullable |
| `order_item_id` | `uuid` |  Nullable |
| `action_type` | `text` |  |
| `actor_id` | `uuid` |  Nullable |
| `actor_role` | `text` |  |
| `description` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `warranty_claims`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `order_item_id` | `uuid` |  |
| `buyer_id` | `uuid` |  |
| `seller_id` | `uuid` |  |
| `claim_number` | `text` |  Unique |
| `reason` | `text` |  |
| `description` | `text` |  Nullable |
| `claim_type` | `text` |  |
| `evidence_urls` | `_text` |  Nullable |
| `diagnostic_report_url` | `text` |  Nullable |
| `status` | `text` |  |
| `priority` | `text` |  Nullable |
| `resolution_type` | `text` |  Nullable |
| `resolution_description` | `text` |  Nullable |
| `resolution_amount` | `numeric` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `uuid` |  Nullable |
| `seller_response` | `text` |  Nullable |
| `seller_response_at` | `timestamptz` |  Nullable |
| `admin_notes` | `text` |  Nullable |
| `return_tracking_number` | `text` |  Nullable |
| `return_shipping_carrier` | `text` |  Nullable |
| `replacement_tracking_number` | `text` |  Nullable |
| `replacement_shipping_carrier` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

