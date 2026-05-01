/**
 * BazCoin Service — read balance + transaction ledger.
 * Writes are funnelled through SECURITY DEFINER RPCs in Postgres
 * (e.g. support_product_request, convert_request_to_listing) so
 * that balance + ledger are always in sync atomically.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface BazcoinTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: Date;
}

class BazcoinService {
  async getBalance(userId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const { data, error } = await supabase
      .from('buyers')
      .select('bazcoins')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return 0;
    return data.bazcoins ?? 0;
  }

  async getTransactions(userId: string, limit = 30): Promise<BazcoinTransaction[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('bazcoin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      amount: r.amount,
      balanceAfter: r.balance_after,
      reason: r.reason,
      referenceId: r.reference_id,
      referenceType: r.reference_type,
      createdAt: new Date(r.created_at),
    }));
  }
}

export const bazcoinService = new BazcoinService();
