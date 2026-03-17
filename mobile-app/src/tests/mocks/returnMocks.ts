/**
 * Return / Refund / Replacement Mock Data for Mobile Tests
 * RFC 4122 compliant UUIDs (4th group starts with [89ab])
 */

// ─── Valid UUIDs ─────────────────────────────────────────────────────────────
export const MOCK_ORDER_ID   = '11111111-1111-4111-a111-111111111111';
export const MOCK_RETURN_ID  = '22222222-2222-4222-a222-222222222222';
export const MOCK_BUYER_ID   = '33333333-3333-4333-a333-333333333333';
export const MOCK_SELLER_ID  = '44444444-4444-4444-a444-444444444444';
export const MOCK_ORDER_ID_2 = '55555555-5555-4555-a555-555555555555';
export const MOCK_RETURN_ID_2 = '66666666-6666-4666-a666-666666666666';

// ─── Mock Return Items ───────────────────────────────────────────────────────
export const mockReturnItems = [
  { orderItemId: 'item-1', productName: 'Test Shirt', quantity: 2, returnQuantity: 1, price: 350, image: null },
  { orderItemId: 'item-2', productName: 'Test Pants', quantity: 1, returnQuantity: 1, price: 500, image: null },
];

export const mockReturnItemsCheap = [
  { orderItemId: 'item-3', productName: 'Cheap Trinket', quantity: 1, returnQuantity: 1, price: 120, image: null },
];

export const mockReturnItemsHighValue = [
  { orderItemId: 'item-4', productName: 'Expensive Watch', quantity: 1, returnQuantity: 1, price: 3500, image: null },
];

// ─── Mock Delivered Order (within return window) ─────────────────────────────
export const mockOrderDelivered = {
  id: MOCK_ORDER_ID,
  shipment_status: 'delivered',
  payment_status: 'paid',
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  order_shipments: [
    { delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
  ],
};

// ─── Mock Expired Window Order ───────────────────────────────────────────────
export const mockOrderExpiredWindow = {
  id: MOCK_ORDER_ID,
  shipment_status: 'delivered',
  payment_status: 'paid',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  order_shipments: [
    { delivered_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), created_at: null },
  ],
};

// ─── Mock Pending Order (not delivered) ──────────────────────────────────────
export const mockOrderPending = {
  id: MOCK_ORDER_ID,
  shipment_status: 'pending',
  payment_status: 'paid',
  created_at: new Date().toISOString(),
  order_shipments: [],
};

// ─── Mock Return DB Rows ─────────────────────────────────────────────────────

const baseReturnRow = {
  id: MOCK_RETURN_ID,
  order_id: MOCK_ORDER_ID,
  is_returnable: true,
  return_window_days: 7,
  return_reason: 'damaged',
  refund_amount: 850,
  refund_date: null,
  created_at: new Date().toISOString(),
  return_type: 'return_refund',
  resolution_path: 'seller_review',
  items_json: mockReturnItems,
  evidence_urls: ['https://example.com/photo1.jpg'],
  description: 'Item arrived damaged',
  seller_note: null,
  rejected_reason: null,
  counter_offer_amount: null,
  seller_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  escalated_at: null,
  resolved_at: null,
  resolved_by: null,
  return_label_url: null,
  return_tracking_number: null,
  buyer_shipped_at: null,
  return_received_at: null,
};

export const mockReturnRowSellerReview = {
  ...baseReturnRow,
  status: 'seller_review',
};

export const mockReturnRowRefund = {
  ...baseReturnRow,
  status: 'refunded',
  refund_date: new Date().toISOString(),
  resolved_at: new Date().toISOString(),
  resolved_by: 'seller',
};

export const mockReturnRowReplacement = {
  ...baseReturnRow,
  status: 'seller_review',
  return_type: 'replacement',
};

export const mockReturnRowApproved = {
  ...baseReturnRow,
  status: 'approved',
  refund_date: new Date().toISOString(),
  resolved_at: new Date().toISOString(),
  resolved_by: 'seller',
};

export const mockReturnRowCounterOffered = {
  ...baseReturnRow,
  status: 'counter_offered',
  counter_offer_amount: 500,
  seller_note: 'We can offer ₱500 partial refund',
};

export const mockReturnRowInTransit = {
  ...baseReturnRow,
  status: 'return_in_transit',
  resolution_path: 'return_required',
  return_label_url: `https://bazaar.ph/returns/${MOCK_RETURN_ID}/label.pdf`,
  return_tracking_number: 'RTN-TEST123',
};

export const mockReturnRowEscalated = {
  ...baseReturnRow,
  status: 'escalated',
  escalated_at: new Date().toISOString(),
};

export const mockReturnRowRejected = {
  ...baseReturnRow,
  status: 'rejected',
  is_returnable: false,
  rejected_reason: 'Item was used beyond normal wear',
};

// ─── Mock Return with Joined Order Data ──────────────────────────────────────
export const mockReturnWithOrder = {
  ...mockReturnRowSellerReview,
  order: {
    id: MOCK_ORDER_ID,
    order_number: 'ORD-20260001',
    buyer_id: MOCK_BUYER_ID,
    shipment_status: 'returned',
    payment_status: 'paid',
    order_items: [
      { product_name: 'Test Shirt', quantity: 2, price: 350, primary_image_url: null },
      { product_name: 'Test Pants', quantity: 1, price: 500, primary_image_url: null },
    ],
  },
};

export const mockReturnWithOrderSeller = {
  ...mockReturnRowSellerReview,
  order: {
    id: MOCK_ORDER_ID,
    order_number: 'ORD-20260001',
    buyer_id: MOCK_BUYER_ID,
    shipment_status: 'returned',
    payment_status: 'paid',
    buyer: {
      id: MOCK_BUYER_ID,
      profiles: { first_name: 'Juan', last_name: 'Dela Cruz', email: 'juan@test.com' },
    },
    order_items: [
      { product_name: 'Test Shirt', quantity: 2, price: 350, primary_image_url: null, product: { seller_id: MOCK_SELLER_ID } },
      { product_name: 'Test Pants', quantity: 1, price: 500, primary_image_url: null, product: { seller_id: MOCK_SELLER_ID } },
    ],
  },
};

export const mockReplacementWithOrder = {
  ...mockReturnRowReplacement,
  order: {
    id: MOCK_ORDER_ID,
    order_number: 'ORD-20260002',
    buyer_id: MOCK_BUYER_ID,
    shipment_status: 'returned',
    payment_status: 'paid',
    order_items: [
      { product_name: 'Defective Gadget', quantity: 1, price: 1500, primary_image_url: null },
    ],
  },
};
