/**
 * Receipt Service
 *
 * Utilities for generating unique receipt numbers, building items HTML for
 * email templates, and fetching all order/buyer data needed to send
 * transactional emails.
 */

import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderItemLine {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface OrderEmailData {
  orderId: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
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
  receiptNumber: string;
  trackingNumber: string;
  paymentStatus: string;
  shipmentStatus: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Receipt Number
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique receipt number.
 * Format: RCP-YYYYMMDD-XXXXX  (e.g. RCP-20260319-X9K2F)
 */
export function generateReceiptNumber(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(5, '0');
  return `RCP-${yyyy}${mm}${dd}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format a numeric amount to Philippine Peso display (e.g. 1,447.00) */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a Date/ISO string to a readable PH datetime.
 * Example: "March 19, 2026 at 2:30 PM"
 */
export function formatReceiptDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
}

/** Map internal payment method codes to human-readable labels. */
export function formatPaymentMethod(method: string): string {
  const MAP: Record<string, string> = {
    gcash:         'GCash',
    maya:          'Maya',
    paymaya:       'Maya',
    cash:          'Cash on Delivery',
    cod:           'Cash on Delivery',
    card:          'Credit / Debit Card',
    credit_card:   'Credit / Debit Card',
    debit_card:    'Credit / Debit Card',
    bank_transfer: 'Bank Transfer',
    e_wallet:      'E-Wallet',
  };
  return MAP[method.toLowerCase()] ?? method;
}

/** Minimal HTML escape to prevent injection in email body. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────────
// Items HTML builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an HTML table of order items suitable for embedding in an email body.
 */
export function buildItemsHtml(items: OrderItemLine[]): string {
  if (!items.length) {
    return '<p style="color:#555;font-size:14px">No items found.</p>';
  }

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px">${escapeHtml(item.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#555;font-size:14px">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#555;font-size:14px">&#x20B1;${formatAmount(item.unit_price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-weight:600;font-size:14px">&#x20B1;${formatAmount(item.total)}</td>
        </tr>`
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Item</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Unit Price</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;color:#374151;font-size:12px;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Order data fetcher
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all data needed to populate transactional email templates for an order.
 * Returns null if the order cannot be found or a critical error occurs.
 */
export async function fetchOrderEmailData(orderId: string): Promise<OrderEmailData | null> {
  try {
    // 1. Fetch order + items + shipments + payments
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        receipt_number,
        address_id,
        buyer_id,
        payment_status,
        shipment_status,
        order_items (
          product_name,
          price,
          price_discount,
          quantity,
          shipping_price,
          shipping_discount
        ),
        order_shipments (
          tracking_number,
          status,
          shipped_at
        ),
        order_payments (
          payment_method,
          payment_reference,
          amount,
          payment_date,
          status
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error('[ReceiptService] Order not found:', orderErr?.message);
      return null;
    }

    // 2. Fetch buyer profile (buyers.id = profiles.id via FK chain)
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', order.buyer_id)
      .maybeSingle();

    const buyerName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Valued Customer'
      : 'Valued Customer';
    const buyerEmail = profile?.email ?? '';

    // 3. Fetch shipping address if present
    let shippingAddress = '';
    if (order.address_id) {
      const { data: addr } = await supabase
        .from('shipping_addresses')
        .select('address_line_1, address_line_2, barangay, city, province, postal_code')
        .eq('id', order.address_id)
        .maybeSingle();
      if (addr) {
        shippingAddress = [
          addr.address_line_1,
          addr.address_line_2,
          addr.barangay,
          addr.city,
          addr.province,
          addr.postal_code,
        ]
          .filter(Boolean)
          .join(', ');
      }
    }

    // 4. Compute totals from order_items
    const rawItems = (order.order_items ?? []) as Array<{
      product_name: string;
      price: number;
      price_discount: number;
      quantity: number;
      shipping_price: number;
      shipping_discount: number;
    }>;

    const lines: OrderItemLine[] = rawItems.map((oi) => {
      const unitPrice = (oi.price ?? 0) - (oi.price_discount ?? 0);
      return {
        name: oi.product_name,
        quantity: oi.quantity,
        unit_price: unitPrice,
        total: unitPrice * oi.quantity,
      };
    });

    const subtotalNum = lines.reduce((s, i) => s + i.total, 0);
    const shippingNum = rawItems.reduce(
      (s, oi) => s + ((oi.shipping_price ?? 0) - (oi.shipping_discount ?? 0)) * oi.quantity,
      0
    );
    const discountNum = rawItems.reduce(
      (s, oi) => s + (oi.price_discount ?? 0) * oi.quantity,
      0
    );

    // 5. Payment info — use most recent confirmed payment
    const paymentsArr = Array.isArray(order.order_payments) ? order.order_payments : (order.order_payments ? [order.order_payments] : []);
    const payments = (paymentsArr ?? []) as Array<{
      payment_method: unknown;
      payment_reference: string | null;
      payment_date: string | null;
      status: string;
    }>;
    const confirmedPayment = payments.find((p) => p.status === 'completed') ?? payments[payments.length - 1];

    const paymentMethodRaw = confirmedPayment?.payment_method;
    let paymentMethodStr = 'N/A';
    if (paymentMethodRaw) {
      if (typeof paymentMethodRaw === 'string') {
        paymentMethodStr = formatPaymentMethod(paymentMethodRaw);
      } else if (typeof paymentMethodRaw === 'object') {
        const m = paymentMethodRaw as Record<string, unknown>;
        const code = (m['type'] ?? m['payment_type'] ?? m['label'] ?? '') as string;
        paymentMethodStr = formatPaymentMethod(code);
      }
    }

    const transactionId = confirmedPayment?.payment_reference ?? 'N/A';
    const transactionDate = confirmedPayment?.payment_date
      ? formatReceiptDate(confirmedPayment.payment_date)
      : formatReceiptDate(order.created_at);

    // 6. Tracking number from most recent shipment
    const shipmentsArr = Array.isArray(order.order_shipments) ? order.order_shipments : (order.order_shipments ? [order.order_shipments] : []);
    const shipments = (shipmentsArr ?? []) as Array<{ tracking_number: string | null }>;
    const trackingNumber = shipments[shipments.length - 1]?.tracking_number ?? '';

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      buyerId: order.buyer_id,
      buyerName,
      buyerEmail,
      orderDate: formatReceiptDate(order.created_at),
      itemsHtml: buildItemsHtml(lines),
      subtotal: formatAmount(subtotalNum),
      shipping: formatAmount(shippingNum),
      discount: formatAmount(discountNum),
      total: formatAmount(subtotalNum + shippingNum),
      paymentMethod: paymentMethodStr,
      transactionId,
      transactionDate,
      shippingAddress,
      receiptNumber: order.receipt_number ?? '',
      trackingNumber,
      paymentStatus: order.payment_status,
      shipmentStatus: order.shipment_status,
    };
  } catch (err) {
    console.error('[ReceiptService] Unexpected error:', err);
    return null;
  }
}
