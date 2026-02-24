/**
 * QA Service
 * Handles all product assessment workflow database operations
 * 
 * Updated for new normalized schema (February 2026):
 * - Table renamed from product_qa to product_assessments
 * - Status values are lowercase: pending_digital_review, waiting_for_sample, etc.
 * - Separate tables for approvals, rejections, revisions
 * - Uses category_id and product_images joins
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from './notificationService';
import type { ProductAssessmentStatus } from '@/types/database.types';

// New normalized status values (lowercase)
export type ProductAssessmentStatusType = ProductAssessmentStatus;

// Legacy status type for backwards compatibility
export type ProductQAStatus = 
  | 'PENDING_DIGITAL_REVIEW'
  | 'WAITING_FOR_SAMPLE'
  | 'IN_QUALITY_REVIEW'
  | 'ACTIVE_VERIFIED'
  | 'FOR_REVISION'
  | 'REJECTED';

// Status mapping from legacy to new
const LEGACY_TO_NEW_STATUS: Record<ProductQAStatus, ProductAssessmentStatusType> = {
  'PENDING_DIGITAL_REVIEW': 'pending_digital_review',
  'WAITING_FOR_SAMPLE': 'waiting_for_sample',
  'IN_QUALITY_REVIEW': 'pending_physical_review',
  'ACTIVE_VERIFIED': 'verified',
  'FOR_REVISION': 'for_revision',
  'REJECTED': 'rejected',
};

// Status mapping from new to legacy
const NEW_TO_LEGACY_STATUS: Record<ProductAssessmentStatusType, ProductQAStatus> = {
  'pending_digital_review': 'PENDING_DIGITAL_REVIEW',
  'waiting_for_sample': 'WAITING_FOR_SAMPLE',
  'pending_physical_review': 'IN_QUALITY_REVIEW',
  'verified': 'ACTIVE_VERIFIED',
  'for_revision': 'FOR_REVISION',
  'rejected': 'REJECTED',
};

// New normalized assessment structure
// Variant structure
export interface ProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  stock: number;
  thumbnail_url?: string | null;
}

export interface ProductAssessment {
  id: string;
  product_id: string;
  status: ProductAssessmentStatusType;
  submitted_at: string;
  verified_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    category_id: string;
    seller_id?: string;
    variant_label_1?: string | null;
    variant_label_2?: string | null;
    category?: { name: string };
    images?: { image_url: string; is_primary: boolean }[];
    variants?: ProductVariant[];
    seller?: { store_name?: string; owner_name?: string };
  };
  // Computed from related tables
  logistics?: string;
  rejection_reason?: string;
  rejection_stage?: 'digital' | 'physical';
}

// Legacy interface for backwards compatibility
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
  // Extended fields
  product?: any;
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
   * Transform new assessment to legacy format
   * Uses pre-joined data when available, falls back to individual queries with maybeSingle()
   */
  private async transformToLegacy(assessment: ProductAssessment & { 
    logistics_records?: any[]; 
    rejection_records?: any[]; 
    revision_records?: any[];
    seller?: { store_name?: string; owner_name?: string } | null;
  }): Promise<QAProductDB> {
    // Use pre-joined data if available (from enriched queries), otherwise fetch individually
    let logisticsDetails: string | null = null;
    let rejectionDesc: string | null = null;
    let revisionDesc: string | null = null;

    if (assessment.logistics_records !== undefined) {
      // Data was pre-joined in the query
      logisticsDetails = assessment.logistics_records?.[0]?.details || null;
      rejectionDesc = assessment.rejection_records?.[0]?.description || null;
      revisionDesc = assessment.revision_records?.[0]?.description || null;
    } else {
      // Fallback: fetch individually using maybeSingle() to avoid 406 errors
      const { data: logistics } = await supabase
        .from('product_assessment_logistics')
        .select('details')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: rejection } = await supabase
        .from('product_rejections')
        .select('description, vendor_submitted_category, admin_reclassified_category')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: revision } = await supabase
        .from('product_revisions')
        .select('description')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      logisticsDetails = logistics?.details || null;
      rejectionDesc = rejection?.description || null;
      revisionDesc = revision?.description || null;
    }

    const legacyStatus = NEW_TO_LEGACY_STATUS[assessment.status] || 'PENDING_DIGITAL_REVIEW';

    // Resolve vendor name: prefer seller.store_name, fallback to product name
    const vendor = (assessment as any).seller?.store_name 
      || assessment.product?.seller?.store_name
      || assessment.product?.name 
      || 'Unknown';
    
    return {
      id: assessment.id,
      product_id: assessment.product_id,
      vendor,
      status: legacyStatus,
      logistics: logisticsDetails,
      rejection_reason: rejectionDesc || revisionDesc || null,
      rejection_stage: assessment.status === 'rejected' ? 'digital' : null,
      submitted_at: assessment.submitted_at,
      approved_at: assessment.status === 'waiting_for_sample' ? assessment.submitted_at : null,
      verified_at: assessment.verified_at,
      rejected_at: assessment.status === 'rejected' ? assessment.created_at : null,
      revision_requested_at: assessment.revision_requested_at,
      created_at: assessment.created_at,
      updated_at: assessment.created_at,
      product: assessment.product,
    };
  }

  /**
   * Get all assessments (for admin view)
   */
  async getAllAssessments(): Promise<ProductAssessment[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch assessments');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all assessments:', error);
      return [];
    }
  }

  /**
   * Get pending assessments (for QA queue)
   */
  async getPendingAssessments(): Promise<ProductAssessment[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch pending assessments');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url)
          )
        `)
        .in('status', ['pending_digital_review', 'waiting_for_sample', 'pending_physical_review'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending assessments:', error);
      return [];
    }
  }

  /**
   * Get assessments by status
   */
  async getAssessmentsByStatus(status: ProductAssessmentStatusType): Promise<ProductAssessment[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch assessments');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url)
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching assessments by status:', error);
      return [];
    }
  }

  /**
   * Get assessment by product ID
   */
  async getAssessmentByProductId(productId: string): Promise<ProductAssessment | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch assessment');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url)
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching assessment:', error);
      return null;
    }
  }

  /**
   * Create assessment entry when product is first created.
   * Uses upsert to avoid unique constraint errors on retry, and does NOT
   * rely on SELECT after insert (which can fail due to RLS SELECT policies).
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
      // Upsert so retries are idempotent (unique constraint on product_id)
      const { error } = await supabase
        .from('product_assessments')
        .upsert(
          {
            product_id: productId,
            status: 'pending_digital_review',
            submitted_at: new Date().toISOString(),
            created_by: sellerId || null,
          },
          { onConflict: 'product_id', ignoreDuplicates: true }
        );

      if (error) {
        console.error('[QA Service] createQAEntry upsert error:', error);
        throw error;
      }

      console.log(`[QA Service] Assessment created/confirmed for product ${productId}`);
      // Return minimal object — caller will reload from DB to get full data
      return null;
    } catch (error) {
      console.error('Error creating QA entry:', error);
      throw new Error('Failed to create QA entry');
    }
  }

  /**
   * Get assessment entries by seller ID (via product relationship)
   */
  async getQAEntriesBySeller(sellerId: string): Promise<QAProductDB[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch QA entries');
      return [];
    }

    try {
      // Use !inner join so PostgREST actually filters (without !inner, it returns all rows with null product)
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products!inner (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
            seller:sellers (store_name, owner_name)
          ),
          logistics_records:product_assessment_logistics (details),
          rejection_records:product_rejections (description),
          revision_records:product_revisions (description)
        `)
        .eq('product.seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const assessments = data || [];
      return Promise.all(assessments.map(a => this.transformToLegacy(a as any)));
    } catch (error) {
      console.error('Error fetching QA entries by seller:', error);
      return [];
    }
  }

  /**
   * Find products that exist in the products table but have NO product_assessment record.
   * These are "orphans" — products whose QA entry creation failed or was skipped.
   */
  async getOrphanProducts(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      // Get all product IDs that already have assessments
      const { data: assessed, error: assessedError } = await supabase
        .from('product_assessments')
        .select('product_id');

      if (assessedError) throw assessedError;

      const assessedIds = new Set((assessed || []).map((a: any) => a.product_id));

      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, seller_id, seller:sellers (store_name)')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Return products without assessments
      const orphans = (products || []).filter((p: any) => !assessedIds.has(p.id));
      return orphans;
    } catch (error) {
      console.error('[QA Service] Error finding orphan products:', error);
      return [];
    }
  }

  /**
   * Get all assessment entries (for admin)
   */
  async getAllQAEntries(): Promise<QAProductDB[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch QA entries');
      return [];
    }

    try {
      // Enriched query: join related tables to avoid N+1 queries in transformToLegacy
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            category_id,
            seller_id,
            variant_label_1,
            variant_label_2,
            category:categories (name),
            images:product_images (image_url, is_primary),
            variants:product_variants (id, variant_name, sku, size, color, price, stock, thumbnail_url),
            seller:sellers (store_name, owner_name)
          ),
          logistics_records:product_assessment_logistics (details),
          rejection_records:product_rejections (description),
          revision_records:product_revisions (description)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const assessments = data || [];
      return Promise.all(assessments.map(a => this.transformToLegacy(a as any)));
    } catch (error) {
      console.error('Error fetching all QA entries:', error);
      return [];
    }
  }

  /**
   * Update assessment status and sync to products table
   * New schema: Uses product_assessments + separate tables for approvals/rejections/revisions
   */
  async updateQAStatus(
    productId: string,
    status: ProductQAStatus,
    metadata?: {
      logistics?: string;
      rejectionReason?: string;
      rejectionStage?: 'digital' | 'physical';
      adminId?: string;
    }
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot update QA status');
      return;
    }

    try {
      // First get product details and assessment for notification
      const { data: product } = await supabase
        .from('products')
        .select('id, name, seller_id')
        .eq('id', productId)
        .single();

      // Use maybeSingle() + order to safely handle 0 or multiple assessments (no unique constraint)
      const { data: assessment } = await supabase
        .from('product_assessments')
        .select('id')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!assessment) {
        throw new Error('Assessment not found for product');
      }

      // Map legacy status to new status
      const newStatus = LEGACY_TO_NEW_STATUS[status];

      // Update product_assessments table
      const assessmentUpdate: any = {
        status: newStatus,
      };

      if (newStatus === 'verified') {
        assessmentUpdate.verified_at = new Date().toISOString();
      } else if (newStatus === 'for_revision') {
        assessmentUpdate.revision_requested_at = new Date().toISOString();
      }

      const { error: assessmentError } = await supabase
        .from('product_assessments')
        .update(assessmentUpdate)
        .eq('product_id', productId);

      if (assessmentError) throw assessmentError;

      // Create related records based on status
      if (newStatus === 'waiting_for_sample' || newStatus === 'verified') {
        // Create approval record
        await supabase
          .from('product_approvals')
          .insert({
            assessment_id: assessment.id,
            description: newStatus === 'verified' ? 'Product verified and approved' : 'Digital review passed, awaiting sample',
            created_by: metadata?.adminId || null,
          });
      } else if (newStatus === 'rejected') {
        // Create rejection record
        await supabase
          .from('product_rejections')
          .insert({
            assessment_id: assessment.id,
            product_id: productId,
            description: metadata?.rejectionReason || null,
            created_by: metadata?.adminId || null,
          });
      } else if (newStatus === 'for_revision') {
        // Create revision record
        await supabase
          .from('product_revisions')
          .insert({
            assessment_id: assessment.id,
            description: metadata?.rejectionReason || null,
            created_by: metadata?.adminId || null,
          });
      } else if (newStatus === 'pending_physical_review' && metadata?.logistics) {
        // Create logistics record
        await supabase
          .from('product_assessment_logistics')
          .insert({
            assessment_id: assessment.id,
            details: metadata.logistics,
            created_by: metadata?.adminId || null,
          });
      }

      // Map assessment status to product approval_status
      const approvalStatusMap: Record<ProductAssessmentStatusType, string> = {
        'pending_digital_review': 'pending',
        'waiting_for_sample': 'pending',
        'pending_physical_review': 'pending',
        'verified': 'approved',
        'for_revision': 'pending',
        'rejected': 'rejected',
      };

      // Update products table
      const productUpdate: any = {
        approval_status: approvalStatusMap[newStatus],
        updated_at: new Date().toISOString(),
      };

      const { error: productError } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', productId);

      if (productError) throw productError;

      console.log(`✅ Assessment status updated: ${productId} → ${newStatus}`);

      // Send notifications to seller based on status change
      if (product?.seller_id) {
        try {
          if (status === 'WAITING_FOR_SAMPLE') {
            await notificationService.notifySellerSampleRequest({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
            });
          } else if (status === 'ACTIVE_VERIFIED') {
            await notificationService.notifySellerProductApproved({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
            });
          } else if (status === 'REJECTED') {
            await notificationService.notifySellerProductRejected({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
              reason: metadata?.rejectionReason || 'No reason provided',
              stage: metadata?.rejectionStage || 'digital',
            });
          } else if (status === 'FOR_REVISION') {
            await notificationService.notifySellerRevisionRequested({
              sellerId: product.seller_id,
              productId: productId,
              productName: product.name || 'Your product',
              reason: metadata?.rejectionReason || 'Please review and update your product',
            });
          }
        } catch (notifError) {
          console.error('[QAService] Error sending notification:', notifError);
          // Don't fail the QA update if notification fails
        }
      }
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
   * Get assessment entry by product ID
   */
  async getQAEntryByProductId(productId: string): Promise<QAProductDB | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            category_id,
            seller_id
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? this.transformToLegacy(data) : null;
    } catch (error) {
      console.error('Error fetching QA entry:', error);
      return null;
    }
  }
}

export const qaService = QAService.getInstance();
