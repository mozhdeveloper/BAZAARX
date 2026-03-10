import { supabase } from '../lib/supabase';

// Service for sellers to interact with flash sales
class SellerFlashSaleService {
  async getAvailableGlobalSlots() {
    const { data, error } = await supabase
      .from('global_flash_sale_slots')
      .select('*')
      .gt('end_date', new Date().toISOString());
    if (error) throw error;
    return data;
  }

  async submitProductToGlobalFlashSale(slotId: string, productId: string, price: number, stock: number) {
    const { data, error } = await supabase.from('flash_sale_submissions').insert([
      {
        slot_id: slotId,
        product_id: productId,
        submitted_price: price,
        submitted_stock: stock,
      },
    ]);
    if (error) throw error;
    return data;
  }

  async createStoreCampaign(campaignDetails: any) {
    const { data, error } = await supabase.from('discount_campaigns').insert([
      {
        ...campaignDetails,
        campaign_scope: 'store',
      },
    ]);
    if (error) throw error;
    return data;
  }

  async getStoreCampaigns(sellerId: string) {
    const { data, error } = await supabase
      .from('discount_campaigns')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('campaign_scope', 'store');
    if (error) throw error;
    return data;
  }
}

export const sellerFlashSaleService = new SellerFlashSaleService();
