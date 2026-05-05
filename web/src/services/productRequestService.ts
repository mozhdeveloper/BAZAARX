/**
 * Product Request Service
 * Handles CRUD for buyer product requests that admins review
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type RequestStatus =
  | 'new'
  | 'under_review'
  | 'already_available'
  | 'approved_for_sourcing'
  | 'rejected'
  | 'on_hold'
  | 'converted_to_listing'
  // legacy values kept for back-compat with existing rows
  | 'pending'
  | 'approved'
  | 'in_progress';

export type SourcingStage = 'quoting' | 'sampling' | 'negotiating' | 'ready_for_verification' | null;

export interface ProductRequest {
  id: string;
  productName: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  requestedBy: string;
  requestedById?: string;
  requestDate: Date;
  votes: number;
  comments: number;
  status: RequestStatus;
  priority: 'low' | 'medium' | 'high';
  estimatedDemand: number;
  demandCount: number;
  stakedBazcoins: number;
  sourcingStage: SourcingStage;
  linkedProductId: string | null;
  rejectionHoldReason: string | null;
  mergedIntoId: string | null;
  rewardAmount: number;
  adminNotes?: string;
  referenceLinks: string[];
}

export interface RequestAuditEntry {
  id: string;
  requestId: string;
  adminId: string | null;
  action: string;
  details: any;
  createdAt: Date;
}

class ProductRequestService {
  private mapRow(row: any): ProductRequest {
    return {
      id: row.id,
      productName: row.product_name,
      title: row.title || row.product_name || 'Untitled request',
      summary: row.summary || row.description || '',
      description: row.description || '',
      category: row.category || '',
      requestedBy: row.requested_by_name || 'Anonymous',
      requestedById: row.requested_by_id,
      requestDate: new Date(row.created_at),
      votes: row.votes || 0,
      comments: row.comments_count || 0,
      status: row.status,
      priority: row.priority || 'medium',
      estimatedDemand: row.estimated_demand || 0,
      demandCount: row.demand_count || 0,
      stakedBazcoins: row.staked_bazcoins || 0,
      sourcingStage: (row.sourcing_stage as SourcingStage) ?? null,
      linkedProductId: row.linked_product_id ?? null,
      rejectionHoldReason: row.rejection_hold_reason ?? null,
      mergedIntoId: row.merged_into_id ?? null,
      rewardAmount: row.reward_amount ?? 50,
      adminNotes: row.admin_notes ?? undefined,
      referenceLinks: row.reference_links ?? [],
    };
  }

  async getAllRequests(): Promise<ProductRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet if migration hasn't run
        console.warn('product_requests table may not exist yet:', error.message);
        return [];
      }

      return (data || []).map((row: any) => this.mapRow(row));
    } catch (error) {
      console.error('Failed to load product requests:', error);
      return [];
    }
  }

  async getRequestsByUser(userId: string): Promise<ProductRequest[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .eq('requested_by_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load user product requests:', error.message);
        return [];
      }

      return (data || []).map((row: any) => this.mapRow(row));
    } catch (error) {
      console.error('Failed to load user product requests:', error);
      return [];
    }
  }

  async getRequestById(id: string): Promise<ProductRequest | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return this.mapRow(data);
    } catch {
      return null;
    }
  }

  async updateStatus(id: string, status: 'approved' | 'rejected' | 'in_progress', adminNotes?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (adminNotes !== undefined) updates.admin_notes = adminNotes;

      const { error } = await supabase
        .from('product_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to update product request:', error);
      throw new Error(error.message || 'Failed to update request status');
    }
  }

  async addRequest(params: {
    productName: string;
    description: string;
    category: string;
    requestedByName: string;
    requestedById?: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedDemand?: number;
    referenceLinks?: string[];
  }): Promise<ProductRequest> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const insertData = {
      product_name: params.productName,
      description: params.description,
      category: params.category,
      requested_by_name: params.requestedByName,
      requested_by_id: params.requestedById || null,
      priority: params.priority || 'medium',
      estimated_demand: params.estimatedDemand || 0,
      reference_links: params.referenceLinks ?? [],
    };

    try {
      // Try with the regular client first (works for authenticated users)
      const { data, error } = await supabase
        .from('product_requests')
        .insert(insertData)
        .select()
        .single();

      if (!error) return this.mapRow(data);

      // If RLS error, fallback to Edge Function (handles unauthenticated users)
      if (error.message?.includes('row-level security')) {
        console.warn('[ProductRequest] RLS blocked insert, using Edge Function fallback');
        const { data: fnResult, error: fnError } = await supabase.functions.invoke('submit-product-request', {
          body: {
            productName: params.productName,
            description: params.description,
            category: params.category,
            requestedByName: params.requestedByName,
            requestedById: params.requestedById,
            priority: params.priority,
            estimatedDemand: params.estimatedDemand,
          },
        });

        if (fnError) throw fnError;
        if (fnResult?.data) return this.mapRow(fnResult.data);
        throw new Error('Edge Function returned no data');
      }

      throw error;
    } catch (error: any) {
      console.error('Failed to add product request:', error);
      throw new Error(error.message || 'Failed to add product request');
    }
  }

  async deleteRequest(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase
        .from('product_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to delete product request:', error);
      throw new Error(error.message || 'Failed to delete request');
    }
  }

  async upvoteRequest(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      // Increment votes by 1
      const { data: current, error: fetchError } = await supabase
        .from('product_requests')
        .select('votes')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('product_requests')
        .update({ votes: (current?.votes || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to upvote product request:', error);
    }
  }

  // ──────────────────────────────────────────────────────────
  // EPIC 7 — admin actions, audit log, ranking, conversion
  // ──────────────────────────────────────────────────────────

  /** Admin moderation actions go through the SECURITY DEFINER RPC. */
  async adminAction(params: {
    requestId: string;
    action: 'approve' | 'reject' | 'hold' | 'resolve' | 'merge' | 'link_product' | 'stage_change';
    reason?: string;
    targetId?: string;
    newStage?: 'quoting' | 'sampling' | 'negotiating' | 'ready_for_verification';
  }): Promise<{ success: boolean; newStatus?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('admin_action_product_request', {
      p_request_id: params.requestId,
      p_action: params.action,
      p_reason: params.reason ?? null,
      p_target_id: params.targetId ?? null,
      p_new_stage: params.newStage ?? null,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, newStatus: (data as any)?.new_status };
  }

  /** Convert an approved request into a real product listing & pay rewards. */
  async convertToListing(requestId: string, productId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('convert_request_to_listing', {
      p_request_id: requestId,
      p_product_id: productId,
    });
    if (error) return { success: false, error: error.message };
    return { success: !!(data as any)?.success };
  }

  async getAuditLog(requestId: string): Promise<RequestAuditEntry[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('request_audit_logs')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      requestId: r.request_id,
      adminId: r.admin_id,
      action: r.action,
      details: r.details,
      createdAt: new Date(r.created_at),
    }));
  }

  /** BX-07-013, BX-07-021 — search + filter + ranked listing. */
  async searchRequests(opts: {
    query?: string;
    category?: string;
    status?: string;
    sort?: 'demand' | 'recent' | 'staked';
    limit?: number;
    offset?: number;
  } = {}): Promise<ProductRequest[]> {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('product_requests').select('*');
    if (opts.query) {
      q = q.or(`title.ilike.%${opts.query}%,product_name.ilike.%${opts.query}%,summary.ilike.%${opts.query}%,description.ilike.%${opts.query}%`);
    }
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.status)   q = q.eq('status', opts.status);

    if (opts.sort === 'staked')      q = q.order('staked_bazcoins', { ascending: false });
    else if (opts.sort === 'recent') q = q.order('created_at', { ascending: false });
    else                             q = q.order('demand_count', { ascending: false }).order('staked_bazcoins', { ascending: false });

    q = q.range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 30) - 1);

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r: any) => this.mapRow(r));
  }

  /** BX-07-025 — auto-suggest existing products to admins. */
  async suggestExistingProducts(req: ProductRequest, max = 5): Promise<Array<{ id: string; name: string }>> {
    if (!isSupabaseConfigured()) return [];
    const term = req.title || req.productName;
    if (!term) return [];
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', `%${term.split(/\s+/).slice(0, 2).join(' ')}%`)
      .limit(max);
    return (data as any[]) ?? [];
  }
}

export const productRequestService = new ProductRequestService();
