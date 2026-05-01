/**
 * Supplier Offer Service — sellers/suppliers submit quotes on
 * approved-for-sourcing product requests (BX-07-039, BX-07-041).
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type OfferStatus = 'submitted' | 'shortlisted' | 'rejected' | 'awarded';

export interface SupplierOffer {
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
  updatedAt: Date;
}

class SupplierOfferService {
  private map(r: any): SupplierOffer {
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
      updatedAt: new Date(r.updated_at),
    };
  }

  async list(requestId: string): Promise<SupplierOffer[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('supplier_offers')
      .select('*, sellers ( store_name )')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(this.map);
  }

  async listForSupplier(supplierId: string): Promise<SupplierOffer[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('supplier_offers')
      .select('*, sellers ( store_name )')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(this.map);
  }

  async submit(params: {
    requestId: string;
    supplierId: string;
    price: number;
    moq: number;
    leadTimeDays: number;
    terms?: string;
    qualityNotes?: string;
  }): Promise<SupplierOffer> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('supplier_offers')
      .insert({
        request_id: params.requestId,
        supplier_id: params.supplierId,
        price: params.price,
        moq: params.moq,
        lead_time_days: params.leadTimeDays,
        terms: params.terms ?? null,
        quality_notes: params.qualityNotes ?? null,
      })
      .select('*, sellers ( store_name )')
      .single();
    if (error) throw new Error(error.message);
    return this.map(data);
  }

  async setStatus(offerId: string, status: OfferStatus): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('supplier_offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) throw new Error(error.message);
  }

  /**
   * Eligible requests that suppliers should quote on.
   * Approved-for-sourcing rows ranked by demand & stake (BX-07-021, BX-07-038).
   */
  async listEligibleForSuppliers(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('product_requests')
      .select('*')
      .eq('status', 'approved_for_sourcing')
      .order('staked_bazcoins', { ascending: false })
      .order('demand_count', { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data;
  }
}

export const supplierOfferService = new SupplierOfferService();
