/**
 * Mock Data for Return/Refund/Replacement tests
 */

// ---------------------------------------------------------------------------
// UUIDs (must match RFC 4122 variant — 4th group starts with [89ab])
// ---------------------------------------------------------------------------
export const MOCK_ORDER_ID = '11111111-1111-1111-a111-111111111111';
export const MOCK_RETURN_ID = '22222222-2222-2222-a222-222222222222';
export const MOCK_BUYER_ID = '33333333-3333-3333-a333-333333333333';
export const MOCK_SELLER_ID = '44444444-4444-4444-a444-444444444444';
export const MOCK_ORDER_ID_2 = '55555555-5555-5555-a555-555555555555';
export const MOCK_RETURN_ID_2 = '66666666-6666-6666-a666-666666666666';

// ---------------------------------------------------------------------------
// DB row shapes (as returned by Supabase)
// ---------------------------------------------------------------------------

/** A delivered order within the return window */
export const mockOrderDelivered = {
  id: MOCK_ORDER_ID,
  order_number: 'ORD-20260301-0001',
  buyer_id: MOCK_BUYER_ID,
  shipment_status: 'delivered',
  payment_status: 'paid',
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  shipments: [
    {
      delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  order_items: [
    {
      product_name: 'Test Product A',
      quantity: 2,
      price: 250,
      primary_image_url: 'https://example.com/product-a.jpg',
      product: { seller_id: MOCK_SELLER_ID },
    },
  ],
  buyer: {
    id: MOCK_BUYER_ID,
    profiles: {
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      email: 'juan@example.com',
    },
  },
};

/** An order with expired return window (>7 days) */
export const mockOrderExpiredWindow = {
  ...mockOrderDelivered,
  id: MOCK_ORDER_ID_2,
  created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  shipments: [
    {
      delivered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/** An order that hasn't been delivered yet */
export const mockOrderPending = {
  ...mockOrderDelivered,
  shipment_status: 'shipped',
};

// ---------------------------------------------------------------------------
// Return request DB rows
// ---------------------------------------------------------------------------

/** Refund return in seller_review status */
export const mockReturnRowRefund = {
  id: MOCK_RETURN_ID,
  order_id: MOCK_ORDER_ID,
  is_returnable: true,
  return_window_days: 7,
  return_reason: 'wrong_item - Received wrong colour',
  return_type: 'return_refund',
  resolution_path: 'seller_review',
  status: 'seller_review',
  description: 'Received wrong colour',
  items_json: JSON.stringify([
    {
      productId: 'prod-1',
      productName: 'Test Product A',
      quantity: 2,
      price: 250,
      image: 'https://example.com/product-a.jpg',
    },
  ]),
  evidence_urls: ['https://example.com/evidence/1.jpg'],
  refund_amount: 500,
  refund_date: null,
  seller_note: null,
  rejected_reason: null,
  counter_offer_amount: null,
  seller_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
  escalated_at: null,
  resolved_at: null,
  resolved_by: null,
  return_label_url: null,
  return_tracking_number: null,
  buyer_shipped_at: null,
  return_received_at: null,
  created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
  updated_at: new Date().toISOString(),
};

/** Replacement return in seller_review status */
export const mockReturnRowReplacement = {
  ...mockReturnRowRefund,
  id: MOCK_RETURN_ID_2,
  order_id: MOCK_ORDER_ID_2,
  return_type: 'replacement',
  refund_amount: null,
  return_reason: 'defective - Screen flickering',
  description: 'Screen flickering',
};

/** Approved refund return */
export const mockReturnRowApproved = {
  ...mockReturnRowRefund,
  status: 'approved',
  refund_date: new Date().toISOString(),
  resolved_at: new Date().toISOString(),
  resolved_by: 'seller',
};

/** Counter-offered return */
export const mockReturnRowCounterOffered = {
  ...mockReturnRowRefund,
  status: 'counter_offered',
  counter_offer_amount: 350,
  seller_note: 'Offering partial refund due to usage wear',
};

/** Return in transit */
export const mockReturnRowInTransit = {
  ...mockReturnRowRefund,
  status: 'return_in_transit',
  resolution_path: 'return_required',
  return_tracking_number: 'RTN-TEST12345',
  return_label_url: 'https://bazaar.ph/return-labels/test.pdf',
  buyer_shipped_at: new Date().toISOString(),
};

/** Return with expired deadline */
export const mockReturnRowExpiredDeadline = {
  ...mockReturnRowRefund,
  seller_deadline: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago = expired
};

/** Escalated return */
export const mockReturnRowEscalated = {
  ...mockReturnRowRefund,
  status: 'escalated',
  escalated_at: new Date().toISOString(),
};

/** Refunded (completed) return */
export const mockReturnRowRefunded = {
  ...mockReturnRowRefund,
  status: 'refunded',
  refund_date: new Date().toISOString(),
  resolved_at: new Date().toISOString(),
  resolved_by: 'seller',
};

// ---------------------------------------------------------------------------
// Return items for submit
// ---------------------------------------------------------------------------

export const mockReturnItems = [
  {
    productId: 'prod-1',
    productName: 'Test Product A',
    quantity: 2,
    price: 250,
    image: 'https://example.com/product-a.jpg',
  },
];

/** High-value items for return_required path (>=₱2000) */
export const mockReturnItemsHighValue = [
  {
    productId: 'prod-2',
    productName: 'Expensive Gadget',
    quantity: 1,
    price: 5000,
    image: 'https://example.com/gadget.jpg',
  },
];

/** Cheap items for instant path (<₱500) */
export const mockReturnItemsCheap = [
  {
    productId: 'prod-3',
    productName: 'Small Accessory',
    quantity: 1,
    price: 199,
    image: 'https://example.com/accessory.jpg',
  },
];

// ---------------------------------------------------------------------------
// Combined row + order (as returned by joined select)
// ---------------------------------------------------------------------------

export const mockReturnWithOrder = {
  ...mockReturnRowRefund,
  order: mockOrderDelivered,
};

export const mockReplacementWithOrder = {
  ...mockReturnRowReplacement,
  order: {
    ...mockOrderDelivered,
    id: MOCK_ORDER_ID_2,
    order_number: 'ORD-20260301-0002',
  },
};
