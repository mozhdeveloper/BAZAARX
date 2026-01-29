/**
 * QA Service
 * Handles all product QA workflow database operations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ProductQAStatus = 
  | 'PENDING_DIGITAL_REVIEW'
  | 'WAITING_FOR_SAMPLE'
  | 'IN_QUALITY_REVIEW'
  | 'ACTIVE_VERIFIED'
  | 'FOR_REVISION'
  | 'REJECTED';

export interface QAProductDB {
  id: string;
  product_id: string;
  vendor: string;
  status: ProductQAStatus;
  logistics: string | null;
  rejection_reason: string | null;
  rejection_stage: 'digital' | 'physical' | null;
  submitted_at: string;
  approved_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export class QAService {
  private static instance: QAService;

  private constructor() {
    if (QAService.instance) {
      throw new Error('Use QAService.getInstance() instead of new QAService()');
    }
  }

  public static getInstance(): QAService {
    if (!QAService.instance) {
      QAService.instance = new QAService();
    }
    return QAService.instance;
  }

  /**
   * Create QA entry when product is first created
   */
  async createQAEntry(
    productId: string,
    vendorName: string,
    sellerId: string
  ): Promise<QAProductDB | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot create QA entry');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('product_qa')
        .insert({
          product_id: productId,
          vendor: vendorName,
          status: 'PENDING_DIGITAL_REVIEW',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating QA entry:', error);
      throw new Error('Failed to create QA entry');
    }
  }

  /**
   * Get QA entries by seller ID (via product relationship)
   */
  async getQAEntriesBySeller(sellerId: string): Promise<QAProductDB[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch QA entries');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            seller_id,
            name,
            price,
            category,
            images
          )
        `)
        .eq('product.seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching QA entries by seller:', error);
      return [];
    }
  }

  /**
   * Get all QA entries (for admin)
   */
  async getAllQAEntries(): Promise<QAProductDB[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch QA entries');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id,
            name,
            price,
            category,
            images,
            seller_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all QA entries:', error);
      return [];
    }
  }

  /**
   * Update QA status and sync to products table
   */
  async updateQAStatus(
    productId: string,
    status: ProductQAStatus,
    metadata?: {
      logistics?: string;
      rejectionReason?: string;
      rejectionStage?: 'digital' | 'physical';
    }
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot update QA status');
      return;
    }

    try {
      // Update product_qa table
      const qaUpdate: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'WAITING_FOR_SAMPLE') {
        qaUpdate.approved_at = new Date().toISOString();
      } else if (status === 'ACTIVE_VERIFIED') {
        qaUpdate.verified_at = new Date().toISOString();
      } else if (status === 'REJECTED') {
        qaUpdate.rejected_at = new Date().toISOString();
        qaUpdate.rejection_reason = metadata?.rejectionReason || null;
        qaUpdate.rejection_stage = metadata?.rejectionStage || null;
      } else if (status === 'FOR_REVISION') {
        qaUpdate.revision_requested_at = new Date().toISOString();
        qaUpdate.rejection_reason = metadata?.rejectionReason || null;
        qaUpdate.rejection_stage = metadata?.rejectionStage || null;
      } else if (status === 'IN_QUALITY_REVIEW') {
        qaUpdate.logistics = metadata?.logistics || null;
      }

      const { error: qaError } = await supabase
        .from('product_qa')
        .update(qaUpdate)
        .eq('product_id', productId);

      if (qaError) throw qaError;

      // Map QA status to product approval_status
      const approvalStatusMap: Record<ProductQAStatus, string> = {
        'PENDING_DIGITAL_REVIEW': 'pending',
        'WAITING_FOR_SAMPLE': 'pending',
        'IN_QUALITY_REVIEW': 'pending',
        'ACTIVE_VERIFIED': 'approved',
        'FOR_REVISION': 'pending',
        'REJECTED': 'rejected',
      };

      // Update products table
      const productUpdate: any = {
        approval_status: approvalStatusMap[status],
        updated_at: new Date().toISOString(),
      };

      if (status === 'REJECTED' || status === 'FOR_REVISION') {
        productUpdate.rejection_reason = metadata?.rejectionReason || null;
      }

      const { error: productError } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', productId);

      if (productError) throw productError;

      console.log(`✅ QA Status updated: ${productId} → ${status}`);
    } catch (error) {
      console.error('Error updating QA status:', error);
      throw new Error('Failed to update QA status');
    }
  }

  /**
   * Approve product for sample submission (Digital Review passed)
   */
  async approveForSampleSubmission(productId: string): Promise<void> {
    return this.updateQAStatus(productId, 'WAITING_FOR_SAMPLE');
  }

  /**
   * Submit sample (Seller action)
   */
  async submitSample(productId: string, logisticsMethod: string): Promise<void> {
    return this.updateQAStatus(productId, 'IN_QUALITY_REVIEW', {
      logistics: logisticsMethod,
    });
  }

  /**
   * Pass quality check (Physical QA passed)
   */
  async passQualityCheck(productId: string): Promise<void> {
    return this.updateQAStatus(productId, 'ACTIVE_VERIFIED');
  }

  /**
   * Reject product
   */
  async rejectProduct(
    productId: string,
    reason: string,
    stage: 'digital' | 'physical'
  ): Promise<void> {
    return this.updateQAStatus(productId, 'REJECTED', {
      rejectionReason: reason,
      rejectionStage: stage,
    });
  }

  /**
   * Request revision
   */
  async requestRevision(
    productId: string,
    reason: string,
    stage: 'digital' | 'physical'
  ): Promise<void> {
    return this.updateQAStatus(productId, 'FOR_REVISION', {
      rejectionReason: reason,
      rejectionStage: stage,
    });
  }

  /**
   * Get QA entry by product ID
   */
  async getQAEntryByProductId(productId: string): Promise<QAProductDB | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching QA entry:', error);
      return null;
    }
  }
}

export const qaService = QAService.getInstance();
