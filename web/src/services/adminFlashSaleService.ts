import { supabase } from '../lib/supabase';

// Service for managing global flash sale slots
class AdminFlashSaleService {
  async createGlobalFlashSaleSlot(name: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('global_flash_sale_slots')
      .insert([{ name, start_date: startDate, end_date: endDate }]);
    if (error) throw error;
    return data;
  }

  async getGlobalFlashSaleSlots() {
    const { data, error } = await supabase
      .from('global_flash_sale_slots')
      .select('*');
    if (error) throw error;
    return data;
  }

  async updateGlobalFlashSaleSlot(id: string, updates: any) {
    const { data, error } = await supabase
      .from('global_flash_sale_slots')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  async deleteGlobalFlashSaleSlot(id: string) {
    const { data, error } = await supabase
      .from('global_flash_sale_slots')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  // Service for managing submissions
  async getFlashSaleSubmissions(slotId: string) {
    const { data, error } = await supabase
      .from('flash_sale_submissions')
      .select('*')
      .eq('slot_id', slotId);
    if (error) throw error;
    return data;
  }

  async approveFlashSaleSubmission(submissionId: string) {
    const { data, error } = await supabase
      .from('flash_sale_submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId);
    if (error) throw error;
    return data;
  }

  async rejectFlashSaleSubmission(submissionId: string) {
    const { data, error } = await supabase
      .from('flash_sale_submissions')
      .update({ status: 'rejected' })
      .eq('id', submissionId);
    if (error) throw error;
    return data;
  }
}

export const adminFlashSaleService = new AdminFlashSaleService();
