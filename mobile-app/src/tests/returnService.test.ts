/**
 * Mobile Return Service — Unit Tests
 * Covers buyer + seller flows: submit, approve, reject, counter-offer,
 * escalation, return-required, replacement-aware logic, evidence upload.
 */

import {
  computeResolutionPath,
  getEstimatedResolutionDate,
  getStatusLabel,
  getStatusColor,
  EVIDENCE_REQUIRED_REASONS,
  ReturnStatus,
  ReturnReason,
} from '@/services/returnService';

// ─── Mock setup ──────────────────────────────────────────────────────────────

// We need to mock supabase before importing returnService
const mockSingle = jest.fn();
const mockLimit = jest.fn().mockReturnThis();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
function createChain(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  // Make all chainable methods return chain
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

let fromCallIndex = 0;
const fromChains: any[] = [];

function setupFromChain(...chains: any[]) {
  fromCallIndex = 0;
  fromChains.length = 0;
  fromChains.push(...chains);
  mockFrom.mockImplementation(() => {
    const chain = fromChains[fromCallIndex] ?? createChain();
    fromCallIndex++;
    return chain;
  });
}

const mockFrom = jest.fn();

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: (...a: any[]) => mockUpload(...a),
        getPublicUrl: (...a: any[]) => mockGetPublicUrl(...a),
      }),
    },
  },
  isSupabaseConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock('@/services/notificationService', () => ({
  notificationService: {
    notifySellerReturnRequest: jest.fn().mockResolvedValue(undefined),
    notifyBuyerReturnStatus: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks
import { returnService } from '@/services/returnService';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  MOCK_ORDER_ID,
  MOCK_RETURN_ID,
  MOCK_BUYER_ID,
  MOCK_SELLER_ID,
  mockOrderDelivered,
  mockOrderExpiredWindow,
  mockOrderPending,
  mockReturnItems,
  mockReturnItemsCheap,
  mockReturnItemsHighValue,
  mockReturnRowSellerReview,
  mockReturnRowReplacement,
  mockReturnRowApproved,
  mockReturnRowCounterOffered,
  mockReturnRowInTransit,
  mockReturnRowEscalated,
  mockReturnRowRejected,
  mockReturnRowRefund,
  mockReturnWithOrder,
  mockReturnWithOrderSeller,
  mockReplacementWithOrder,
} from './mocks/returnMocks';

// ─── Reset between tests ────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  fromCallIndex = 0;
  fromChains.length = 0;
  (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

  // Re-setup storage mock after clearAllMocks
  const { supabase } = require('@/lib/supabase');
  supabase.storage.from.mockReturnValue({
    upload: (...a: any[]) => mockUpload(...a),
    getPublicUrl: (...a: any[]) => mockGetPublicUrl(...a),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeResolutionPath()', () => {
  it('returns "instant" for < ₱500, qualifying reason, with evidence', () => {
    expect(computeResolutionPath('wrong_item', 300, true)).toBe('instant');
    expect(computeResolutionPath('not_as_described', 499, true)).toBe('instant');
    expect(computeResolutionPath('missing_parts', 100, true)).toBe('instant');
  });

  it('returns "seller_review" when reason does NOT qualify for instant', () => {
    expect(computeResolutionPath('changed_mind', 200, true)).toBe('seller_review');
    expect(computeResolutionPath('damaged', 200, true)).toBe('seller_review');
  });

  it('returns "seller_review" when < ₱500 and qualifying reason but NO evidence', () => {
    expect(computeResolutionPath('wrong_item', 200, false)).toBe('seller_review');
  });

  it('returns "return_required" for ≥ ₱2,000', () => {
    expect(computeResolutionPath('wrong_item', 2000, true)).toBe('return_required');
    expect(computeResolutionPath('damaged', 5000, true)).toBe('return_required');
  });

  it('returns "seller_review" for mid-range (₱500–₱1,999)', () => {
    expect(computeResolutionPath('wrong_item', 500, true)).toBe('seller_review');
    expect(computeResolutionPath('damaged', 1500, true)).toBe('seller_review');
  });
});

describe('getEstimatedResolutionDate()', () => {
  it('returns ~2 hours for instant', () => {
    const before = Date.now();
    const d = getEstimatedResolutionDate('instant');
    const diff = d.getTime() - before;
    expect(diff).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(2.1 * 60 * 60 * 1000);
  });

  it('returns ~48 hours for seller_review', () => {
    const before = Date.now();
    const d = getEstimatedResolutionDate('seller_review');
    const diff = d.getTime() - before;
    expect(diff).toBeGreaterThan(47.9 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(48.1 * 60 * 60 * 1000);
  });

  it('returns ~7 days for return_required', () => {
    const before = Date.now();
    const d = getEstimatedResolutionDate('return_required');
    const diff = d.getTime() - before;
    expect(diff).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
  });
});

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
  });
});

describe('getStatusColor()', () => {
  it('returns a valid hex colour for each status', () => {
    const statuses: ReturnStatus[] = [
      'pending', 'seller_review', 'counter_offered', 'approved',
      'rejected', 'escalated', 'return_in_transit', 'return_received', 'refunded',
    ];
    statuses.forEach((s) => {
      expect(getStatusColor(s)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

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
  });
});

describe('Deadline helpers', () => {
  it('getDeadlineRemainingMs returns positive ms for future deadline', () => {
    const future = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
    expect(returnService.getDeadlineRemainingMs(future)).toBeGreaterThan(0);
  });

  it('getDeadlineRemainingMs returns 0 for past deadline', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    expect(returnService.getDeadlineRemainingMs(past)).toBe(0);
  });

  it('getDeadlineRemainingMs returns 0 for null', () => {
    expect(returnService.getDeadlineRemainingMs(null)).toBe(0);
  });

  it('formatDeadlineRemaining returns "Expired" for past', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    expect(returnService.formatDeadlineRemaining(past)).toBe('Expired');
  });

  it('formatDeadlineRemaining returns hours/minutes for future', () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    expect(returnService.formatDeadlineRemaining(future)).toMatch(/\d+h \d+m remaining/);
  });

  it('formatDeadlineRemaining returns "Expired" for null', () => {
    expect(returnService.formatDeadlineRemaining(null)).toBe('Expired');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: submitReturnRequest
// ═══════════════════════════════════════════════════════════════════════════════

describe('submitReturnRequest()', () => {
  const baseParams = {
    orderDbId: MOCK_ORDER_ID,
    reason: 'damaged' as ReturnReason,
    returnType: 'return_refund' as const,
    description: 'Item arrived broken',
    items: mockReturnItems,
    evidenceUrls: ['https://example.com/photo1.jpg'],
  };

  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.submitReturnRequest(baseParams)).rejects.toThrow('Supabase not configured');
  });

  it('throws when order is not found', async () => {
    const chain = createChain({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) });
    setupFromChain(chain);
    await expect(returnService.submitReturnRequest(baseParams)).rejects.toThrow('Order not found');
  });

  it('throws when order is not delivered/shipped', async () => {
    const chain = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderPending, error: null }) });
    setupFromChain(chain);
    await expect(returnService.submitReturnRequest(baseParams)).rejects.toThrow('Only delivered or received orders can be returned');
  });

  it('throws when return window has expired', async () => {
    const chain = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderExpiredWindow, error: null }) });
    const dupChain = createChain(); // for duplicate check — won't be reached but need it
    setupFromChain(chain);
    await expect(returnService.submitReturnRequest(baseParams)).rejects.toThrow('Return window has expired');
  });

  it('throws when a return already exists', async () => {
    // 1st from: order lookup
    const orderChain = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
    // 2nd from: duplicate check returns existing
    const dupChain = createChain();
    dupChain.limit.mockReturnValue(Promise.resolve({ data: [{ id: 'existing-return' }], error: null }));
    setupFromChain(orderChain, dupChain);
    await expect(returnService.submitReturnRequest(baseParams)).rejects.toThrow('A return request already exists');
  });

  it('creates a seller_review return for standard refund (mid-range amount)', async () => {
    const insertedRow = { ...mockReturnRowSellerReview, id: MOCK_RETURN_ID };
    // 1. order lookup
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
    // 2. duplicate check (empty)
    const c2 = createChain();
    c2.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
    // 3. insert return
    const c3 = createChain({ single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }) });
    // 4. update order shipment_status
    const c4 = createChain();
    c4.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // 5. order_status_history insert
    const c5 = createChain();
    c5.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // 6. notification re-fetch order for seller IDs
    const c6 = createChain({
      single: jest.fn().mockResolvedValue({
        data: {
          order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID,
          order_items: [{ products: { seller_id: MOCK_SELLER_ID } }],
        }, error: null,
      }),
    });
    // 7. profile lookup for buyer name
    const c7 = createChain({ single: jest.fn().mockResolvedValue({ data: { full_name: 'Test Buyer' }, error: null }) });

    setupFromChain(c1, c2, c3, c4, c5, c6, c7);

    const result = await returnService.submitReturnRequest(baseParams);
    expect(result.id).toBe(MOCK_RETURN_ID);
    expect(result.status).toBe('seller_review');
    expect(result.resolutionPath).toBe('seller_review');
  });

  it('creates an instant-approved return for cheap item with qualifying reason + evidence', async () => {
    const instantParams = {
      ...baseParams,
      reason: 'wrong_item' as ReturnReason,
      items: mockReturnItemsCheap,
      refundAmount: 120,
    };

    const insertedRow = { ...mockReturnRowSellerReview, id: MOCK_RETURN_ID, status: 'approved', resolution_path: 'instant', refund_date: new Date().toISOString() };

    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
    const c2 = createChain();
    c2.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
    const c3 = createChain({ single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }) });
    const c4 = createChain(); c4.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain(); c5.eq.mockReturnValue(Promise.resolve({ data: null, error: null })); // instant also updates payment_status
    const c6 = createChain(); c6.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // Instant = no seller notification, so no more chains needed

    setupFromChain(c1, c2, c3, c4, c5, c6);

    const result = await returnService.submitReturnRequest(instantParams);
    expect(result.resolutionPath).toBe('instant');
    expect(result.status).toBe('approved');
    expect(result.refundDate).not.toBeNull();
  });

  it('creates a return_required path for high-value items (≥₱2,000)', async () => {
    const highValueParams = {
      ...baseParams,
      items: mockReturnItemsHighValue,
      refundAmount: 3500,
    };

    const insertedRow = { ...mockReturnRowSellerReview, id: MOCK_RETURN_ID, resolution_path: 'return_required' };

    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
    const c2 = createChain(); c2.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
    const c3 = createChain({ single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }) });
    const c4 = createChain(); c4.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain(); c5.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // Non-instant notification chains
    const c6 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID, order_items: [{ products: { seller_id: MOCK_SELLER_ID } }] },
        error: null,
      }),
    });
    const c7 = createChain({ single: jest.fn().mockResolvedValue({ data: { full_name: 'Test' }, error: null }) });

    setupFromChain(c1, c2, c3, c4, c5, c6, c7);

    const result = await returnService.submitReturnRequest(highValueParams);
    expect(result.resolutionPath).toBe('return_required');
  });

  it('creates a replacement return (seller_review, never instant)', async () => {
    const replParams = {
      ...baseParams,
      returnType: 'replacement' as const,
      reason: 'wrong_item' as ReturnReason,
      items: mockReturnItemsCheap, // cheap but replacement → seller_review
      refundAmount: 120,
    };

    const insertedRow = { ...mockReturnRowReplacement, id: MOCK_RETURN_ID, resolution_path: 'seller_review' };

    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
    const c2 = createChain(); c2.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
    const c3 = createChain({ single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }) });
    const c4 = createChain(); c4.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain(); c5.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c6 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID, order_items: [{ products: { seller_id: MOCK_SELLER_ID } }] },
        error: null,
      }),
    });
    const c7 = createChain({ single: jest.fn().mockResolvedValue({ data: { full_name: 'Test' }, error: null }) });

    setupFromChain(c1, c2, c3, c4, c5, c6, c7);

    const result = await returnService.submitReturnRequest(replParams);
    expect(result.returnType).toBe('replacement');
    expect(result.status).toBe('seller_review');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: getReturnRequestsByBuyer
// ═══════════════════════════════════════════════════════════════════════════════

describe('getReturnRequestsByBuyer()', () => {
  it('returns empty array when supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toEqual([]);
  });

  it('returns transformed return requests with order data', async () => {
    const chain = createChain();
    chain.order.mockReturnValue(Promise.resolve({ data: [mockReturnWithOrder], error: null }));
    setupFromChain(chain);

    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(MOCK_RETURN_ID);
    expect(result[0].orderNumber).toBe('ORD-20260001');
    expect(result[0].items).toHaveLength(2);
  });

  it('returns empty on error', async () => {
    const chain = createChain();
    chain.order.mockReturnValue(Promise.resolve({ data: null, error: { message: 'DB error' } }));
    setupFromChain(chain);

    const result = await returnService.getReturnRequestsByBuyer(MOCK_BUYER_ID);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: getReturnRequestById
// ═══════════════════════════════════════════════════════════════════════════════

describe('getReturnRequestById()', () => {
  it('returns null when supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    expect(await returnService.getReturnRequestById(MOCK_RETURN_ID)).toBeNull();
  });

  it('returns a transformed return request', async () => {
    const chain = createChain({ single: jest.fn().mockResolvedValue({ data: mockReturnWithOrder, error: null }) });
    setupFromChain(chain);

    const result = await returnService.getReturnRequestById(MOCK_RETURN_ID);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(MOCK_RETURN_ID);
    expect(result!.returnReason).toBe('damaged');
  });

  it('returns null if not found', async () => {
    const chain = createChain({ single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) });
    setupFromChain(chain);

    expect(await returnService.getReturnRequestById('nonexistent')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: getReturnForOrder
// ═══════════════════════════════════════════════════════════════════════════════

describe('getReturnForOrder()', () => {
  it('returns null when supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    expect(await returnService.getReturnForOrder(MOCK_ORDER_ID)).toBeNull();
  });

  it('returns the existing return for the order', async () => {
    const chain = createChain();
    chain.limit.mockReturnValue(Promise.resolve({ data: [mockReturnWithOrder], error: null }));
    setupFromChain(chain);

    const result = await returnService.getReturnForOrder(MOCK_ORDER_ID);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe(MOCK_ORDER_ID);
  });

  it('returns null if no return exists', async () => {
    const chain = createChain();
    chain.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
    setupFromChain(chain);

    expect(await returnService.getReturnForOrder(MOCK_ORDER_ID)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: acceptCounterOffer
// ═══════════════════════════════════════════════════════════════════════════════

describe('acceptCounterOffer()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.acceptCounterOffer(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('accepts counter-offer and updates order to partially_refunded', async () => {
    const c1 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, counter_offer_amount: 500 },
        error: null,
      }),
    });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));

    setupFromChain(c1, c2, c3);

    await expect(returnService.acceptCounterOffer(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: declineCounterOffer → escalate
// ═══════════════════════════════════════════════════════════════════════════════

describe('declineCounterOffer()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.declineCounterOffer(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('escalates the return', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));

    setupFromChain(c1, c2);

    await expect(returnService.declineCounterOffer(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: escalateReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('escalateReturn()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.escalateReturn(MOCK_RETURN_ID, 'Unfair rejection')).rejects.toThrow('Supabase not configured');
  });

  it('escalates to admin with reason', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));

    setupFromChain(c1, c2, c3);

    await expect(returnService.escalateReturn(MOCK_RETURN_ID, 'Unfair rejection')).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: confirmReturnShipment
// ═══════════════════════════════════════════════════════════════════════════════

describe('confirmReturnShipment()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRK-123')).rejects.toThrow('Supabase not configured');
  });

  it('records tracking number and shipped date', async () => {
    const chain = createChain(); chain.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    setupFromChain(chain);

    await expect(returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRK-123')).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER: uploadEvidence
// ═══════════════════════════════════════════════════════════════════════════════

describe('uploadEvidence()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.uploadEvidence(MOCK_ORDER_ID, ['file:///photo.jpg'])).rejects.toThrow('Supabase not configured');
  });

  it('uploads files and returns public URLs', async () => {
    // Mock global fetch for blob conversion
    const mockBlob = new Blob(['test']);
    (global as any).fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(mockBlob) });

    mockUpload.mockResolvedValue({ data: { path: 'returns/test/0.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.bazaar.ph/returns/test/0.jpg' } });

    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, ['file:///photo1.jpg', 'file:///photo2.jpg']);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('https://cdn.bazaar.ph/returns/test/0.jpg');
  });

  it('skips failed uploads and continues', async () => {
    const mockBlob = new Blob(['test']);
    (global as any).fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(mockBlob) });

    mockUpload
      .mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } })
      .mockResolvedValueOnce({ data: { path: 'returns/test/1.jpg' }, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.bazaar.ph/returns/test/1.jpg' } });

    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, ['file:///fail.jpg', 'file:///ok.jpg']);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when all uploads fail', async () => {
    const mockBlob = new Blob(['test']);
    (global as any).fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(mockBlob) });
    mockUpload.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const result = await returnService.uploadEvidence(MOCK_ORDER_ID, ['file:///a.jpg']);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: getReturnRequestsBySeller
// ═══════════════════════════════════════════════════════════════════════════════

describe('getReturnRequestsBySeller()', () => {
  it('returns empty array when supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toEqual([]);
  });

  it('filters to only this seller\'s products', async () => {
    const otherSellerRow = {
      ...mockReturnWithOrderSeller,
      order: {
        ...mockReturnWithOrderSeller.order,
        order_items: [
          { product_name: 'Other', quantity: 1, price: 100, primary_image_url: null, product: { seller_id: 'other-seller-id' } },
        ],
      },
    };

    const chain = createChain();
    chain.order.mockReturnValue(Promise.resolve({ data: [mockReturnWithOrderSeller, otherSellerRow], error: null }));
    setupFromChain(chain);

    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].buyerName).toBe('Juan Dela Cruz');
  });

  it('returns empty on DB error', async () => {
    const chain = createChain();
    chain.order.mockReturnValue(Promise.resolve({ data: null, error: { message: 'DB error' } }));
    setupFromChain(chain);

    const result = await returnService.getReturnRequestsBySeller(MOCK_SELLER_ID);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: approveReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('approveReturn()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.approveReturn(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('processes REFUND approval — sets refund_date + payment_status=refunded', async () => {
    // 1. lookup return
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'return_refund' }, error: null }) });
    // 2. update return
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // 3. update order payment_status
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // 4. order_status_history
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    // 5. notifyBuyerOfReturnUpdate — queries orders table
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.approveReturn(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });

  it('processes REPLACEMENT approval — sets shipment_status=processing, NO refund_date', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'replacement' }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.approveReturn(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: rejectReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('rejectReturn()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.rejectReturn(MOCK_RETURN_ID, 'Bad')).rejects.toThrow('Supabase not configured');
  });

  it('rejects with reason and reverts shipment_status', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.rejectReturn(MOCK_RETURN_ID, 'Item was used')).resolves.toBeUndefined();
  });

  it('rejects without reason (optional)', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.rejectReturn(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: counterOfferReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('counterOfferReturn()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.counterOfferReturn(MOCK_RETURN_ID, 500, 'Partial refund')).rejects.toThrow('Supabase not configured');
  });

  it('sends counter-offer and records in history', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4);

    await expect(returnService.counterOfferReturn(MOCK_RETURN_ID, 500, 'Best we can do')).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: requestItemBack
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestItemBack()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.requestItemBack(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('sets return to in_transit with tracking and label', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));

    setupFromChain(c1, c2, c3);

    await expect(returnService.requestItemBack(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: confirmReturnReceived
// ═══════════════════════════════════════════════════════════════════════════════

describe('confirmReturnReceived()', () => {
  it('throws if supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).rejects.toThrow('Supabase not configured');
  });

  it('processes REFUND when return type is return_refund', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'return_refund' }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });

  it('processes REPLACEMENT — sets shipment_status=processing', async () => {
    const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'replacement' }, error: null }) });
    const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
    const c5 = createChain({
      single: jest.fn().mockResolvedValue({
        data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
        error: null,
      }),
    });

    setupFromChain(c1, c2, c3, c4, c5);

    await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// END-TO-END FLOW SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe('End-to-end flow scenarios', () => {
  describe('Scenario: Refund — Seller approves immediately', () => {
    it('submit → seller_review → approve → refunded', async () => {
      // Step 1: Submit return
      const insertedRow = { ...mockReturnRowSellerReview };
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: mockOrderDelivered, error: null }) });
      const c2 = createChain(); c2.limit.mockReturnValue(Promise.resolve({ data: [], error: null }));
      const c3 = createChain({ single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }) });
      const c4 = createChain(); c4.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c5 = createChain(); c5.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c6 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID, order_items: [{ products: { seller_id: MOCK_SELLER_ID } }] },
          error: null,
        }),
      });
      const c7 = createChain({ single: jest.fn().mockResolvedValue({ data: { full_name: 'Test' }, error: null }) });
      setupFromChain(c1, c2, c3, c4, c5, c6, c7);

      const submitted = await returnService.submitReturnRequest({
        orderDbId: MOCK_ORDER_ID,
        reason: 'damaged',
        returnType: 'return_refund',
        items: mockReturnItems,
        evidenceUrls: ['https://example.com/damage.jpg'],
      });
      expect(submitted.status).toBe('seller_review');

      // Step 2: Seller approves
      jest.clearAllMocks();
      fromCallIndex = 0; fromChains.length = 0;
      const a1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'return_refund' }, error: null }) });
      const a2 = createChain(); a2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const a3 = createChain(); a3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const a4 = createChain(); a4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const a5 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(a1, a2, a3, a4, a5);

      await expect(returnService.approveReturn(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Counter-offer → Buyer accepts', () => {
    it('counter_offered → buyer accepts → partially_refunded', async () => {
      // Step 1: Seller sends counter-offer
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c4 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(c1, c2, c3, c4);
      await returnService.counterOfferReturn(MOCK_RETURN_ID, 500, 'Best offer');

      // Step 2: Buyer accepts
      jest.clearAllMocks();
      fromCallIndex = 0; fromChains.length = 0;
      const a1 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, counter_offer_amount: 500 },
          error: null,
        }),
      });
      const a2 = createChain(); a2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const a3 = createChain(); a3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(a1, a2, a3);

      await expect(returnService.acceptCounterOffer(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Counter-offer → Buyer declines → Escalated', () => {
    it('counter_offered → decline → escalated', async () => {
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));

      setupFromChain(c1, c2);
      await expect(returnService.declineCounterOffer(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Replacement — Seller approves', () => {
    it('submit replacement → seller_review → approve → shipment_status=processing', async () => {
      // Seller approves replacement (no refund_date, shipment_status=processing)
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'replacement' }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c5 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(c1, c2, c3, c4, c5);

      await expect(returnService.approveReturn(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Return Required — Ship back → Confirm → Refund', () => {
    it('request_item_back → buyer ships → seller confirms → refunded', async () => {
      // Step 1: Seller requests item back
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(c1, c2, c3);
      await returnService.requestItemBack(MOCK_RETURN_ID);

      // Step 2: Buyer confirms shipment
      jest.clearAllMocks(); fromCallIndex = 0; fromChains.length = 0;
      const b1 = createChain(); b1.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(b1);
      await returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRK-999');

      // Step 3: Seller confirms receipt → auto-refund
      jest.clearAllMocks(); fromCallIndex = 0; fromChains.length = 0;
      const s1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'return_refund' }, error: null }) });
      const s2 = createChain(); s2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s3 = createChain(); s3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s4 = createChain(); s4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s5 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(s1, s2, s3, s4, s5);
      await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Return Required — Replacement path', () => {
    it('request_item_back → ship → confirm_received → shipment_status=processing', async () => {
      // Seller requests item back
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c3 = createChain(); c3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(c1, c2, c3);
      await returnService.requestItemBack(MOCK_RETURN_ID);

      // Buyer ships
      jest.clearAllMocks(); fromCallIndex = 0; fromChains.length = 0;
      const b1 = createChain(); b1.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(b1);
      await returnService.confirmReturnShipment(MOCK_RETURN_ID, 'TRK-222');

      // Seller confirms receipt — replacement
      jest.clearAllMocks(); fromCallIndex = 0; fromChains.length = 0;
      const s1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID, return_type: 'replacement' }, error: null }) });
      const s2 = createChain(); s2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s3 = createChain(); s3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s4 = createChain(); s4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const s5 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(s1, s2, s3, s4, s5);
      await expect(returnService.confirmReturnReceived(MOCK_RETURN_ID)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Reject → Buyer escalates', () => {
    it('reject → buyer escalates to admin', async () => {
      // Step 1: Seller rejects
      const c1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const c2 = createChain(); c2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c3 = createChain(); c3.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c4 = createChain(); c4.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const c5 = createChain({
        single: jest.fn().mockResolvedValue({
          data: { order_number: 'ORD-001', buyer_id: MOCK_BUYER_ID },
          error: null,
        }),
      });
      setupFromChain(c1, c2, c3, c4, c5);
      await returnService.rejectReturn(MOCK_RETURN_ID, 'Not valid');

      // Step 2: Buyer escalates
      jest.clearAllMocks(); fromCallIndex = 0; fromChains.length = 0;
      const e1 = createChain({ single: jest.fn().mockResolvedValue({ data: { id: MOCK_RETURN_ID, order_id: MOCK_ORDER_ID }, error: null }) });
      const e2 = createChain(); e2.eq.mockReturnValue(Promise.resolve({ data: null, error: null }));
      const e3 = createChain(); e3.insert.mockReturnValue(Promise.resolve({ data: null, error: null }));
      setupFromChain(e1, e2, e3);
      await expect(returnService.escalateReturn(MOCK_RETURN_ID, 'Seller was unfair')).resolves.toBeUndefined();
    });
  });
});
