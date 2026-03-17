/**
 * SellerReturnStore — Comprehensive Unit Tests
 *
 * Tests the Zustand store that wraps ReturnService for seller UI.
 * Covers: load, approve, reject, counter-offer, request-item-back,
 *         confirm-received, escalate, status filtering, error handling.
 */

import { returnService, ReturnRequest, ReturnStatus } from '@/services/returnService';
import { useSellerReturnStore } from '@/stores/sellerReturnStore';
import {
  MOCK_ORDER_ID,
  MOCK_RETURN_ID,
  MOCK_SELLER_ID,
  MOCK_RETURN_ID_2,
  MOCK_ORDER_ID_2,
} from '../mocks/data/returns.mock';

// ---------------------------------------------------------------------------
// Mock the service (store delegates to service)
// ---------------------------------------------------------------------------

jest.mock('@/services/returnService', () => {
  const actual = jest.requireActual('@/services/returnService');
  return {
    ...actual,
    returnService: {
      getReturnRequestsBySeller: jest.fn(),
      approveReturn: jest.fn(),
      rejectReturn: jest.fn(),
      counterOfferReturn: jest.fn(),
      requestItemBack: jest.fn(),
      confirmReturnReceived: jest.fn(),
      escalateReturn: jest.fn(),
    },
  };
});

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
  isSupabaseConfigured: jest.fn(() => true),
}));

const mockService = returnService as jest.Mocked<typeof returnService>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReturnRequest(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
  return {
    id: MOCK_RETURN_ID,
    orderId: MOCK_ORDER_ID,
    orderNumber: 'ORD-001',
    buyerId: '33333333-3333-3333-3333-333333333333',
    buyerName: 'Juan Dela Cruz',
    buyerEmail: 'juan@example.com',
    isReturnable: true,
    returnWindowDays: 7,
    returnReason: 'wrong_item',
    refundAmount: 500,
    refundDate: null,
    createdAt: new Date().toISOString(),
    items: [
      { productName: 'Test Product A', quantity: 2, price: 250, image: null },
    ],
    orderStatus: 'delivered',
    paymentStatus: 'paid',
    status: 'seller_review',
    returnType: 'return_refund',
    resolutionPath: 'seller_review',
    itemsJson: null,
    evidenceUrls: ['https://example.com/ev.jpg'],
    description: 'Wrong colour',
    sellerNote: null,
    rejectedReason: null,
    counterOfferAmount: null,
    sellerDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    escalatedAt: null,
    resolvedAt: null,
    resolvedBy: null,
    returnLabelUrl: null,
    returnTrackingNumber: null,
    buyerShippedAt: null,
    returnReceivedAt: null,
    ...overrides,
  };
}

function makeReplacementRequest(overrides: Partial<ReturnRequest> = {}): ReturnRequest {
  return makeReturnRequest({
    id: MOCK_RETURN_ID_2,
    orderId: MOCK_ORDER_ID_2,
    orderNumber: 'ORD-002',
    returnType: 'replacement',
    refundAmount: null,
    returnReason: 'defective',
    description: 'Screen flickering',
    ...overrides,
  });
}

// Reset Zustand store between tests
function resetStore() {
  useSellerReturnStore.setState({
    requests: [],
    isLoading: false,
    error: null,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('SellerReturnStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // loadRequests
  // --------------------------------------------------------------------------

  describe('loadRequests()', () => {
    it('sets isLoading=true during load, then false after', async () => {
      const refundReq = makeReturnRequest();
      mockService.getReturnRequestsBySeller.mockResolvedValue([refundReq]);

      const store = useSellerReturnStore.getState();
      const promise = store.loadRequests(MOCK_SELLER_ID);

      // Right after calling, isLoading should be true
      expect(useSellerReturnStore.getState().isLoading).toBe(true);

      await promise;

      expect(useSellerReturnStore.getState().isLoading).toBe(false);
      expect(useSellerReturnStore.getState().requests).toHaveLength(1);
    });

    it('loads both refund and replacement requests', async () => {
      const refundReq = makeReturnRequest();
      const replacementReq = makeReplacementRequest();
      mockService.getReturnRequestsBySeller.mockResolvedValue([refundReq, replacementReq]);

      await useSellerReturnStore.getState().loadRequests(MOCK_SELLER_ID);

      const state = useSellerReturnStore.getState();
      expect(state.requests).toHaveLength(2);
      expect(state.requests[0].returnType).toBe('return_refund');
      expect(state.requests[1].returnType).toBe('replacement');
    });

    it('maps return request fields to SellerReturnRequest correctly', async () => {
      const req = makeReturnRequest();
      mockService.getReturnRequestsBySeller.mockResolvedValue([req]);

      await useSellerReturnStore.getState().loadRequests(MOCK_SELLER_ID);

      const mapped = useSellerReturnStore.getState().requests[0];
      expect(mapped.id).toBe(MOCK_RETURN_ID);
      expect(mapped.orderId).toBe(MOCK_ORDER_ID);
      expect(mapped.buyerName).toBe('Juan Dela Cruz');
      expect(mapped.status).toBe('seller_review');
      expect(mapped.totalRefundAmount).toBe(500);
      expect(mapped.items).toHaveLength(1);
      expect(mapped.evidenceUrls).toEqual(['https://example.com/ev.jpg']);
    });

    it('sets error on failure', async () => {
      mockService.getReturnRequestsBySeller.mockRejectedValue(new Error('Network error'));

      await useSellerReturnStore.getState().loadRequests(MOCK_SELLER_ID);

      const state = useSellerReturnStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
      expect(state.requests).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // approveRequest
  // --------------------------------------------------------------------------

  describe('approveRequest()', () => {
    it('approves a refund request and updates local state to approved', async () => {
      const req = makeReturnRequest();
      useSellerReturnStore.setState({ requests: [useSellerReturnStore.getState().requests[0] || mapReq(req)] });
      seedStore([req]);

      mockService.approveReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().approveRequest(MOCK_RETURN_ID);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('approved');
      expect(mockService.approveReturn).toHaveBeenCalledWith(MOCK_RETURN_ID);
    });

    it('approves a replacement request', async () => {
      const req = makeReplacementRequest();
      seedStore([req]);

      mockService.approveReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().approveRequest(MOCK_RETURN_ID_2);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID_2);
      expect(updated?.status).toBe('approved');
    });

    it('does nothing if request not found', async () => {
      seedStore([]);
      await useSellerReturnStore.getState().approveRequest('nonexistent-id');
      expect(mockService.approveReturn).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest()]);
      mockService.approveReturn.mockRejectedValue(new Error('Approve failed'));

      await useSellerReturnStore.getState().approveRequest(MOCK_RETURN_ID);

      expect(useSellerReturnStore.getState().error).toBe('Approve failed');
    });
  });

  // --------------------------------------------------------------------------
  // rejectRequest
  // --------------------------------------------------------------------------

  describe('rejectRequest()', () => {
    it('rejects a return with reason and updates local state', async () => {
      seedStore([makeReturnRequest()]);
      mockService.rejectReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().rejectRequest(MOCK_RETURN_ID, 'Item was used');

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('rejected');
      expect(updated?.rejectedReason).toBe('Item was used');
      expect(mockService.rejectReturn).toHaveBeenCalledWith(MOCK_RETURN_ID, 'Item was used');
    });

    it('rejects without reason', async () => {
      seedStore([makeReturnRequest()]);
      mockService.rejectReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().rejectRequest(MOCK_RETURN_ID);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('rejected');
    });

    it('does nothing if request not found', async () => {
      seedStore([]);
      await useSellerReturnStore.getState().rejectRequest('bad-id');
      expect(mockService.rejectReturn).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest()]);
      mockService.rejectReturn.mockRejectedValue(new Error('Reject failed'));

      await useSellerReturnStore.getState().rejectRequest(MOCK_RETURN_ID);

      expect(useSellerReturnStore.getState().error).toBe('Reject failed');
    });
  });

  // --------------------------------------------------------------------------
  // counterOfferRequest
  // --------------------------------------------------------------------------

  describe('counterOfferRequest()', () => {
    it('sends counter-offer and updates local state', async () => {
      seedStore([makeReturnRequest()]);
      mockService.counterOfferReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().counterOfferRequest(MOCK_RETURN_ID, 350, 'Partial refund');

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('counter_offered');
      expect(updated?.counterOfferAmount).toBe(350);
      expect(updated?.sellerNote).toBe('Partial refund');
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest()]);
      mockService.counterOfferReturn.mockRejectedValue(new Error('Counter-offer failed'));

      await useSellerReturnStore.getState().counterOfferRequest(MOCK_RETURN_ID, 350, 'note');

      expect(useSellerReturnStore.getState().error).toBe('Counter-offer failed');
    });
  });

  // --------------------------------------------------------------------------
  // requestItemBack
  // --------------------------------------------------------------------------

  describe('requestItemBack()', () => {
    it('sets status to return_in_transit with return_required path', async () => {
      seedStore([makeReturnRequest()]);
      mockService.requestItemBack.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().requestItemBack(MOCK_RETURN_ID);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('return_in_transit');
      expect(updated?.resolutionPath).toBe('return_required');
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest()]);
      mockService.requestItemBack.mockRejectedValue(new Error('Request failed'));

      await useSellerReturnStore.getState().requestItemBack(MOCK_RETURN_ID);

      expect(useSellerReturnStore.getState().error).toBe('Request failed');
    });
  });

  // --------------------------------------------------------------------------
  // confirmReturnReceived
  // --------------------------------------------------------------------------

  describe('confirmReturnReceived()', () => {
    it('marks refund return as refunded', async () => {
      const req = makeReturnRequest({ status: 'return_in_transit' });
      seedStore([req]);
      mockService.confirmReturnReceived.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('refunded');
      expect(updated?.returnReceivedAt).toBeTruthy();
    });

    it('marks replacement return as refunded (terminal status) with received timestamp', async () => {
      const req = makeReplacementRequest({ status: 'return_in_transit' });
      seedStore([req]);
      mockService.confirmReturnReceived.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID_2);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID_2);
      expect(updated?.status).toBe('refunded');
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest({ status: 'return_in_transit' })]);
      mockService.confirmReturnReceived.mockRejectedValue(new Error('Confirm failed'));

      await useSellerReturnStore.getState().confirmReturnReceived(MOCK_RETURN_ID);

      expect(useSellerReturnStore.getState().error).toBe('Confirm failed');
    });
  });

  // --------------------------------------------------------------------------
  // escalateRequest
  // --------------------------------------------------------------------------

  describe('escalateRequest()', () => {
    it('escalates a return and sets escalatedAt', async () => {
      seedStore([makeReturnRequest()]);
      mockService.escalateReturn.mockResolvedValue(undefined);

      await useSellerReturnStore.getState().escalateRequest(MOCK_RETURN_ID);

      const updated = useSellerReturnStore.getState().requests.find(r => r.id === MOCK_RETURN_ID);
      expect(updated?.status).toBe('escalated');
      expect(updated?.escalatedAt).toBeTruthy();
    });

    it('sets error on failure', async () => {
      seedStore([makeReturnRequest()]);
      mockService.escalateReturn.mockRejectedValue(new Error('Escalate failed'));

      await useSellerReturnStore.getState().escalateRequest(MOCK_RETURN_ID);

      expect(useSellerReturnStore.getState().error).toBe('Escalate failed');
    });
  });

  // --------------------------------------------------------------------------
  // getRequestsByStatus
  // --------------------------------------------------------------------------

  describe('getRequestsByStatus()', () => {
    it('returns all requests when status is "all"', () => {
      const reqs = [
        makeReturnRequest({ status: 'seller_review' }),
        makeReturnRequest({ id: 'aaa', status: 'approved' }),
        makeReplacementRequest({ status: 'escalated' }),
      ];
      seedStore(reqs);

      const result = useSellerReturnStore.getState().getRequestsByStatus('all');
      expect(result).toHaveLength(3);
    });

    it('filters by specific status', () => {
      const reqs = [
        makeReturnRequest({ status: 'seller_review' }),
        makeReturnRequest({ id: 'aaa', status: 'approved' }),
        makeReplacementRequest({ status: 'seller_review' }),
      ];
      seedStore(reqs);

      const result = useSellerReturnStore.getState().getRequestsByStatus('seller_review');
      expect(result).toHaveLength(2);
      result.forEach(r => expect(r.status).toBe('seller_review'));
    });

    it('returns empty array for status with no matches', () => {
      seedStore([makeReturnRequest({ status: 'seller_review' })]);

      const result = useSellerReturnStore.getState().getRequestsByStatus('escalated');
      expect(result).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Multiple concurrent operations
  // --------------------------------------------------------------------------

  describe('Multiple requests in store', () => {
    it('only updates the targeted request, leaving others unchanged', async () => {
      const req1 = makeReturnRequest();
      const req2 = makeReplacementRequest();
      seedStore([req1, req2]);

      mockService.approveReturn.mockResolvedValue(undefined);

      // Approve only the first one
      await useSellerReturnStore.getState().approveRequest(MOCK_RETURN_ID);

      const state = useSellerReturnStore.getState();
      expect(state.requests.find(r => r.id === MOCK_RETURN_ID)?.status).toBe('approved');
      expect(state.requests.find(r => r.id === MOCK_RETURN_ID_2)?.status).toBe('seller_review');
    });
  });
});

// ---------------------------------------------------------------------------
// Helper: seed store with mapped return requests
// ---------------------------------------------------------------------------

function mapReq(r: ReturnRequest) {
  return {
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.orderNumber || r.orderId,
    buyerName: r.buyerName || 'Unknown',
    buyerEmail: r.buyerEmail || '',
    items: (r.items || []).map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      image: item.image || '',
      reason: r.returnReason || 'Return requested',
    })),
    totalRefundAmount: r.refundAmount || r.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) || 0,
    requestDate: r.createdAt,
    status: r.status,
    reason: r.returnReason || '',
    description: r.description || r.returnReason || '',
    images: r.evidenceUrls || [],
    returnType: r.returnType,
    resolutionPath: r.resolutionPath,
    itemsJson: r.itemsJson,
    evidenceUrls: r.evidenceUrls,
    sellerNote: r.sellerNote,
    rejectedReason: r.rejectedReason,
    counterOfferAmount: r.counterOfferAmount,
    sellerDeadline: r.sellerDeadline,
    escalatedAt: r.escalatedAt,
    returnTrackingNumber: r.returnTrackingNumber,
    returnLabelUrl: r.returnLabelUrl,
    buyerShippedAt: r.buyerShippedAt,
    returnReceivedAt: r.returnReceivedAt,
    resolvedAt: r.resolvedAt,
    resolvedBy: r.resolvedBy,
  };
}

function seedStore(requests: ReturnRequest[]) {
  useSellerReturnStore.setState({
    requests: requests.map(mapReq),
    isLoading: false,
    error: null,
  });
}
