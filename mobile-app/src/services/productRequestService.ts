/**
 * EPIC 7 — Product Request system service for mobile.
 * Wraps the Postgres RPCs: support_product_request,
 * admin_action_product_request, convert_request_to_listing.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type SupportType = 'upvote' | 'pledge' | 'stake';
export type RequestStatus =
  | 'new' | 'under_review' | 'already_available' | 'approved_for_sourcing'
  | 'rejected' | 'on_hold' | 'converted_to_listing'
  | 'pending' | 'approved' | 'in_progress';
export type SourcingStage = 'quoting' | 'sampling' | 'negotiating' | 'ready_for_verification' | null;
export type OfferStatus = 'submitted' | 'shortlisted' | 'rejected' | 'awarded';

export interface ProductRequestDTO {
  id: string;
  title: string;
  summary: string;
  productName: string;
  description: string;
  category: string;
  status: RequestStatus;
  sourcingStage: SourcingStage;
  demandCount: number;
  stakedBazcoins: number;
  votes: number;
  linkedProductId: string | null;
  rejectionHoldReason: string | null;
  rewardAmount: number;
  requestedById: string | null;
  referenceLinks: string[];
  adminNotes: string | null;
  estimatedDemand: number;
  priority: string;
  createdAt: Date;
}

export interface SupplierOfferDTO {
  id: string;
  requestId: string;
  supplierId: string;
  supplierStoreName?: string;
  price: number;
  moq: number;
  leadTimeDays: number;
  terms: string | null;
  qualityNotes: string | null;
  status: OfferStatus;
  createdAt: Date;
}

function mapRequest(r: any): ProductRequestDTO {
  return {
    id: r.id,
    title: r.title || r.product_name || 'Untitled',
    summary: r.summary || r.description || '',
    productName: r.product_name,
    description: r.description || '',
    category: r.category || '',
    status: r.status,
    sourcingStage: (r.sourcing_stage as SourcingStage) ?? null,
    demandCount: r.demand_count || 0,
    stakedBazcoins: r.staked_bazcoins || 0,
    votes: r.votes || 0,
    linkedProductId: r.linked_product_id ?? null,
    rejectionHoldReason: r.rejection_hold_reason ?? null,
    rewardAmount: r.reward_amount ?? 50,
    requestedById: r.requested_by_id ?? null,
    referenceLinks: r.reference_links ?? [],
    adminNotes: r.admin_notes ?? null,
    estimatedDemand: r.estimated_demand || r.demand_count || 0,
    priority: r.priority || 'medium',
    createdAt: new Date(r.created_at),
  };
}
function mapOffer(r: any): SupplierOfferDTO {
  return {
    id: r.id,
    requestId: r.request_id,
    supplierId: r.supplier_id,
    supplierStoreName: r.sellers?.store_name,
    price: Number(r.price),
    moq: r.moq,
    leadTimeDays: r.lead_time_days,
    terms: r.terms,
    qualityNotes: r.quality_notes,
    status: r.status,
    createdAt: new Date(r.created_at),
  };
}

export const productRequestService = {
  async getById(id: string): Promise<ProductRequestDTO | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('product_requests').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapRequest(data);
  },

  async getEligibleForSuppliers(): Promise<ProductRequestDTO[]> {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('product_requests')
      .select('*')
      .eq('status', 'approved_for_sourcing')
      .order('staked_bazcoins', { ascending: false })
      .order('demand_count', { ascending: false })
      .limit(50);
    return (data ?? []).map(mapRequest);
  },

  async listMine(userId: string): Promise<ProductRequestDTO[]> {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('product_requests')
      .select('*')
      .eq('requested_by_id', userId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapRequest);
  },

  async listSupportedByUser(userId: string): Promise<{
    request: ProductRequestDTO;
    supportTypes: string[];
    staked: number;
    rewarded: boolean;
  }[]> {
    if (!isSupabaseConfigured()) return [];
    const { data: supports } = await supabase
      .from('request_supports')
      .select('request_id, support_type, bazcoin_amount, rewarded')
      .eq('user_id', userId);
    if (!supports?.length) return [];

    const meta = new Map<string, { types: Set<string>; staked: number; rewarded: boolean }>();
    for (const s of supports) {
      const m = meta.get(s.request_id) || { types: new Set(), staked: 0, rewarded: false };
      m.types.add(s.support_type);
      m.staked += s.bazcoin_amount || 0;
      if (s.rewarded) m.rewarded = true;
      meta.set(s.request_id, m);
    }

    const ids = Array.from(meta.keys());
    const { data: rows } = await supabase
      .from('product_requests').select('*').in('id', ids);
    return (rows ?? []).map((r) => {
      const m = meta.get(r.id)!;
      return { request: mapRequest(r), supportTypes: Array.from(m.types), staked: m.staked, rewarded: m.rewarded };
    });
  },

  async listBrowse(opts: { search?: string; status?: string; limit?: number } = {}): Promise<ProductRequestDTO[]> {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('product_requests').select('*');
    if (opts.status) q = q.eq('status', opts.status);
    else q = q.not('status', 'in', '(rejected,already_available)');
    if (opts.search) q = q.or(`product_name.ilike.%${opts.search}%,description.ilike.%${opts.search}%`);
    const { data } = await q
      .order('staked_bazcoins', { ascending: false })
      .order('demand_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? 50);
    return (data ?? []).map(mapRequest);
  },

  async support(requestId: string, type: SupportType, amount = 0):
    Promise<{ success: boolean; newBalance?: number; error?: string }>
  {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('support_product_request', {
      p_request_id: requestId, p_support_type: type, p_bazcoin_amount: amount,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, newBalance: (data as any)?.new_balance };
  },

  async getMySupports(userId: string, requestId: string) {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('request_supports')
      .select('*')
      .eq('user_id', userId)
      .eq('request_id', requestId);
    return data ?? [];
  },

  async adminAction(params: {
    requestId: string;
    action: 'approve' | 'reject' | 'hold' | 'resolve' | 'merge' | 'link_product' | 'stage_change';
    reason?: string; targetId?: string; newStage?: string;
  }) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('admin_action_product_request', {
      p_request_id: params.requestId,
      p_action: params.action,
      p_reason: params.reason ?? undefined,
      p_target_id: params.targetId ?? undefined,
      p_new_stage: params.newStage ?? undefined,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, newStatus: (data as any)?.new_status };
  },

  async convertToListing(requestId: string, productId: string) {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('convert_request_to_listing', {
      p_request_id: requestId, p_product_id: productId,
    });
    if (error) return { success: false, error: error.message };
    return { success: !!(data as any)?.success };
  },

  async getAuditLog(requestId: string) {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('request_audit_logs').select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },
};

export const supplierOfferService = {
  async listForRequest(requestId: string): Promise<SupplierOfferDTO[]> {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('supplier_offers')
      .select('*, sellers ( store_name )')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapOffer);
  },

  async listForSupplier(supplierId: string): Promise<SupplierOfferDTO[]> {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('supplier_offers')
      .select('*, sellers ( store_name )')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(mapOffer);
  },

  async submit(p: {
    requestId: string; supplierId: string; price: number; moq: number;
    leadTimeDays: number; terms?: string; qualityNotes?: string;
  }) {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    const { data, error } = await supabase
      .from('supplier_offers').insert({
        request_id: p.requestId,
        supplier_id: p.supplierId,
        price: p.price,
        moq: p.moq,
        lead_time_days: p.leadTimeDays,
        terms: p.terms ?? null,
        quality_notes: p.qualityNotes ?? null,
      }).select('*, sellers ( store_name )').single();
    if (error) throw new Error(error.message);
    return mapOffer(data);
  },

  async setStatus(offerId: string, status: OfferStatus) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('supplier_offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) throw new Error(error.message);
  },
};

export const bazcoinService = {
  async getBalance(userId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const { data } = await supabase
      .from('buyers').select('bazcoins').eq('id', userId).maybeSingle();
    return (data as any)?.bazcoins ?? 0;
  },
  async getTransactions(userId: string, limit = 30) {
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase
      .from('bazcoin_transactions').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  },
};
