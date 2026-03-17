/**
 * Mobile Return Store — Unit Tests
 * Tests the Zustand store that wraps returnService for seller + buyer flows.
 * Covers: fetchSellerReturns, approveReturn, rejectReturn, counterOfferReturn,
 * requestItemBack, confirmReturnReceived, createReturnRequest (legacy),
 * updateReturnStatus (legacy), getters.
 */

// ─── Mock returnService ──────────────────────────────────────────────────────
const mockGetReturnRequestsBySeller = jest.fn();
const mockApproveReturn = jest.fn();
const mockRejectReturn = jest.fn();
const mockCounterOfferReturn = jest.fn();
const mockRequestItemBack = jest.fn();
const mockConfirmReturnReceived = jest.fn();

jest.mock('@/services/returnService', () => ({
  returnService: {
    getReturnRequestsBySeller: mockGetReturnRequestsBySeller,
    approveReturn: mockApproveReturn,
    rejectReturn: mockRejectReturn,
    counterOfferReturn: mockCounterOfferReturn,
    requestItemBack: mockRequestItemBack,
    confirmReturnReceived: mockConfirmReturnReceived,
  },
  MobileReturnRequest: {},
}));

jest.mock('@/services/notificationService', () => ({
  notificationService: {
    notifySellerReturnRequest: jest.fn().mockReturnValue(Promise.resolve()),
    notifyBuyerReturnStatus: jest.fn().mockReturnValue(Promise.resolve()),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useReturnStore } from '@/stores/returnStore';
import type { MobileReturnRequest } from '@/services/returnService';
import type { ReturnRequest } from '@/types';
import {
  MOCK_ORDER_ID,
  MOCK_RETURN_ID,
  MOCK_BUYER_ID,
  MOCK_SELLER_ID,
  MOCK_RETURN_ID_2,
} from './mocks/returnMocks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSellerReturn(overrides: Partial<MobileReturnRequest> = {}): MobileReturnRequest {
  return {
    id: MOCK_RETURN_ID,
    orderId: MOCK_ORDER_ID,
    isReturnable: true,
    returnWindowDays: 7,
    returnReason: 'damaged',
    refundAmount: 850,
    refundDate: null,
    createdAt: new Date().toISOString(),
    status: 'seller_review',
    returnType: 'return_refund',
    resolutionPath: 'seller_review',
    description: 'Damaged item',
    evidenceUrls: ['https://example.com/photo.jpg'],
    itemsJson: null,
    sellerNote: null,
    rejectedReason: null,
    counterOfferAmount: null,
    sellerDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    escalatedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    returnLabelUrl: null,
    returnTrackingNumber: null,
    buyerShippedAt: null,
    returnReceivedAt: null,
    orderNumber: 'ORD-001',
    orderStatus: 'returned',
    paymentStatus: 'paid',
    buyerName: 'Juan Dela Cruz',
    buyerEmail: 'juan@test.com',
    ...overrides,
  };
}

function makeReplacementReturn(overrides: Partial<MobileReturnRequest> = {}): MobileReturnRequest {
  return makeSellerReturn({ returnType: 'replacement', ...overrides });
}

function makeLegacyRequest(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: `ret_${Date.now()}`,
    orderId: MOCK_ORDER_ID,
    userId: MOCK_BUYER_ID,
    sellerId: MOCK_SELLER_ID,
    items: [{ itemId: 'item-1', quantity: 1 }],
    reason: 'damaged',
    description: 'Broken',
    images: [],
    type: 'return_refund',
    status: 'pending' as any,
    amount: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    ...overrides,
  };
}

function resetStore() {
  useReturnStore.setState({
    returnRequests: [],
    sellerReturns: [],
    isLoading: false,
    error: null,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();

  // Re-setup notification mocks after clearAllMocks removes return values
  const { notificationService } = require('@/services/notificationService');
  notificationService.notifySellerReturnRequest.mockReturnValue(Promise.resolve());
  notificationService.notifyBuyerReturnStatus.mockReturnValue(Promise.resolve());
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: fetchSellerReturns
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchSellerReturns()', () => {
  it('sets isLoading=true then false after success', async () => {
    mockGetReturnRequestsBySeller.mockResolvedValue([makeSellerReturn()]);

    const promise = useReturnStore.getState().fetchSellerReturns(MOCK_SELLER_ID);
    // isLoading should be true immediately
    expect(useReturnStore.getState().isLoading).toBe(true);

    await promise;
    expect(useReturnStore.getState().isLoading).toBe(false);
    expect(useReturnStore.getState().sellerReturns).toHaveLength(1);
  });

  it('loads both refund and replacement returns', async () => {
    mockGetReturnRequestsBySeller.mockResolvedValue([
      makeSellerReturn(),
      makeReplacementReturn({ id: MOCK_RETURN_ID_2 }),
    ]);

    await useReturnStore.getState().fetchSellerReturns(MOCK_SELLER_ID);
    const state = useReturnStore.getState();
    expect(state.sellerReturns).toHaveLength(2);
    expect(state.sellerReturns[0].returnType).toBe('return_refund');
    expect(state.sellerReturns[1].returnType).toBe('replacement');
  });

  it('sets error on failure', async () => {
    mockGetReturnRequestsBySeller.mockRejectedValue(new Error('Network error'));

    await useReturnStore.getState().fetchSellerReturns(MOCK_SELLER_ID);
    const state = useReturnStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: approveReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('approveReturn()', () => {
  it('approves and updates local state to approved', async () => {
    mockApproveReturn.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await useReturnStore.getState().approveReturn(MOCK_RETURN_ID);

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('approved');
    expect(state.sellerReturns[0].refundDate).not.toBeNull();
  });

  it('approves a replacement return', async () => {
    mockApproveReturn.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeReplacementReturn()] });

    await useReturnStore.getState().approveReturn(MOCK_RETURN_ID);
    expect(useReturnStore.getState().sellerReturns[0].status).toBe('approved');
  });

  it('does nothing if return not found in state', async () => {
    mockApproveReturn.mockResolvedValue(undefined);

    await useReturnStore.getState().approveReturn('nonexistent');
    expect(useReturnStore.getState().sellerReturns).toHaveLength(0);
  });

  it('sets error on failure and re-throws', async () => {
    mockApproveReturn.mockRejectedValue(new Error('Approve failed'));
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await expect(useReturnStore.getState().approveReturn(MOCK_RETURN_ID)).rejects.toThrow('Approve failed');
    expect(useReturnStore.getState().error).toBe('Approve failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: rejectReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('rejectReturn()', () => {
  it('rejects with reason and updates local state', async () => {
    mockRejectReturn.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await useReturnStore.getState().rejectReturn(MOCK_RETURN_ID, 'Item was used');

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('rejected');
    expect(state.sellerReturns[0].rejectedReason).toBe('Item was used');
  });

  it('rejects without reason (defaults to "Rejected by seller")', async () => {
    mockRejectReturn.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await useReturnStore.getState().rejectReturn(MOCK_RETURN_ID);

    expect(useReturnStore.getState().sellerReturns[0].rejectedReason).toBe('Rejected by seller');
  });

  it('does nothing if return not found', async () => {
    mockRejectReturn.mockResolvedValue(undefined);
    await useReturnStore.getState().rejectReturn('nonexistent');
    expect(useReturnStore.getState().sellerReturns).toHaveLength(0);
  });

  it('sets error on failure and re-throws', async () => {
    mockRejectReturn.mockRejectedValue(new Error('Reject failed'));
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await expect(useReturnStore.getState().rejectReturn(MOCK_RETURN_ID)).rejects.toThrow('Reject failed');
    expect(useReturnStore.getState().error).toBe('Reject failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: counterOfferReturn
// ═══════════════════════════════════════════════════════════════════════════════

describe('counterOfferReturn()', () => {
  it('sends counter-offer and updates local state', async () => {
    mockCounterOfferReturn.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await useReturnStore.getState().counterOfferReturn(MOCK_RETURN_ID, 400, 'Best we can offer');

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('counter_offered');
    expect(state.sellerReturns[0].counterOfferAmount).toBe(400);
    expect(state.sellerReturns[0].sellerNote).toBe('Best we can offer');
  });

  it('sets error on failure and re-throws', async () => {
    mockCounterOfferReturn.mockRejectedValue(new Error('Counter failed'));
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await expect(useReturnStore.getState().counterOfferReturn(MOCK_RETURN_ID, 400, 'nope')).rejects.toThrow('Counter failed');
    expect(useReturnStore.getState().error).toBe('Counter failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: requestItemBack
// ═══════════════════════════════════════════════════════════════════════════════

describe('requestItemBack()', () => {
  it('sets status to return_in_transit and resolution_path to return_required', async () => {
    mockRequestItemBack.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await useReturnStore.getState().requestItemBack(MOCK_RETURN_ID);

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('return_in_transit');
    expect(state.sellerReturns[0].resolutionPath).toBe('return_required');
  });

  it('sets error on failure and re-throws', async () => {
    mockRequestItemBack.mockRejectedValue(new Error('Failed'));
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await expect(useReturnStore.getState().requestItemBack(MOCK_RETURN_ID)).rejects.toThrow('Failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER: confirmReturnReceived
// ═══════════════════════════════════════════════════════════════════════════════

describe('confirmReturnReceived()', () => {
  it('marks return as refunded with timestamps', async () => {
    mockConfirmReturnReceived.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeSellerReturn({ status: 'return_in_transit' })] });

    await useReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID);

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('refunded');
    expect(state.sellerReturns[0].returnReceivedAt).not.toBeNull();
    expect(state.sellerReturns[0].refundDate).not.toBeNull();
  });

  it('marks replacement return with timestamps', async () => {
    mockConfirmReturnReceived.mockResolvedValue(undefined);
    useReturnStore.setState({ sellerReturns: [makeReplacementReturn({ status: 'return_in_transit' })] });

    await useReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID);

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('refunded');
    expect(state.sellerReturns[0].returnReceivedAt).not.toBeNull();
  });

  it('sets error on failure and re-throws', async () => {
    mockConfirmReturnReceived.mockRejectedValue(new Error('Fail'));
    useReturnStore.setState({ sellerReturns: [makeSellerReturn()] });

    await expect(useReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID)).rejects.toThrow('Fail');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY BUYER: createReturnRequest
// ═══════════════════════════════════════════════════════════════════════════════

describe('createReturnRequest() (legacy buyer flow)', () => {
  it('adds a new return request to state with initial history', () => {
    useReturnStore.getState().createReturnRequest({
      orderId: MOCK_ORDER_ID,
      userId: MOCK_BUYER_ID,
      sellerId: MOCK_SELLER_ID,
      items: [{ itemId: 'item-1', quantity: 1 }],
      reason: 'damaged',
      description: 'Broken package',
      images: ['https://example.com/img.jpg'],
      type: 'return_refund',
      amount: 500,
    });

    const state = useReturnStore.getState();
    expect(state.returnRequests).toHaveLength(1);
    const req = state.returnRequests[0];
    expect(req.orderId).toBe(MOCK_ORDER_ID);
    expect(req.status).toBe('pending');
    expect(req.history).toHaveLength(1);
    expect(req.history[0].note).toBe('Request initiated');
  });

  it('prepends new request (newest first)', () => {
    // Add two requests
    const store = useReturnStore.getState();
    store.createReturnRequest({
      orderId: MOCK_ORDER_ID,
      userId: MOCK_BUYER_ID,
      sellerId: MOCK_SELLER_ID,
      items: [{ itemId: 'item-1', quantity: 1 }],
      reason: 'damaged',
      description: 'First',
      images: [],
      type: 'return_refund',
      amount: 100,
    });

    useReturnStore.getState().createReturnRequest({
      orderId: 'order-2',
      userId: MOCK_BUYER_ID,
      sellerId: MOCK_SELLER_ID,
      items: [{ itemId: 'item-2', quantity: 1 }],
      reason: 'damaged',
      description: 'Second',
      images: [],
      type: 'return_refund',
      amount: 200,
    });

    const state = useReturnStore.getState();
    expect(state.returnRequests).toHaveLength(2);
    expect(state.returnRequests[0].description).toBe('Second');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY: updateReturnStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateReturnStatus() (legacy)', () => {
  it('updates status and adds history entry', () => {
    const req = makeLegacyRequest({ id: 'ret-1' });
    useReturnStore.setState({ returnRequests: [req] });

    useReturnStore.getState().updateReturnStatus('ret-1', 'approved' as any, 'Approved by seller', 'seller');

    const state = useReturnStore.getState();
    expect(state.returnRequests[0].status).toBe('approved');
    expect(state.returnRequests[0].history).toHaveLength(1);
    expect(state.returnRequests[0].history[0].note).toBe('Approved by seller');
    expect(state.returnRequests[0].history[0].by).toBe('seller');
  });

  it('does not crash if request not found', () => {
    useReturnStore.getState().updateReturnStatus('nonexistent', 'rejected' as any);
    expect(useReturnStore.getState().returnRequests).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Store getters', () => {
  it('getReturnRequestsByOrder filters by orderId', () => {
    const r1 = makeLegacyRequest({ id: 'ret-1', orderId: 'order-a' });
    const r2 = makeLegacyRequest({ id: 'ret-2', orderId: 'order-b' });
    useReturnStore.setState({ returnRequests: [r1, r2] });

    expect(useReturnStore.getState().getReturnRequestsByOrder('order-a')).toHaveLength(1);
    expect(useReturnStore.getState().getReturnRequestsByOrder('order-c')).toHaveLength(0);
  });

  it('getReturnRequestsByUser filters by userId', () => {
    const r1 = makeLegacyRequest({ id: 'ret-1', userId: 'user-a' });
    const r2 = makeLegacyRequest({ id: 'ret-2', userId: 'user-b' });
    useReturnStore.setState({ returnRequests: [r1, r2] });

    expect(useReturnStore.getState().getReturnRequestsByUser('user-a')).toHaveLength(1);
  });

  it('getReturnRequestsBySeller filters by sellerId', () => {
    const r1 = makeLegacyRequest({ id: 'ret-1', sellerId: 'seller-a' });
    const r2 = makeLegacyRequest({ id: 'ret-2', sellerId: 'seller-b' });
    useReturnStore.setState({ returnRequests: [r1, r2] });

    expect(useReturnStore.getState().getReturnRequestsBySeller('seller-a')).toHaveLength(1);
  });

  it('getReturnRequestById finds by id', () => {
    const r1 = makeLegacyRequest({ id: 'ret-1' });
    useReturnStore.setState({ returnRequests: [r1] });

    expect(useReturnStore.getState().getReturnRequestById('ret-1')).toBeDefined();
    expect(useReturnStore.getState().getReturnRequestById('nonexistent')).toBeUndefined();
  });

  it('getSellerReturnById finds seller return by id', () => {
    const sr = makeSellerReturn();
    useReturnStore.setState({ sellerReturns: [sr] });

    expect(useReturnStore.getState().getSellerReturnById(MOCK_RETURN_ID)).toBeDefined();
    expect(useReturnStore.getState().getSellerReturnById('nonexistent')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-REQUEST ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multi-request isolation', () => {
  it('only updates the targeted seller return, leaving others unchanged', async () => {
    mockApproveReturn.mockResolvedValue(undefined);
    const r1 = makeSellerReturn({ id: MOCK_RETURN_ID, status: 'seller_review' });
    const r2 = makeSellerReturn({ id: MOCK_RETURN_ID_2, status: 'seller_review' });
    useReturnStore.setState({ sellerReturns: [r1, r2] });

    await useReturnStore.getState().approveReturn(MOCK_RETURN_ID);

    const state = useReturnStore.getState();
    expect(state.sellerReturns[0].status).toBe('approved');
    expect(state.sellerReturns[1].status).toBe('seller_review'); // unchanged
  });
});
