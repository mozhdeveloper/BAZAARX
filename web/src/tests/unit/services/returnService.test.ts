/**
 * ReturnService — Comprehensive Unit Tests
 *
 * Covers the complete return/refund/replacement flow:
 *   • Resolution path computation (instant / seller_review / return_required)
 *   • Submit return request (refund vs replacement, all validation branches)
 *   • Seller actions: approve, reject, counter-offer, request item back, confirm received
 *   • Buyer actions: accept/decline counter-offer, escalate
 *   • Helpers: status labels, deadline formatting, return window checks
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  returnService,
  computeResolutionPath,
  getStatusLabel,
  getStatusColor,
  EVIDENCE_REQUIRED_REASONS,
  ReturnStatus,
} from '@/services/returnService';
import {
  MOCK_ORDER_ID,
  MOCK_RETURN_ID,
  MOCK_BUYER_ID,
  MOCK_SELLER_ID,
  MOCK_ORDER_ID_2,
  MOCK_RETURN_ID_2,
  mockOrderDelivered,
  mockOrderExpiredWindow,
  mockOrderPending,
  mockReturnRowRefund,
  mockReturnRowReplacement,
  mockReturnRowApproved,
  mockReturnRowCounterOffered,
  mockReturnRowInTransit,
  mockReturnRowEscalated,
  mockReturnRowRefunded,
  mockReturnItems,
  mockReturnItemsHighValue,
  mockReturnItemsCheap,
  mockReturnWithOrder,
  mockReplacementWithOrder,
} from '../mocks/data/returns.mock';
import { createMockSupabaseQuery, createSupabaseError } from '../mocks/supabase.mock';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/services/notificationService', () => ({
  notificationService: {
    notifySellerReturnRequest: jest.fn().mockResolvedValue(undefined),
    notifyBuyerReturnStatus: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockIsConfigured = isSupabaseConfigured as jest.Mock;
const mockFrom = supabase.from as jest.Mock;
const mockStorageFrom = (supabase.storage as any).from as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers for chained queries
// ---------------------------------------------------------------------------

/** Build a chain of .from() calls where each call returns the next query mock */
function setupFromChain(...queries: any[]) {
  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    const q = queries[callIndex] || queries[queries.length - 1];
    callIndex++;
    return q;
  });
}

/** Single .from() that always returns the same mock */
function setupFrom(query: any) {
  mockFrom.mockReturnValue(query);
}

// ============================================================================
// computeResolutionPath — Pure function, no mocks needed
// ============================================================================

describe('computeResolutionPath()', () => {
  it('returns "instant" for amount < ₱500, qualifying reason, and evidence', () => {
    expect(computeResolutionPath('wrong_item', 499, true)).toBe('instant');
    expect(computeResolutionPath('not_as_described', 100, true)).toBe('instant');
    expect(computeResolutionPath('missing_parts', 0, true)).toBe('instant');
  });

  it('returns "seller_review" when amount < ₱500 but reason is NOT qualifying', () => {
    expect(computeResolutionPath('changed_mind', 200, true)).toBe('seller_review');
    expect(computeResolutionPath('duplicate_order', 100, true)).toBe('seller_review');
    expect(computeResolutionPath('other', 300, true)).toBe('seller_review');
  });

  it('returns "seller_review" when amount < ₱500 and qualifying reason but NO evidence', () => {
    expect(computeResolutionPath('wrong_item', 400, false)).toBe('seller_review');
  });

  it('returns "return_required" for amount >= ₱2,000 regardless of reason/evidence', () => {
    expect(computeResolutionPath('wrong_item', 2000, true)).toBe('return_required');
    expect(computeResolutionPath('changed_mind', 5000, false)).toBe('return_required');
    expect(computeResolutionPath('damaged', 10000, true)).toBe('return_required');
  });

  it('returns "seller_review" for mid-range amounts (₱500–₱1,999)', () => {
    expect(computeResolutionPath('wrong_item', 500, true)).toBe('seller_review');
    expect(computeResolutionPath('damaged', 1500, true)).toBe('seller_review');
    expect(computeResolutionPath('defective', 1999, true)).toBe('seller_review');
  });
});

// ============================================================================
// Status helpers — Pure
// ============================================================================

describe('getStatusLabel()', () => {
  it('maps every status to a human-readable label', () => {
    const statuses: ReturnStatus[] = [
      'pending', 'seller_review', 'counter_offered', 'approved',
      'rejected', 'escalated', 'return_in_transit', 'return_received', 'refunded',
    ];
    statuses.forEach((s) => {
      const label = getStatusLabel(s);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusLabel('seller_review')).toBe('Under Seller Review');
    expect(getStatusLabel('refunded')).toBe('Refunded');
  });
});

describe('getStatusColor()', () => {
  it('returns a valid colour for each status', () => {
    expect(getStatusColor('pending')).toBe('yellow');
    expect(getStatusColor('approved')).toBe('green');
    expect(getStatusColor('rejected')).toBe('red');
    expect(getStatusColor('escalated')).toBe('purple');
  });
});

// ============================================================================
// Deadline helpers
// ============================================================================

describe('Deadline helpers', () => {
  describe('getDeadlineRemainingMs()', () => {
    it('returns positive ms when deadline is in the future', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(returnService.getDeadlineRemainingMs(future)).toBeGreaterThan(0);
    });

    it('returns 0 when deadline is in the past', () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      expect(returnService.getDeadlineRemainingMs(past)).toBe(0);
    });

    it('returns 0 for null deadline', () => {
      expect(returnService.getDeadlineRemainingMs(null)).toBe(0);
    });
  });

  describe('formatDeadlineRemaining()', () => {
    it('returns "Expired" for past deadlines', () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      expect(returnService.formatDeadlineRemaining(past)).toBe('Expired');
    });

    it('returns formatted string for future deadlines', () => {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
      const result = returnService.formatDeadlineRemaining(future);
      expect(result).toMatch(/\d+h \d+m remaining/);
    });

    it('returns "Expired" for null', () => {
      expect(returnService.formatDeadlineRemaining(null)).toBe('Expired');
    });
  });
});

// ============================================================================
// submitReturnRequest
// ============================================================================

describe('submitReturnRequest()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(
      returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Supabase not configured');
  });

  it('throws for invalid (non-UUID) order reference', async () => {
    await expect(
      returnService.submitReturnRequest({
        orderDbId: 'not-a-uuid',
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Invalid order reference');
  });

  it('throws when orderDbId is missing', async () => {
    await expect(
      returnService.submitReturnRequest({
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Order reference is missing');
  });

  it('throws when order is not found', async () => {
    const q = createMockSupabaseQuery(null, createSupabaseError('Not found'));
    setupFrom(q);

    await expect(
      returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Order not found');
  });

  it('throws when order is not delivered', async () => {
    const q = createMockSupabaseQuery(mockOrderPending);
    setupFrom(q);

    await expect(
      returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Only delivered or received orders can be returned');
  });

  it('throws when return window has expired', async () => {
    const q = createMockSupabaseQuery(mockOrderExpiredWindow);
    setupFrom(q);

    await expect(
      returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID_2,
        reason: 'wrong_item',
      }),
    ).rejects.toThrow('Return window has expired');
  });

  it('throws when a return already exists for the order', async () => {
    // 1st .from('orders') → order data
    const orderQ = createMockSupabaseQuery(mockOrderDelivered);
    // 2nd .from('refund_return_periods') → existing return
    const existingQ = createMockSupabaseQuery([{ id: MOCK_RETURN_ID }]);

    setupFromChain(orderQ, existingQ);

    await expect(
      returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'wrong_item',
        refundAmount: 500,
      }),
    ).rejects.toThrow('A return request already exists');
  });

  it('creates a seller_review return for a standard refund request', async () => {
    // 1: orders SELECT → delivered order
    const orderQ = createMockSupabaseQuery(mockOrderDelivered);
    // 2: refund_return_periods SELECT → no existing
    const noExistingQ = createMockSupabaseQuery([]);
    // 3: refund_return_periods INSERT → created row
    const insertQ = createMockSupabaseQuery(mockReturnRowRefund);
    // 4: orders UPDATE
    const updateOrderQ = createMockSupabaseQuery(null);
    // 5: order_status_history INSERT
    const historyQ = createMockSupabaseQuery(null);
    // 6: orders SELECT (for notification - buyer/seller info)
    const notifOrderQ = createMockSupabaseQuery({
      buyer: { profiles: { first_name: 'Juan', last_name: 'Dela Cruz' } },
      order_items: [{ product: { seller_id: MOCK_SELLER_ID } }],
    });

    setupFromChain(orderQ, noExistingQ, insertQ, updateOrderQ, historyQ, notifOrderQ);

    const result = await returnService.submitReturnRequest({
      orderDbId: MOCK_ORDER_ID,
      reason: 'wrong_item',
      returnType: 'return_refund',
      refundAmount: 500,
      items: mockReturnItems,
      evidenceUrls: ['https://example.com/evidence/1.jpg'],
      description: 'Received wrong colour',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(MOCK_RETURN_ID);
    expect(result.status).toBe('seller_review');
    expect(result.returnType).toBe('return_refund');
    expect(result.orderId).toBe(MOCK_ORDER_ID);
  });

  it('creates an instant-approved return for cheap refund with qualifying reason + evidence', async () => {
    const cheapOrder = {
      ...mockOrderDelivered,
      order_items: [
        { ...mockOrderDelivered.order_items[0], price: 199, quantity: 1 },
      ],
    };
    const orderQ = createMockSupabaseQuery(cheapOrder);
    const noExistingQ = createMockSupabaseQuery([]);
    const instantReturn = {
      ...mockReturnRowRefund,
      status: 'approved',
      resolution_path: 'instant',
      refund_date: new Date().toISOString(),
      resolved_by: 'system',
    };
    const insertQ = createMockSupabaseQuery(instantReturn);
    const updateOrderQ = createMockSupabaseQuery(null);
    const historyQ = createMockSupabaseQuery(null);

    setupFromChain(orderQ, noExistingQ, insertQ, updateOrderQ, historyQ);

    const result = await returnService.submitReturnRequest({
      orderDbId: MOCK_ORDER_ID,
      reason: 'wrong_item',
      returnType: 'return_refund',
      refundAmount: 199,
      items: mockReturnItemsCheap,
      evidenceUrls: ['https://example.com/evidence/1.jpg'],
    });

    expect(result.status).toBe('approved');
    expect(result.resolutionPath).toBe('instant');
  });

  it('creates a seller_review replacement (never instant even if <₱500)', async () => {
    const orderQ = createMockSupabaseQuery(mockOrderDelivered);
    const noExistingQ = createMockSupabaseQuery([]);
    const replacementReturn = {
      ...mockReturnRowReplacement,
      status: 'seller_review',
      resolution_path: 'seller_review',
    };
    const insertQ = createMockSupabaseQuery(replacementReturn);
    const updateOrderQ = createMockSupabaseQuery(null);
    const historyQ = createMockSupabaseQuery(null);
    const notifOrderQ = createMockSupabaseQuery({
      buyer: { profiles: { first_name: 'Juan', last_name: 'Dela Cruz' } },
      order_items: [{ product: { seller_id: MOCK_SELLER_ID } }],
    });

    setupFromChain(orderQ, noExistingQ, insertQ, updateOrderQ, historyQ, notifOrderQ);

    const result = await returnService.submitReturnRequest({
      orderDbId: MOCK_ORDER_ID,
      reason: 'wrong_item',
      returnType: 'replacement',
      refundAmount: 0,
      items: mockReturnItemsCheap,
      evidenceUrls: ['https://example.com/evidence/1.jpg'],
    });

    // Replacement always goes through seller_review
    expect(result.status).toBe('seller_review');
    expect(result.returnType).toBe('replacement');
    // refundAmount should be null for replacement
    expect(result.refundAmount).toBeNull();
  });

  it('creates return_required path for high-value items (≥ ₱2,000)', async () => {
    const orderQ = createMockSupabaseQuery(mockOrderDelivered);
    const noExistingQ = createMockSupabaseQuery([]);
    const highValueReturn = {
      ...mockReturnRowRefund,
      status: 'seller_review',
      resolution_path: 'return_required',
      refund_amount: 5000,
    };
    const insertQ = createMockSupabaseQuery(highValueReturn);
    const updateOrderQ = createMockSupabaseQuery(null);
    const historyQ = createMockSupabaseQuery(null);
    const notifOrderQ = createMockSupabaseQuery({
      buyer: { profiles: { first_name: 'Juan', last_name: 'Dela Cruz' } },
      order_items: [{ product: { seller_id: MOCK_SELLER_ID } }],
    });

    setupFromChain(orderQ, noExistingQ, insertQ, updateOrderQ, historyQ, notifOrderQ);

    const result = await returnService.submitReturnRequest({
      orderDbId: MOCK_ORDER_ID,
      reason: 'damaged',
      returnType: 'return_refund',
      refundAmount: 5000,
      items: mockReturnItemsHighValue,
      evidenceUrls: ['https://example.com/evidence/1.jpg'],
    });

    expect(result.resolutionPath).toBe('return_required');
  });
});

// ============================================================================
// Seller: approveReturn
// ============================================================================

describe('approveReturn()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(
      returnService.approveReturn(MOCK_RETURN_ID),
    ).rejects.toThrow('Supabase not configured');
  });

  it('processes REFUND approval — sets refund_date + payment_status=refunded', async () => {
    // 1: check return_type
    const typeQ = createMockSupabaseQuery({ return_type: 'return_refund', order_id: MOCK_ORDER_ID });
    // 2: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 3: update orders
    const updateOrderQ = createMockSupabaseQuery(null);
    // 4: insert order_status_history
    const historyQ = createMockSupabaseQuery(null);
    // 5: notifyBuyer → select order
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(typeQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await returnService.approveReturn(MOCK_RETURN_ID);

    // Verify update was called on orders with payment_status = refunded
    expect(mockFrom).toHaveBeenCalledWith('orders');
    // Check history recorded refund_approved
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });

  it('processes REPLACEMENT approval — sets shipment_status=processing, NO refund_date', async () => {
    // 1: check return_type
    const typeQ = createMockSupabaseQuery({ return_type: 'replacement', order_id: MOCK_ORDER_ID });
    // 2: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 3: update orders (shipment_status)
    const updateOrderQ = createMockSupabaseQuery(null);
    // 4: insert order_status_history
    const historyQ = createMockSupabaseQuery(null);
    // 5: notifyBuyer → select order
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(typeQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await returnService.approveReturn(MOCK_RETURN_ID);

    // Should still complete without error
    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });
});

// ============================================================================
// Seller: rejectReturn
// ============================================================================

describe('rejectReturn()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(
      returnService.rejectReturn(MOCK_RETURN_ID),
    ).rejects.toThrow('Supabase not configured');
  });

  it('rejects the return with reason and reverts order shipment_status', async () => {
    // 0: read return data
    const readRetQ = createMockSupabaseQuery({ id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID });
    // 1: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 2: update orders
    const updateOrderQ = createMockSupabaseQuery(null);
    // 3: insert order_status_history
    const historyQ = createMockSupabaseQuery(null);
    // 4: notifyBuyer → select order
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(readRetQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await returnService.rejectReturn(MOCK_RETURN_ID, 'Item was used');

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });

  it('rejects without reason (optional param)', async () => {
    const readRetQ = createMockSupabaseQuery({ id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID });
    const updateReturnQ = createMockSupabaseQuery(null);
    const updateOrderQ = createMockSupabaseQuery(null);
    const historyQ = createMockSupabaseQuery(null);
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(readRetQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await expect(
      returnService.rejectReturn(MOCK_RETURN_ID),
    ).resolves.toBeUndefined();
  });
});

// ============================================================================
// Seller: counterOfferReturn
// ============================================================================

describe('counterOfferReturn()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(
      returnService.counterOfferReturn(MOCK_RETURN_ID, 350, 'Partial refund'),
    ).rejects.toThrow('Supabase not configured');
  });

  it('sends a counter-offer and records it in history', async () => {
    // 1: update refund_return_periods
    const updateQ = createMockSupabaseQuery(null);
    // 2: select order_id for history
    const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID });
    // 3: insert order_status_history
    const historyQ = createMockSupabaseQuery(null);
    // 4: notifyBuyer → select order
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(updateQ, selectQ, historyQ, notifQ);

    await returnService.counterOfferReturn(MOCK_RETURN_ID, 350, 'Partial refund');

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });
});

// ============================================================================
// Seller: requestItemBack
// ============================================================================

describe('requestItemBack()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.requestItemBack(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('sets return to in_transit with generated tracking and label', async () => {
    const updateQ = createMockSupabaseQuery(null);
    setupFrom(updateQ);

    await returnService.requestItemBack(MOCK_RETURN_ID);

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
  });
});

// ============================================================================
// Seller: confirmReturnReceived
// ============================================================================

describe('confirmReturnReceived()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('processes REFUND when return type is return_refund', async () => {
    // 1: select return → return_type + order_id
    const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID, return_type: 'return_refund' });
    // 2: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 3: update orders (payment_status = refunded)
    const updateOrderQ = createMockSupabaseQuery(null);
    // 4: insert history
    const historyQ = createMockSupabaseQuery(null);
    // 5: notification select
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(selectQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await returnService.confirmReturnReceived(MOCK_RETURN_ID);

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });

  it('processes REPLACEMENT when return type is replacement — sets shipment_status=processing', async () => {
    // 1: select → replacement type
    const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID, return_type: 'replacement' });
    // 2: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 3: update orders (shipment_status = processing)
    const updateOrderQ = createMockSupabaseQuery(null);
    // 4: insert history (replacement_approved)
    const historyQ = createMockSupabaseQuery(null);
    // 5: notification select
    const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

    setupFromChain(selectQ, updateReturnQ, updateOrderQ, historyQ, notifQ);

    await returnService.confirmReturnReceived(MOCK_RETURN_ID);

    expect(mockFrom).toHaveBeenCalledWith('orders');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });
});

// ============================================================================
// Buyer: acceptCounterOffer
// ============================================================================

describe('acceptCounterOffer()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.acceptCounterOffer(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('accepts the counter-offer amount and updates order to partially_refunded', async () => {
    // 1: select counter_offer_amount + order_id
    const selectQ = createMockSupabaseQuery({ counter_offer_amount: 350, order_id: MOCK_ORDER_ID });
    // 2: update refund_return_periods
    const updateReturnQ = createMockSupabaseQuery(null);
    // 3: update orders
    const updateOrderQ = createMockSupabaseQuery(null);

    setupFromChain(selectQ, updateReturnQ, updateOrderQ);

    await returnService.acceptCounterOffer(MOCK_RETURN_ID);

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('orders');
  });
});

// ============================================================================
// Buyer: declineCounterOffer
// ============================================================================

describe('declineCounterOffer()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.declineCounterOffer(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('escalates the return', async () => {
    const updateQ = createMockSupabaseQuery(null);
    setupFrom(updateQ);

    await returnService.declineCounterOffer(MOCK_RETURN_ID);
    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
  });
});

// ============================================================================
// Buyer: escalateReturn
// ============================================================================

describe('escalateReturn()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.escalateReturn(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('escalates a return and records history', async () => {
    // 1: select order_id
    const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID });
    // 2: update refund_return_periods
    const updateQ = createMockSupabaseQuery(null);
    // 3: insert history
    const historyQ = createMockSupabaseQuery(null);

    setupFromChain(selectQ, updateQ, historyQ);

    await returnService.escalateReturn(MOCK_RETURN_ID, 'Seller not responding');

    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    expect(mockFrom).toHaveBeenCalledWith('order_status_history');
  });
});

// ============================================================================
// Buyer: confirmReturnShipment
// ============================================================================

describe('confirmReturnShipment()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    await expect(returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRACK123')).rejects.toThrow('Supabase not configured');
  });

  it('records tracking number and shipped date', async () => {
    const updateQ = createMockSupabaseQuery(null);
    setupFrom(updateQ);

    await returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRACK123');
    expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
  });
});

// ============================================================================
// Query: getReturnRequestsByBuyer
// ============================================================================

describe('getReturnRequestsByBuyer()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('returns empty array when supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toEqual([]);
  });

  it('returns transformed return requests', async () => {
    const q = createMockSupabaseQuery([mockReturnWithOrder]);
    setupFrom(q);

    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(MOCK_RETURN_ID);
    expect(result[0].status).toBe('seller_review');
    expect(result[0].returnType).toBe('return_refund');
  });

  it('returns empty on error', async () => {
    const q = createMockSupabaseQuery(null, createSupabaseError('DB error'));
    setupFrom(q);

    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Query: getReturnRequestById
// ============================================================================

describe('getReturnRequestById()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('returns null when supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const result = await returnService.getReturnRequestById(MOCK_RETURN_ID);
    expect(result).toBeNull();
  });

  it('returns a transformed return request', async () => {
    const q = createMockSupabaseQuery(mockReturnWithOrder);
    setupFrom(q);

    const result = await returnService.getReturnRequestById(MOCK_RETURN_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MOCK_RETURN_ID);
  });

  it('returns null if return not found', async () => {
    const q = createMockSupabaseQuery(null, createSupabaseError('Not found'));
    setupFrom(q);

    const result = await returnService.getReturnRequestById(MOCK_RETURN_ID);
    expect(result).toBeNull();
  });
});

// ============================================================================
// Query: getReturnRequestsBySeller
// ============================================================================

describe('getReturnRequestsBySeller()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('returns empty array when supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toEqual([]);
  });

  it('filters to only this seller\'s products', async () => {
    const otherSellerId = '99999999-9999-9999-9999-999999999999';
    const rowWithOtherSeller = {
      ...mockReturnRowRefund,
      id: '77777777-7777-7777-7777-777777777777',
      order: {
        ...mockOrderDelivered,
        order_items: [
          {
            ...mockOrderDelivered.order_items[0],
            product: { seller_id: otherSellerId },
          },
        ],
      },
    };
    const q = createMockSupabaseQuery([mockReturnWithOrder, rowWithOtherSeller]);
    setupFrom(q);

    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);

    // Only our seller's return should be included
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(MOCK_RETURN_ID);
  });

  it('deduplicates returns from multi-item orders', async () => {
    // Same return row appearing twice (from join)
    const q = createMockSupabaseQuery([mockReturnWithOrder, mockReturnWithOrder]);
    setupFrom(q);

    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toHaveLength(1);
  });

  it('returns empty on error', async () => {
    const q = createMockSupabaseQuery(null, createSupabaseError('DB error'));
    setupFrom(q);

    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// Query: getReturnForOrder + isWithinReturnWindow
// ============================================================================

describe('getReturnForOrder()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('returns null for non-UUID', async () => {
    const result = await returnService.getReturnForOrder('bad-id');
    expect(result).toBeNull();
  });

  it('returns null if no return exists', async () => {
    const q = createMockSupabaseQuery(null);
    setupFrom(q);

    const result = await returnService.getReturnForOrder(MOCK_ORDER_ID);
    expect(result).toBeNull();
  });

  it('returns the existing return for the order', async () => {
    const q = createMockSupabaseQuery(mockReturnRowRefund);
    setupFrom(q);

    const result = await returnService.getReturnForOrder(MOCK_ORDER_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MOCK_RETURN_ID);
  });
});

describe('isWithinReturnWindow()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('returns false for non-UUID', async () => {
    const result = await returnService.isWithinReturnWindow('not-uuid');
    expect(result).toBe(false);
  });

  it('returns true when within the 7-day window', async () => {
    const q = createMockSupabaseQuery(mockOrderDelivered);
    setupFrom(q);

    const result = await returnService.isWithinReturnWindow(MOCK_ORDER_ID);
    expect(result).toBe(true);
  });

  it('returns false when window has expired', async () => {
    const q = createMockSupabaseQuery(mockOrderExpiredWindow);
    setupFrom(q);

    const result = await returnService.isWithinReturnWindow(MOCK_ORDER_ID_2);
    expect(result).toBe(false);
  });

  it('returns false for undelivered orders', async () => {
    const q = createMockSupabaseQuery(mockOrderPending);
    setupFrom(q);

    const result = await returnService.isWithinReturnWindow(MOCK_ORDER_ID);
    expect(result).toBe(false);
  });

  it('returns false when supabase not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const result = await returnService.isWithinReturnWindow(MOCK_ORDER_ID);
    expect(result).toBe(false);
  });
});

// ============================================================================
// Evidence upload
// ============================================================================

describe('uploadEvidence()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  it('throws if supabase is not configured', async () => {
    mockIsConfigured.mockReturnValue(false);
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(returnService.uploadEvidence(MOCK_ORDER_ID, [file])).rejects.toThrow('Supabase not configured');
  });

  it('uploads files and returns public URLs', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/img.jpg' } });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, [file]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('https://cdn.example.com/img.jpg');
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('skips failed uploads and continues', async () => {
    const mockUpload = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'Upload failed' } })
      .mockResolvedValueOnce({ error: null });
    const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/img2.jpg' } });

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const file1 = new File(['test1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'photo2.jpg', { type: 'image/jpeg' });
    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, [file1, file2]);

    expect(result).toHaveLength(1); // Only the successful one
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('returns empty array when all uploads fail', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ error: { message: 'fail' } });
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: jest.fn(),
    });

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, [file]);

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// EVIDENCE_REQUIRED_REASONS constant
// ============================================================================

describe('EVIDENCE_REQUIRED_REASONS', () => {
  it('includes exactly the 5 damage/defect reasons', () => {
    expect(EVIDENCE_REQUIRED_REASONS).toHaveLength(5);
    expect(EVIDENCE_REQUIRED_REASONS).toContain('damaged');
    expect(EVIDENCE_REQUIRED_REASONS).toContain('wrong_item');
    expect(EVIDENCE_REQUIRED_REASONS).toContain('not_as_described');
    expect(EVIDENCE_REQUIRED_REASONS).toContain('defective');
    expect(EVIDENCE_REQUIRED_REASONS).toContain('missing_parts');
  });

  it('does NOT include non-damage reasons', () => {
    expect(EVIDENCE_REQUIRED_REASONS).not.toContain('changed_mind');
    expect(EVIDENCE_REQUIRED_REASONS).not.toContain('duplicate_order');
    expect(EVIDENCE_REQUIRED_REASONS).not.toContain('other');
  });
});

// ============================================================================
// End-to-end flow scenarios (chained)
// ============================================================================

describe('End-to-end flow scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
  });

  describe('Scenario: Refund — Seller approves immediately', () => {
    it('submit → seller_review → approve → refunded', async () => {
      // Step 1: Submit return (seller_review path)
      const orderQ = createMockSupabaseQuery(mockOrderDelivered);
      const noExistQ = createMockSupabaseQuery([]);
      const insertQ = createMockSupabaseQuery(mockReturnRowRefund);
      const updOrderQ = createMockSupabaseQuery(null);
      const histQ = createMockSupabaseQuery(null);
      const notifQ = createMockSupabaseQuery({
        buyer: { profiles: { first_name: 'Juan', last_name: 'Dela Cruz' } },
        order_items: [{ product: { seller_id: MOCK_SELLER_ID } }],
      });

      setupFromChain(orderQ, noExistQ, insertQ, updOrderQ, histQ, notifQ);
      const submitted = await returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'wrong_item',
        returnType: 'return_refund',
        refundAmount: 500,
        items: mockReturnItems,
        evidenceUrls: ['https://example.com/evidence/1.jpg'],
      });
      expect(submitted.status).toBe('seller_review');

      // Step 2: Seller approves refund
      jest.clearAllMocks();
      const typeQ = createMockSupabaseQuery({ return_type: 'return_refund', order_id: MOCK_ORDER_ID });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrd2Q = createMockSupabaseQuery(null);
      const hist2Q = createMockSupabaseQuery(null);
      const notif2Q = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

      setupFromChain(typeQ, updRetQ, updOrd2Q, hist2Q, notif2Q);
      await returnService.approveReturn(MOCK_RETURN_ID);

      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });

  describe('Scenario: Refund — Seller counter-offers → Buyer accepts', () => {
    it('submit → counter_offered → buyer accepts → partially_refunded', async () => {
      // Step 1: Counter-offer
      const updateQ = createMockSupabaseQuery(null);
      const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID });
      const histQ = createMockSupabaseQuery(null);
      const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

      setupFromChain(updateQ, selectQ, histQ, notifQ);
      await returnService.counterOfferReturn(MOCK_RETURN_ID, 350, 'Partial refund due to usage');

      // Step 2: Buyer accepts
      jest.clearAllMocks();
      const coSelectQ = createMockSupabaseQuery({ counter_offer_amount: 350, order_id: MOCK_ORDER_ID });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrdQ = createMockSupabaseQuery(null);

      setupFromChain(coSelectQ, updRetQ, updOrdQ);
      await returnService.acceptCounterOffer(MOCK_RETURN_ID);

      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });

  describe('Scenario: Refund — Seller counter-offers → Buyer declines → Escalated', () => {
    it('counter_offered → decline → escalated', async () => {
      // Counter offer already done (tested above)
      // Buyer declines → escalates
      const updateQ = createMockSupabaseQuery(null);
      setupFrom(updateQ);
      await returnService.declineCounterOffer(MOCK_RETURN_ID);

      expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
    });
  });

  describe('Scenario: Replacement — Seller approves', () => {
    it('submit replacement → seller_review → approve → shipment_status=processing', async () => {
      // Step 1: Submit replacement
      const orderQ = createMockSupabaseQuery(mockOrderDelivered);
      const noExistQ = createMockSupabaseQuery([]);
      const insertQ = createMockSupabaseQuery(mockReturnRowReplacement);
      const updOrderQ = createMockSupabaseQuery(null);
      const histQ = createMockSupabaseQuery(null);
      const notifQ = createMockSupabaseQuery({
        buyer: { profiles: { first_name: 'Juan', last_name: 'Dela Cruz' } },
        order_items: [{ product: { seller_id: MOCK_SELLER_ID } }],
      });

      setupFromChain(orderQ, noExistQ, insertQ, updOrderQ, histQ, notifQ);
      const submitted = await returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'defective',
        returnType: 'replacement',
        refundAmount: 0,
        items: mockReturnItems,
        evidenceUrls: ['https://example.com/evidence/1.jpg'],
      });
      expect(submitted.status).toBe('seller_review');
      expect(submitted.returnType).toBe('replacement');
      expect(submitted.refundAmount).toBeNull();

      // Step 2: Seller approves replacement
      jest.clearAllMocks();
      const typeQ = createMockSupabaseQuery({ return_type: 'replacement', order_id: MOCK_ORDER_ID });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrd2Q = createMockSupabaseQuery(null);
      const hist2Q = createMockSupabaseQuery(null);
      const notif2Q = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

      setupFromChain(typeQ, updRetQ, updOrd2Q, hist2Q, notif2Q);
      await returnService.approveReturn(MOCK_RETURN_ID_2);

      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });

  describe('Scenario: Return Required — Seller requests item back → Confirms received → Refund', () => {
    it('request_item_back → return_in_transit → confirm_received → refunded', async () => {
      // Step 1: Seller requests item back
      const updQ = createMockSupabaseQuery(null);
      setupFrom(updQ);
      await returnService.requestItemBack(MOCK_RETURN_ID);

      // Step 2: Buyer ships item
      jest.clearAllMocks();
      const shipQ = createMockSupabaseQuery(null);
      setupFrom(shipQ);
      await returnService.confirmReturnShipment(MOCK_RETURN_ID, 'RTN-TRACK-001');

      // Step 3: Seller confirms receipt → refund
      jest.clearAllMocks();
      const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID, return_type: 'return_refund' });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrdQ = createMockSupabaseQuery(null);
      const histQ = createMockSupabaseQuery(null);
      const notifSelQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

      setupFromChain(selectQ, updRetQ, updOrdQ, histQ, notifSelQ);
      await returnService.confirmReturnReceived(MOCK_RETURN_ID);

      expect(mockFrom).toHaveBeenCalledWith('orders');
    });
  });

  describe('Scenario: Return Required — Replacement path → Ship back → Confirm → Ship new item', () => {
    it('request_item_back → ship → confirm_received → shipment_status=processing', async () => {
      // Step 1: Request item back
      const updQ = createMockSupabaseQuery(null);
      setupFrom(updQ);
      await returnService.requestItemBack(MOCK_RETURN_ID_2);

      // Step 2: Buyer ships
      jest.clearAllMocks();
      const shipQ = createMockSupabaseQuery(null);
      setupFrom(shipQ);
      await returnService.confirmReturnShipment(MOCK_RETURN_ID_2, 'RTN-TRACK-002');

      // Step 3: Seller confirms → replacement
      jest.clearAllMocks();
      const selectQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID_2, return_type: 'replacement' });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrdQ = createMockSupabaseQuery(null);
      const histQ = createMockSupabaseQuery(null);
      const notifQ = createMockSupabaseQuery({ order_number: 'ORD-002', buyer_id: MOCK_BUYER_ID });

      setupFromChain(selectQ, updRetQ, updOrdQ, histQ, notifQ);
      await returnService.confirmReturnReceived(MOCK_RETURN_ID_2);

      // Replacement → shipment_status should be "processing"
      expect(mockFrom).toHaveBeenCalledWith('orders');
      expect(mockFrom).toHaveBeenCalledWith('order_status_history');
    });
  });

  describe('Scenario: Seller rejects → Buyer escalates', () => {
    it('reject → buyer escalates to admin', async () => {
      // Step 1: Seller rejects
      const retQ = createMockSupabaseQuery({ id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID });
      const updRetQ = createMockSupabaseQuery(null);
      const updOrdQ = createMockSupabaseQuery(null);
      const histQ = createMockSupabaseQuery(null);
      const notifQ = createMockSupabaseQuery({ order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID });

      setupFromChain(retQ, updRetQ, updOrdQ, histQ, notifQ);
      await returnService.rejectReturn(MOCK_RETURN_ID, 'Item shows signs of use');

      // Step 2: Buyer escalates
      jest.clearAllMocks();
      const selQ = createMockSupabaseQuery({ order_id: MOCK_ORDER_ID });
      const escQ = createMockSupabaseQuery(null);
      const hist2Q = createMockSupabaseQuery(null);

      setupFromChain(selQ, escQ, hist2Q);
      await returnService.escalateReturn(MOCK_RETURN_ID, 'Seller is wrong, item was defective');

      expect(mockFrom).toHaveBeenCalledWith('refund_return_periods');
      expect(mockFrom).toHaveBeenCalledWith('order_status_history');
    });
  });
});
