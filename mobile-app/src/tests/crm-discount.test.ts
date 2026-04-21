/**
 * Mobile CRM — DiscountService Test Suite
 *
 * Tests the DiscountService singleton and all CRUD operations
 * for seller-level discount campaigns (discount_campaigns table).
 */

// ─── Supabase mock ──────────────────────────────────────────────────────────
const mockChain = () => {
  const chain: any = {
    _result: { data: null, error: null },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(function (this: any) {
      return Promise.resolve(this._result);
    }),
    then: undefined as any,
  };
  // Make the chain itself thenable so `await supabase.from().select()` resolves
  chain.then = function (onFulfilled: any, onRejected?: any) {
    return Promise.resolve(chain._result).then(onFulfilled, onRejected);
  };
  return chain;
};

let supabaseChain = mockChain();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((...args: any[]) => {
      supabaseChain.from(...args);
      return supabaseChain;
    }),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import { DiscountService } from '@/services/discountService';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { DiscountCampaign } from '@/types/discount';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Raw DB row returned by Supabase (snake_case) */
function rawCampaignRow(overrides: Record<string, any> = {}) {
  return {
    id: 'camp-001',
    seller_id: 'seller-001',
    name: 'Flash Sale',
    description: 'Big flash sale',
    campaign_type: 'flash_sale',
    discount_type: 'percentage',
    discount_value: 25,
    max_discount_amount: 100,
    min_purchase_amount: 0,
    starts_at: '2025-01-01T00:00:00Z',
    ends_at: '2025-02-01T00:00:00Z',
    status: 'active',
    badge_text: 'FLASH',
    badge_color: '#FF6A00',
    priority: 1,
    claim_limit: 100,
    per_customer_limit: 2,
    usage_count: 5,
    applies_to: 'specific_products',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// Reset mock chain before each test
beforeEach(() => {
  supabaseChain = mockChain();
  // Re-bind the top-level mock so new chain is used
  const { supabase } = require('@/lib/supabase');
  (supabase.from as jest.Mock).mockImplementation((...args: any[]) => {
    supabaseChain.from(...args);
    return supabaseChain;
  });
  (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DiscountService — Singleton', () => {
  it('returns the same instance on repeated calls', () => {
    const a = DiscountService.getInstance();
    const b = DiscountService.getInstance();
    expect(a).toBe(b);
  });
});

describe('DiscountService — createCampaign', () => {
  const service = DiscountService.getInstance();

  it('inserts a campaign and returns transformed result', async () => {
    const row = rawCampaignRow();
    supabaseChain._result = { data: row, error: null };

    const result = await service.createCampaign({
      sellerId: 'seller-001',
      name: 'Flash Sale',
      campaignType: 'flash_sale',
      discountType: 'percentage',
      discountValue: 25,
      startsAt: new Date('2025-01-01'),
      endsAt: new Date('2025-02-01'),
    } as Partial<DiscountCampaign>);

    expect(supabaseChain.from).toHaveBeenCalledWith('discount_campaigns');
    expect(supabaseChain.insert).toHaveBeenCalled();
    expect(supabaseChain.select).toHaveBeenCalled();
    expect(supabaseChain.single).toHaveBeenCalled();
    expect(result.id).toBe('camp-001');
    expect(result.sellerId).toBe('seller-001');
    expect(result.name).toBe('Flash Sale');
    expect(result.campaignType).toBe('flash_sale');
  });

  it('throws when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(
      service.createCampaign({ name: 'Test' } as any),
    ).rejects.toThrow('Supabase not configured');
  });

  it('throws on Supabase error', async () => {
    supabaseChain._result = { data: null, error: { message: 'insert fail' } };
    await expect(
      service.createCampaign({ sellerId: 'x', name: 'Boom' } as any),
    ).rejects.toThrow();
  });

  it('throws when no data returned', async () => {
    supabaseChain._result = { data: null, error: null };
    await expect(
      service.createCampaign({ sellerId: 'x', name: 'Boom' } as any),
    ).rejects.toThrow('No data returned');
  });
});

describe('DiscountService — getCampaignsBySeller', () => {
  const service = DiscountService.getInstance();

  it('fetches campaigns ordered by created_at desc', async () => {
    const rows = [rawCampaignRow(), rawCampaignRow({ id: 'camp-002', name: 'Sale 2' })];
    supabaseChain._result = { data: rows, error: null };

    const result = await service.getCampaignsBySeller('seller-001');

    expect(supabaseChain.from).toHaveBeenCalledWith('discount_campaigns');
    expect(supabaseChain.eq).toHaveBeenCalledWith('seller_id', 'seller-001');
    expect(supabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('camp-001');
    expect(result[1].id).toBe('camp-002');
  });

  it('returns empty array when Supabase not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const result = await service.getCampaignsBySeller('seller-001');
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    supabaseChain._result = { data: null, error: null };
    const result = await service.getCampaignsBySeller('seller-001');
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    supabaseChain._result = { data: null, error: { message: 'select fail' } };
    await expect(service.getCampaignsBySeller('seller-001')).rejects.toThrow();
  });
});

describe('DiscountService — getActiveCampaigns', () => {
  const service = DiscountService.getInstance();

  it('filters by status=active and orders by priority desc', async () => {
    const rows = [rawCampaignRow({ priority: 3 })];
    supabaseChain._result = { data: rows, error: null };

    const result = await service.getActiveCampaigns('seller-001');

    expect(supabaseChain.eq).toHaveBeenCalledWith('seller_id', 'seller-001');
    expect(supabaseChain.eq).toHaveBeenCalledWith('status', 'active');
    expect(supabaseChain.order).toHaveBeenCalledWith('priority', { ascending: false });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when Supabase not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    const result = await service.getActiveCampaigns('seller-001');
    expect(result).toEqual([]);
  });
});

describe('DiscountService — updateCampaign', () => {
  const service = DiscountService.getInstance();

  it('updates a campaign and returns transformed result', async () => {
    const updated = rawCampaignRow({ name: 'Updated Sale', status: 'paused' });
    supabaseChain._result = { data: updated, error: null };

    const result = await service.updateCampaign('camp-001', {
      name: 'Updated Sale',
      status: 'paused',
    } as Partial<DiscountCampaign>);

    expect(supabaseChain.update).toHaveBeenCalled();
    expect(supabaseChain.eq).toHaveBeenCalledWith('id', 'camp-001');
    expect(result.name).toBe('Updated Sale');
    expect(result.status).toBe('paused');
  });

  it('throws when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(
      service.updateCampaign('camp-001', { name: 'x' } as any),
    ).rejects.toThrow('Supabase not configured');
  });

  it('throws when no data returned', async () => {
    supabaseChain._result = { data: null, error: null };
    await expect(
      service.updateCampaign('camp-001', { name: 'x' } as any),
    ).rejects.toThrow('No data returned');
  });
});

describe('DiscountService — deleteCampaign', () => {
  const service = DiscountService.getInstance();

  it('deletes a campaign by ID', async () => {
    supabaseChain._result = { data: null, error: null };

    await service.deleteCampaign('camp-001');

    expect(supabaseChain.from).toHaveBeenCalledWith('discount_campaigns');
    expect(supabaseChain.delete).toHaveBeenCalled();
    expect(supabaseChain.eq).toHaveBeenCalledWith('id', 'camp-001');
  });

  it('throws when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(service.deleteCampaign('camp-001')).rejects.toThrow('Supabase not configured');
  });

  it('throws on Supabase error', async () => {
    supabaseChain._result = { data: null, error: { message: 'delete fail' } };
    await expect(service.deleteCampaign('camp-001')).rejects.toThrow();
  });
});

describe('DiscountService — toggleCampaignStatus', () => {
  const service = DiscountService.getInstance();

  it('pauses an active campaign', async () => {
    const paused = rawCampaignRow({ status: 'paused' });
    supabaseChain._result = { data: paused, error: null };

    const result = await service.toggleCampaignStatus('camp-001', true);

    expect(supabaseChain.update).toHaveBeenCalledWith({ status: 'paused' });
    expect(result.status).toBe('paused');
  });

  it('resumes a paused campaign', async () => {
    const active = rawCampaignRow({ status: 'active' });
    supabaseChain._result = { data: active, error: null };

    const result = await service.toggleCampaignStatus('camp-001', false);

    expect(supabaseChain.update).toHaveBeenCalledWith({ status: 'active' });
    expect(result.status).toBe('active');
  });

  it('throws when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(service.toggleCampaignStatus('camp-001', true)).rejects.toThrow('Supabase not configured');
  });
});

describe('DiscountService — deactivateCampaign', () => {
  const service = DiscountService.getInstance();

  it('sets status to cancelled', async () => {
    const cancelled = rawCampaignRow({ status: 'cancelled' });
    supabaseChain._result = { data: cancelled, error: null };

    const result = await service.deactivateCampaign('camp-001');

    expect(supabaseChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(result.status).toBe('cancelled');
  });

  it('throws when Supabase is not configured', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    await expect(service.deactivateCampaign('camp-001')).rejects.toThrow('Supabase not configured');
  });

  it('throws when no data returned', async () => {
    supabaseChain._result = { data: null, error: null };
    await expect(service.deactivateCampaign('camp-001')).rejects.toThrow('Failed to deactivate campaign.');
  });
});

describe('DiscountService — Field Mapping (transformCampaign)', () => {
  const service = DiscountService.getInstance();

  it('converts snake_case DB row to camelCase domain object', async () => {
    const row = rawCampaignRow({
      max_discount_amount: 500,
      min_purchase_amount: 200,
      badge_text: 'CLEARANCE',
      badge_color: '#00FF00',
      per_customer_limit: 3,
      usage_count: 10,
      applies_to: 'all_products',
    });
    supabaseChain._result = { data: [row], error: null };

    const results = await service.getCampaignsBySeller('seller-001');

    const c = results[0];
    expect(c.maxDiscountAmount).toBe(500);
    expect(c.minPurchaseAmount).toBe(200);
    expect(c.badgeText).toBe('CLEARANCE');
    expect(c.badgeColor).toBe('#00FF00');
    expect(c.perCustomerLimit).toBe(3);
    expect(c.usageCount).toBe(10);
    expect(c.appliesTo).toBe('all_products');
  });

  it('transforms date strings into Date objects', async () => {
    const row = rawCampaignRow();
    supabaseChain._result = { data: [row], error: null };

    const results = await service.getCampaignsBySeller('seller-001');
    const c = results[0];
    expect(c.startsAt).toBeInstanceOf(Date);
    expect(c.endsAt).toBeInstanceOf(Date);
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
  });
});

describe('Discount Types — Constants', () => {
  it('has all 7 campaign types', () => {
    const { campaignTypeLabels } = require('@/types/discount');
    expect(Object.keys(campaignTypeLabels)).toHaveLength(7);
    expect(campaignTypeLabels.flash_sale).toBe('Flash Sale');
    expect(campaignTypeLabels.bundle_deal).toBe('Bundle Deal');
  });

  it('has all 5 campaign status labels', () => {
    const { campaignStatusLabels } = require('@/types/discount');
    expect(Object.keys(campaignStatusLabels)).toHaveLength(5);
    expect(campaignStatusLabels.active).toBe('Active');
    expect(campaignStatusLabels.cancelled).toBe('Cancelled');
  });

  it('has correct status color mappings', () => {
    const { campaignStatusColors } = require('@/types/discount');
    expect(campaignStatusColors.active).toContain('green');
    expect(campaignStatusColors.paused).toContain('yellow');
  });
});
