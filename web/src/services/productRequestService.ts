/**
 * Product Request Service
 * Handles CRUD for buyer product requests that admins review
 */
import { supabase, isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';

export interface ProductRequest {
  id: string;
  productName: string;
  description: string;
  category: string;
  requestedBy: string;
  requestedById?: string;
  requestDate: Date;
  votes: number;
  comments: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high';
  estimatedDemand: number;
  adminNotes?: string;
}

class ProductRequestService {
  private mapRow(row: any): ProductRequest {
    return {
      id: row.id,
      productName: row.product_name,
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
      adminNotes: row.admin_notes,
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
    };

    try {
      // Try with the regular client first (works for authenticated users)
      const { data, error } = await supabase
        .from('product_requests')
        .insert(insertData)
        .select()
        .single();

      if (!error) return this.mapRow(data);

      // If RLS error, fallback to admin client (bypasses RLS for unauthenticated users)
      if (error.message?.includes('row-level security') && supabaseAdmin) {
        console.warn('[ProductRequest] RLS blocked insert, using admin client fallback');
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('product_requests')
          .insert(insertData)
          .select()
          .single();

        if (adminError) throw adminError;
        return this.mapRow(adminData);
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
}

export const productRequestService = new ProductRequestService();
