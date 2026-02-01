/**
 * QA Service for Mobile App
 * Handles all product QA workflow database operations
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { notificationService } from './notificationService';

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

export interface QAProductWithDetails extends QAProductDB {
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    original_price?: number;
    category: string;
    images: string[];
    seller_id: string;
    stock: number;
    is_active: boolean;
    approval_status: string;
  };
  seller?: {
    id: string;
    business_name: string;
    store_name: string;
  };
}

class QAService {
  private static instance: QAService;

  private constructor() {}

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
    vendorName: string
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
  async getQAEntriesBySeller(sellerId: string): Promise<QAProductWithDetails[]> {
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
            seller_id,
            name,
            description,
            price,
            original_price,
            category,
            images,
            stock,
            is_active,
            approval_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by seller ID (done client-side since Supabase doesn't support nested filtering well)
      const filtered = (data || []).filter(
        (entry: any) => entry.product?.seller_id === sellerId
      );

      return filtered as QAProductWithDetails[];
    } catch (error) {
      console.error('Error fetching QA entries by seller:', error);
      return [];
    }
  }

  /**
   * Get all QA entries (for admin)
   */
  async getAllQAEntries(): Promise<QAProductWithDetails[]> {
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
            seller_id,
            name,
            description,
            price,
            original_price,
            category,
            images,
            stock,
            is_active,
            approval_status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as QAProductWithDetails[];
    } catch (error) {
      console.error('Error fetching all QA entries:', error);
      return [];
    }
  }

  /**
   * Update QA status
   */
  async updateQAStatus(
    productId: string,
    newStatus: ProductQAStatus,
    additionalData?: {
      logistics?: string;
      rejection_reason?: string;
      rejection_stage?: 'digital' | 'physical';
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot update QA status');
      return false;
    }

    try {
      // First get product details for notification
      const { data: product } = await supabase
        .from('products')
        .select('id, name, seller_id')
        .eq('id', productId)
        .single();

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add timestamps based on status
      if (newStatus === 'WAITING_FOR_SAMPLE') {
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'ACTIVE_VERIFIED') {
        updateData.verified_at = new Date().toISOString();
      } else if (newStatus === 'REJECTED') {
        updateData.rejected_at = new Date().toISOString();
      } else if (newStatus === 'FOR_REVISION') {
        updateData.revision_requested_at = new Date().toISOString();
      }

      // Add additional data
      if (additionalData) {
        if (additionalData.logistics) {
          updateData.logistics = additionalData.logistics;
        }
        if (additionalData.rejection_reason) {
          updateData.rejection_reason = additionalData.rejection_reason;
        }
        if (additionalData.rejection_stage) {
          updateData.rejection_stage = additionalData.rejection_stage;
        }
      }

      const { error } = await supabase
        .from('product_qa')
        .update(updateData)
        .eq('product_id', productId);

      if (error) throw error;

      // Sync with products table for approval_status
      const productApprovalStatus = this.mapQAStatusToApprovalStatus(newStatus);
      if (productApprovalStatus) {
        await supabase
          .from('products')
          .update({
            approval_status: productApprovalStatus,
            rejection_reason: additionalData?.rejection_reason || null,
          })
          .eq('id', productId);
      }

      // Send notifications to seller based on status change
      if (product?.seller_id) {
        try {
          if (newStatus === 'WAITING_FOR_SAMPLE') {
            await notificationService.notifySellerSampleRequest({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
            });
          } else if (newStatus === 'ACTIVE_VERIFIED') {
            await notificationService.notifySellerProductApproved({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
            });
          } else if (newStatus === 'REJECTED') {
            await notificationService.notifySellerProductRejected({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
              reason: additionalData?.rejection_reason || 'No reason provided',
              stage: additionalData?.rejection_stage || 'digital',
            });
          } else if (newStatus === 'FOR_REVISION') {
            await notificationService.notifySellerRevisionRequested({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
              reason: additionalData?.rejection_reason || 'Please review and update your product',
            });
          }
        } catch (notifError) {
          console.error('[QAService] Error sending notification:', notifError);
          // Don't fail the QA update if notification fails
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating QA status:', error);
      return false;
    }
  }

  /**
   * Map QA status to product approval status
   */
  private mapQAStatusToApprovalStatus(qaStatus: ProductQAStatus): string | null {
    switch (qaStatus) {
      case 'ACTIVE_VERIFIED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PENDING_DIGITAL_REVIEW':
      case 'WAITING_FOR_SAMPLE':
      case 'IN_QUALITY_REVIEW':
      case 'FOR_REVISION':
        return 'pending';
      default:
        return null;
    }
  }

  /**
   * Approve product for sample submission
   */
  async approveForSampleSubmission(productId: string): Promise<boolean> {
    return this.updateQAStatus(productId, 'WAITING_FOR_SAMPLE');
  }

  /**
   * Submit sample (seller action)
   */
  async submitSample(productId: string, logistics: string): Promise<boolean> {
    return this.updateQAStatus(productId, 'IN_QUALITY_REVIEW', { logistics });
  }

  /**
   * Pass quality check (admin action)
   */
  async passQualityCheck(productId: string): Promise<boolean> {
    return this.updateQAStatus(productId, 'ACTIVE_VERIFIED');
  }

  /**
   * Reject product
   */
  async rejectProduct(
    productId: string,
    reason: string,
    stage: 'digital' | 'physical'
  ): Promise<boolean> {
    return this.updateQAStatus(productId, 'REJECTED', {
      rejection_reason: reason,
      rejection_stage: stage,
    });
  }

  /**
   * Request revision
   */
  async requestRevision(
    productId: string,
    reason: string,
    stage: 'digital' | 'physical'
  ): Promise<boolean> {
    return this.updateQAStatus(productId, 'FOR_REVISION', {
      rejection_reason: reason,
      rejection_stage: stage,
    });
  }

  /**
   * Get QA entry by product ID
   */
  async getQAEntryByProductId(productId: string): Promise<QAProductWithDetails | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch QA entry');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('product_qa')
        .select(`
          *,
          product:products!product_qa_product_id_fkey (
            id,
            seller_id,
            name,
            description,
            price,
            original_price,
            category,
            images,
            stock,
            is_active,
            approval_status
          )
        `)
        .eq('product_id', productId)
        .single();

      if (error) throw error;
      return data as QAProductWithDetails;
    } catch (error) {
      console.error('Error fetching QA entry:', error);
      return null;
    }
  }
}

export const qaService = QAService.getInstance();
