/**
 * Request Support Service — wraps the support_product_request RPC.
 * Handles upvote / pledge / stake (BX-07-006, BX-07-007, BX-07-008).
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type SupportType = 'upvote' | 'pledge' | 'stake';

export interface RequestSupportRow {
  id: string;
  requestId: string;
  userId: string;
  supportType: SupportType;
  bazcoinAmount: number;
  rewarded: boolean;
  createdAt: Date;
}

class RequestSupportService {
  async support(
    requestId: string,
    supportType: SupportType,
    bazcoinAmount = 0
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Not configured' };
    const { data, error } = await supabase.rpc('support_product_request', {
      p_request_id: requestId,
      p_support_type: supportType,
      p_bazcoin_amount: bazcoinAmount,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, newBalance: (data as any)?.new_balance };
  }

  async getSupportsForRequest(requestId: string): Promise<RequestSupportRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('request_supports')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(this.mapRow);
  }

  async getUserSupports(userId: string): Promise<RequestSupportRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('request_supports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(this.mapRow);
  }

  async getUserSupportsForRequest(userId: string, requestId: string): Promise<RequestSupportRow[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('request_supports')
      .select('*')
      .eq('user_id', userId)
      .eq('request_id', requestId);
    if (error || !data) return [];
    return data.map(this.mapRow);
  }

  private mapRow(r: any): RequestSupportRow {
    return {
      id: r.id,
      requestId: r.request_id,
      userId: r.user_id,
      supportType: r.support_type,
      bazcoinAmount: r.bazcoin_amount,
      rewarded: !!r.rewarded,
      createdAt: new Date(r.created_at),
    };
  }
}

export const requestSupportService = new RequestSupportService();
