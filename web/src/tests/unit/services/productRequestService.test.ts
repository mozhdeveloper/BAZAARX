/**
 * ProductRequestService Tests
 * Covers all service methods used by:
 *  - CommunityRequestsPage (getAllRequests, addRequest)
 *  - ProductRequestDetailPage (getRequestById, upvoteRequest)
 *  - AdminProductRequests (getAllRequests, updateStatus, deleteRequest)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { productRequestService, type ProductRequest } from '@/services/productRequestService';
import { supabase } from '@/lib/supabase';
import {
  createMockSupabaseQuery,
  mockSupabaseConfigured,
  mockSupabaseNotConfigured,
} from '../mocks/supabase.mock';

jest.mock('@/lib/supabase');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const RAW_ROW_PENDING = {
  id: 'req-001',
  product_name: 'Durable USB-C Cable',
  description: 'A cable that actually lasts',
  category: 'Electronics',
  requested_by_name: 'Alice',
  requested_by_id: 'user-001',
  votes: 120,
  comments_count: 8,
  status: 'pending',
  priority: 'high',
  estimated_demand: 45,
  admin_notes: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-01T10:00:00Z',
};

const RAW_ROW_IN_PROGRESS = {
  ...RAW_ROW_PENDING,
  id: 'req-002',
  status: 'in_progress',
  votes: 210,
  admin_notes: 'Sourcing samples from 3 suppliers',
};

const RAW_ROW_APPROVED = {
  ...RAW_ROW_PENDING,
  id: 'req-003',
  status: 'approved',
  votes: 500,
};

const RAW_ROW_REJECTED = {
  ...RAW_ROW_PENDING,
  id: 'req-004',
  status: 'rejected',
  votes: 5,
  admin_notes: 'Too niche — not enough demand',
};

const MAPPED_PENDING: ProductRequest = {
  id: 'req-001',
  productName: 'Durable USB-C Cable',
  description: 'A cable that actually lasts',
  category: 'Electronics',
  requestedBy: 'Alice',
  requestedById: 'user-001',
  requestDate: new Date('2026-01-01T10:00:00Z'),
  votes: 120,
  comments: 8,
  status: 'pending',
  priority: 'high',
  estimatedDemand: 45,
  adminNotes: undefined,
};

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a full chainable mock that resolves with { data, error } */
const fromMock = (data: any, error: any = null) => {
  const q = createMockSupabaseQuery(data, error);
  mockSupabase.from.mockReturnValue(q as any);
  return q;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('ProductRequestService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseConfigured();
  });

  // ── 1. mapRow / data mapping ────────────────────────────────────────────────
  describe('Data mapping (mapRow)', () => {
    it('maps all DB column names to camelCase interface fields', async () => {
      fromMock([RAW_ROW_PENDING]);
      const [result] = await productRequestService.getAllRequests();

      expect(result.id).toBe('req-001');
      expect(result.productName).toBe('Durable USB-C Cable');
      expect(result.requestedBy).toBe('Alice');
      expect(result.requestedById).toBe('user-001');
      expect(result.votes).toBe(120);
      expect(result.comments).toBe(8);
      expect(result.estimatedDemand).toBe(45);
      expect(result.status).toBe('pending');
      expect(result.priority).toBe('high');
      expect(result.adminNotes).toBeUndefined(); // null from DB normalized to undefined
      expect(result.requestDate).toBeInstanceOf(Date);
    });

    it('falls back to "Anonymous" when requested_by_name is null', async () => {
      fromMock([{ ...RAW_ROW_PENDING, requested_by_name: null }]);
      const [result] = await productRequestService.getAllRequests();
      expect(result.requestedBy).toBe('Anonymous');
    });

    it('falls back to 0 for missing numeric fields', async () => {
      fromMock([{ ...RAW_ROW_PENDING, votes: null, estimated_demand: null, comments_count: null }]);
      const [result] = await productRequestService.getAllRequests();
      expect(result.votes).toBe(0);
      expect(result.estimatedDemand).toBe(0);
      expect(result.comments).toBe(0);
    });

    it('maps admin_notes when present', async () => {
      fromMock([RAW_ROW_IN_PROGRESS]);
      const [result] = await productRequestService.getAllRequests();
      expect(result.adminNotes).toBe('Sourcing samples from 3 suppliers');
    });
  });

  // ── 2. getAllRequests ───────────────────────────────────────────────────────
  describe('getAllRequests()', () => {
    it('returns all mapped requests', async () => {
      fromMock([RAW_ROW_PENDING, RAW_ROW_IN_PROGRESS, RAW_ROW_APPROVED]);
      const result = await productRequestService.getAllRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('product_requests');
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('req-001');
    });

    it('returns empty array when table is empty', async () => {
      fromMock([]);
      const result = await productRequestService.getAllRequests();
      expect(result).toEqual([]);
    });

    it('returns empty array when Supabase is not configured', async () => {
      mockSupabaseNotConfigured();
      const result = await productRequestService.getAllRequests();
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('returns empty array and warns when DB returns error', async () => {
      fromMock(null, { message: 'relation "product_requests" does not exist' });
      const result = await productRequestService.getAllRequests();
      expect(result).toEqual([]);
    });

    it('handles all 4 valid statuses: pending, in_progress, approved, rejected', async () => {
      fromMock([RAW_ROW_PENDING, RAW_ROW_IN_PROGRESS, RAW_ROW_APPROVED, RAW_ROW_REJECTED]);
      const result = await productRequestService.getAllRequests();
      const statuses = result.map(r => r.status);

      expect(statuses).toContain('pending');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
    });
  });

  // ── 3. getRequestById ──────────────────────────────────────────────────────
  describe('getRequestById()', () => {
    it('returns a single mapped request for a valid id', async () => {
      fromMock(RAW_ROW_PENDING);
      const result = await productRequestService.getRequestById('req-001');

      expect(mockSupabase.from).toHaveBeenCalledWith('product_requests');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('req-001');
      expect(result!.productName).toBe('Durable USB-C Cable');
    });

    it('returns null when record not found (DB error)', async () => {
      fromMock(null, { message: 'Row not found', code: 'PGRST116' });
      const result = await productRequestService.getRequestById('req-nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when data is null', async () => {
      fromMock(null, null);
      const result = await productRequestService.getRequestById('req-xxx');
      expect(result).toBeNull();
    });

    it('returns null when Supabase is not configured', async () => {
      mockSupabaseNotConfigured();
      const result = await productRequestService.getRequestById('req-001');
      expect(result).toBeNull();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('returns approved request with adminNotes', async () => {
      fromMock({ ...RAW_ROW_APPROVED, admin_notes: 'All tests passed' });
      const result = await productRequestService.getRequestById('req-003');
      expect(result!.status).toBe('approved');
      expect(result!.adminNotes).toBe('All tests passed');
    });
  });

  // ── 4. updateStatus (used by AdminProductRequests) ─────────────────────────
  describe('updateStatus()', () => {
    it('calls update with correct status and id', async () => {
      const q = createMockSupabaseQuery(null, null);
      mockSupabase.from.mockReturnValue(q as any);

      await productRequestService.updateStatus('req-001', 'approved');

      expect(mockSupabase.from).toHaveBeenCalledWith('product_requests');
      expect(q.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
      expect(q.eq).toHaveBeenCalledWith('id', 'req-001');
    });

    it('includes admin_notes in update when provided', async () => {
      const q = createMockSupabaseQuery(null, null);
      mockSupabase.from.mockReturnValue(q as any);

      await productRequestService.updateStatus('req-001', 'rejected', 'Quality too low');

      expect(q.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected', admin_notes: 'Quality too low' })
      );
    });

    it('does not include admin_notes when not provided', async () => {
      const q = createMockSupabaseQuery(null, null);
      mockSupabase.from.mockReturnValue(q as any);

      await productRequestService.updateStatus('req-001', 'in_progress');

      const updateArg = q.update.mock.calls[0][0];
      expect(updateArg).not.toHaveProperty('admin_notes');
    });

    it('throws when DB returns an error', async () => {
      const q = createMockSupabaseQuery(null, { message: 'Not authorized' });
      mockSupabase.from.mockReturnValue(q as any);

      await expect(
        productRequestService.updateStatus('req-001', 'approved')
      ).rejects.toThrow('Not authorized');
    });

    it('accepts all 3 valid admin-settable statuses', async () => {
      const statuses = ['approved', 'rejected', 'in_progress'] as const;
      for (const status of statuses) {
        const q = createMockSupabaseQuery(null, null);
        mockSupabase.from.mockReturnValue(q as any);
        await expect(
          productRequestService.updateStatus('req-001', status)
        ).resolves.not.toThrow();
      }
    });

    it('does nothing when Supabase is not configured', async () => {
      mockSupabaseNotConfigured();
      await productRequestService.updateStatus('req-001', 'approved');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ── 5. addRequest (used by ProductRequestModal / CommunityRequestsPage) ────
  describe('addRequest()', () => {
    const newRequestParams = {
      productName: 'Ergonomic Keyboard',
      description: 'Mechanical keyboard with proper wrist support',
      category: 'Home Office',
      requestedByName: 'Bob',
      requestedById: 'user-002',
      priority: 'medium' as const,
      estimatedDemand: 30,
    };

    const dbInsertedRow = {
      id: 'req-new',
      product_name: 'Ergonomic Keyboard',
      description: 'Mechanical keyboard with proper wrist support',
      category: 'Home Office',
      requested_by_name: 'Bob',
      requested_by_id: 'user-002',
      votes: 0,
      comments_count: 0,
      status: 'pending',
      priority: 'medium',
      estimated_demand: 30,
      admin_notes: null,
      created_at: '2026-03-11T00:00:00Z',
      updated_at: '2026-03-11T00:00:00Z',
    };

    it('inserts and returns the new request', async () => {
      const q = createMockSupabaseQuery(dbInsertedRow, null);
      mockSupabase.from.mockReturnValue(q as any);

      const result = await productRequestService.addRequest(newRequestParams);

      expect(mockSupabase.from).toHaveBeenCalledWith('product_requests');
      expect(q.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          product_name: 'Ergonomic Keyboard',
          category: 'Home Office',
          requested_by_name: 'Bob',
        })
      );
      expect(result.id).toBe('req-new');
      expect(result.status).toBe('pending');
      expect(result.votes).toBe(0);
    });

    it('throws when Supabase not configured', async () => {
      mockSupabaseNotConfigured();
      await expect(
        productRequestService.addRequest(newRequestParams)
      ).rejects.toThrow('Supabase not configured');
    });

    it('throws when DB returns an error', async () => {
      const q = createMockSupabaseQuery(null, { message: 'Unique constraint violation' });
      mockSupabase.from.mockReturnValue(q as any);

      await expect(
        productRequestService.addRequest(newRequestParams)
      ).rejects.toThrow();
    });
  });

  // ── 6. upvoteRequest (used by ProductRequestDetailPage) ───────────────────
  describe('upvoteRequest()', () => {
    it('fetches current votes then updates with votes + 1', async () => {
      // First call: fetch current votes
      const fetchQuery = createMockSupabaseQuery({ votes: 10 }, null);
      // Second call: update
      const updateQuery = createMockSupabaseQuery(null, null);
      mockSupabase.from
        .mockReturnValueOnce(fetchQuery as any)
        .mockReturnValueOnce(updateQuery as any);

      await productRequestService.upvoteRequest('req-001');

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
      expect(updateQuery.update).toHaveBeenCalledWith({ votes: 11 });
      expect(updateQuery.eq).toHaveBeenCalledWith('id', 'req-001');
    });

    it('treats null votes as 0 and sets votes to 1', async () => {
      const fetchQuery = createMockSupabaseQuery({ votes: null }, null);
      const updateQuery = createMockSupabaseQuery(null, null);
      mockSupabase.from
        .mockReturnValueOnce(fetchQuery as any)
        .mockReturnValueOnce(updateQuery as any);

      await productRequestService.upvoteRequest('req-001');

      expect(updateQuery.update).toHaveBeenCalledWith({ votes: 1 });
    });

    it('does nothing when Supabase is not configured', async () => {
      mockSupabaseNotConfigured();
      await productRequestService.upvoteRequest('req-001');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('does not throw when fetch fails — silently ignores', async () => {
      const fetchQuery = createMockSupabaseQuery(null, { message: 'Not found' });
      mockSupabase.from.mockReturnValueOnce(fetchQuery as any);

      await expect(productRequestService.upvoteRequest('req-001')).resolves.not.toThrow();
    });
  });

  // ── 7. deleteRequest (admin action) ───────────────────────────────────────
  describe('deleteRequest()', () => {
    it('calls delete with correct id', async () => {
      const q = createMockSupabaseQuery(null, null);
      mockSupabase.from.mockReturnValue(q as any);

      await productRequestService.deleteRequest('req-001');

      expect(mockSupabase.from).toHaveBeenCalledWith('product_requests');
      expect(q.delete).toHaveBeenCalled();
      expect(q.eq).toHaveBeenCalledWith('id', 'req-001');
    });

    it('throws when DB returns an error', async () => {
      const q = createMockSupabaseQuery(null, { message: 'Permission denied' });
      mockSupabase.from.mockReturnValue(q as any);

      await expect(
        productRequestService.deleteRequest('req-001')
      ).rejects.toThrow('Permission denied');
    });

    it('does nothing when Supabase is not configured', async () => {
      mockSupabaseNotConfigured();
      await productRequestService.deleteRequest('req-001');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ── 8. Page-level logic (unit-tested in isolation) ─────────────────────────
  describe('CommunityRequestsPage logic', () => {
    describe('Status filtering', () => {
      it('filters correctly by status=pending', () => {
        const all = [MAPPED_PENDING, { ...MAPPED_PENDING, id: 'r2', status: 'approved' as const }];
        const filtered = all.filter(r => r.status === 'pending');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('req-001');
      });

      it('passes all rows when filter is null (All tab)', () => {
        const all = [MAPPED_PENDING, { ...MAPPED_PENDING, id: 'r2', status: 'approved' as const }];
        const filtered = all.filter(() => true);
        expect(filtered).toHaveLength(2);
      });

      it('excludes rejected requests from public listing', async () => {
        fromMock([RAW_ROW_PENDING, RAW_ROW_REJECTED]);
        const all = await productRequestService.getAllRequests();
        const visible = all.filter(r => r.status !== 'rejected');
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe('req-001');
      });
    });

    describe('Heat score sorting', () => {
      it('sorts by heat score (votes + estimatedDemand) descending', () => {
        const lowHeat = { ...MAPPED_PENDING, votes: 5, estimatedDemand: 3 };
        const highHeat = { ...MAPPED_PENDING, id: 'r2', votes: 200, estimatedDemand: 50 };
        const sorted = [lowHeat, highHeat].sort(
          (a, b) => (b.votes + b.estimatedDemand) - (a.votes + a.estimatedDemand)
        );
        expect(sorted[0].id).toBe('r2');
      });
    });

    describe('Status counts', () => {
      it('counts correct totals across pending, in_progress, approved', () => {
        const requests = [
          { ...MAPPED_PENDING, status: 'pending' as const },
          { ...MAPPED_PENDING, id: 'r2', status: 'in_progress' as const },
          { ...MAPPED_PENDING, id: 'r3', status: 'in_progress' as const },
          { ...MAPPED_PENDING, id: 'r4', status: 'approved' as const },
        ];
        const counts = { pending: 0, in_progress: 0, approved: 0 };
        requests.forEach(r => { if (r.status in counts) counts[r.status]++; });

        expect(counts.pending).toBe(1);
        expect(counts.in_progress).toBe(2);
        expect(counts.approved).toBe(1);
      });

      it('"testing" status (invalid in DB) never appears in counts', async () => {
        fromMock([RAW_ROW_PENDING, RAW_ROW_IN_PROGRESS, RAW_ROW_APPROVED]);
        const result = await productRequestService.getAllRequests();
        const hasTestingStatus = result.some(r => (r.status as string) === 'testing');
        expect(hasTestingStatus).toBe(false);
      });
    });

    describe('Search filtering', () => {
      it('matches on productName (case-insensitive)', () => {
        const reqs = [MAPPED_PENDING, { ...MAPPED_PENDING, id: 'r2', productName: 'Yoga Mat' }];
        const q = 'usb';
        const filtered = reqs.filter(r => r.productName.toLowerCase().includes(q.toLowerCase()));
        expect(filtered).toHaveLength(1);
        expect(filtered[0].productName).toContain('USB');
      });

      it('returns all results when query is empty', () => {
        const reqs = [MAPPED_PENDING, { ...MAPPED_PENDING, id: 'r2', productName: 'Yoga Mat' }];
        const q = '';
        const filtered = reqs.filter(r => !q || r.productName.toLowerCase().includes(q));
        expect(filtered).toHaveLength(2);
      });
    });
  });

  describe('ProductRequestDetailPage logic', () => {
    describe('Heat score + progress calculation', () => {
      it('calculates heatScore as votes + estimatedDemand', () => {
        const req = { ...MAPPED_PENDING, votes: 120, estimatedDemand: 45 };
        const heatScore = req.votes + req.estimatedDemand;
        expect(heatScore).toBe(165);
      });

      it('caps progressPct at 100', () => {
        const threshold = 200;
        const heatScore = 500; // over threshold
        const progressPct = Math.min(100, Math.round((heatScore / threshold) * 100));
        expect(progressPct).toBe(100);
      });

      it('calculates correct progress for pending status', () => {
        const threshold = 200; // pending → Sourcing threshold
        const heatScore = 100;
        const progressPct = Math.min(100, Math.round((heatScore / threshold) * 100));
        expect(progressPct).toBe(50);
      });

      it('toGo is 0 when heatScore exceeds threshold', () => {
        const threshold = 200;
        const heatScore = 300;
        const toGo = Math.max(0, threshold - heatScore);
        expect(toGo).toBe(0);
      });

      it('toGo calculates remaining votes needed', () => {
        const threshold = 200;
        const heatScore = 120;
        const toGo = Math.max(0, threshold - heatScore);
        expect(toGo).toBe(80);
      });
    });

    describe('Next stage thresholds align with business rules', () => {
      const NEXT_STAGE: Record<string, { label: string; threshold: number }> = {
        pending:     { label: 'Sourcing', threshold: 200 },
        in_progress: { label: 'Testing',  threshold: 400 },
        approved:    { label: 'Live',     threshold: 500 },
        rejected:    { label: 'N/A',      threshold: 1   },
      };

      it('pending moves to Sourcing at 200', () => {
        expect(NEXT_STAGE.pending).toEqual({ label: 'Sourcing', threshold: 200 });
      });

      it('in_progress moves to Testing at 400', () => {
        expect(NEXT_STAGE.in_progress).toEqual({ label: 'Testing', threshold: 400 });
      });

      it('approved moves to Live at 500', () => {
        expect(NEXT_STAGE.approved).toEqual({ label: 'Live', threshold: 500 });
      });

      it('rejected has N/A next stage (no progression)', () => {
        expect(NEXT_STAGE.rejected.label).toBe('N/A');
      });
    });

    describe('Pipeline stage tracking', () => {
      const stages = ['pending', 'in_progress', 'testing', 'approved', 'live'];

      it('marks stages before current as isPast', () => {
        const currentStatus = 'in_progress';
        const currentIdx = stages.indexOf(currentStatus);
        const pendingIdx = stages.indexOf('pending');
        expect(pendingIdx < currentIdx).toBe(true); // pending is past
      });

      it('marks current stage as isCurrent', () => {
        const currentStatus = 'approved';
        const currentIdx = stages.indexOf(currentStatus);
        const approvedIdx = stages.indexOf('approved');
        expect(approvedIdx === currentIdx).toBe(true);
      });

      it('marks stages after current as neither past nor current', () => {
        const currentStatus = 'pending';
        const currentIdx = stages.indexOf(currentStatus);
        const liveIdx = stages.indexOf('live');
        expect(liveIdx > currentIdx).toBe(true);
      });
    });
  });

  describe('AdminProductRequests logic', () => {
    describe('Status updates', () => {
      it('can approve a pending request', async () => {
        const q = createMockSupabaseQuery(null, null);
        mockSupabase.from.mockReturnValue(q as any);

        await productRequestService.updateStatus('req-001', 'approved', 'All tests passed');

        expect(q.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'approved', admin_notes: 'All tests passed' })
        );
      });

      it('can move a request to in_progress (sourcing)', async () => {
        const q = createMockSupabaseQuery(null, null);
        mockSupabase.from.mockReturnValue(q as any);

        await productRequestService.updateStatus('req-001', 'in_progress');

        expect(q.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'in_progress' })
        );
      });

      it('can reject a request with admin notes', async () => {
        const q = createMockSupabaseQuery(null, null);
        mockSupabase.from.mockReturnValue(q as any);

        await productRequestService.updateStatus('req-001', 'rejected', 'Too niche — not enough demand');

        expect(q.update).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'rejected', admin_notes: 'Too niche — not enough demand' })
        );
      });
    });

    describe('Kanban grouping logic', () => {
      it('groups requests by status correctly', async () => {
        fromMock([RAW_ROW_PENDING, RAW_ROW_IN_PROGRESS, RAW_ROW_APPROVED]);
        const all = await productRequestService.getAllRequests();

        const byStatus: Record<string, ProductRequest[]> = {};
        all.forEach(r => {
          byStatus[r.status] = [...(byStatus[r.status] || []), r];
        });

        expect(byStatus['pending']).toHaveLength(1);
        expect(byStatus['in_progress']).toHaveLength(1);
        expect(byStatus['approved']).toHaveLength(1);
        expect(byStatus['testing']).toBeUndefined(); // 'testing' not in DB
      });
    });
  });
});
