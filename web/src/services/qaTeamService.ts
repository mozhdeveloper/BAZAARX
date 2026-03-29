/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * QA Team Service
 * Handles all QA team-specific operations for the separated QA portal
 * 
 * This service is used by QA team members for:
 * - Digital review of products
 * - Sample tracking
 * - Physical review of products
 * - Verify/Reject/Revision actions
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from './notificationService';
import type { ProductAssessmentStatus, QATeamMember } from '@/types/database.types';

// QA Portal status filters
export type QAQueueFilter = 'all' | 'digital_review' | 'waiting_sample' | 'physical_review' | 'verified' | 'revision' | 'rejected';

export interface QAAssessmentItem {
  id: string;
  product_id: string;
  status: ProductAssessmentStatus;
  assigned_to: string | null;
  admin_accepted_at: string | null;
  submitted_at: string;
  verified_at: string | null;
  revision_requested_at: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    category_id: string;
    seller_id?: string;
    category?: { name: string };
    images?: { image_url: string; is_primary: boolean }[];
    variants?: { id: string; variant_name: string; sku: string; price: number; stock: number }[];
    seller?: { store_name?: string; owner_name?: string };
  };
  logistics?: string;
  batchId?: string | null;
  rejection_reason?: string;
  rejection_stage?: 'digital' | 'physical';
}

export interface QADashboardStats {
  pendingAdminReview: number;
  pendingDigitalReview: number;
  verified: number;
  forRevision: number;
  rejected: number;
  assignedToMe: number;
}

class QATeamService {
  private static instance: QATeamService;

  static getInstance(): QATeamService {
    if (!QATeamService.instance) {
      QATeamService.instance = new QATeamService();
    }
    return QATeamService.instance;
  }

  /**
   * Get current QA team member profile
   */
  async getCurrentQAMember(): Promise<QATeamMember | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('qa_team_members')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching QA member:', error);
      return null;
    }
    return data;
  }

  /**
   * Get dashboard stats for QA portal
   */
  async getDashboardStats(qaUserId?: string): Promise<QADashboardStats> {
    if (!isSupabaseConfigured()) {
      return { pendingAdminReview: 0, pendingDigitalReview: 0, verified: 0, forRevision: 0, rejected: 0, assignedToMe: 0 };
    }

    const { data, error } = await supabase
      .from('product_assessments')
      .select('status, assigned_to');

    if (error) {
      console.error('Error fetching QA stats:', error);
      return { pendingAdminReview: 0, pendingDigitalReview: 0, verified: 0, forRevision: 0, rejected: 0, assignedToMe: 0 };
    }

    const stats: QADashboardStats = {
      pendingAdminReview: data.filter(a => a.status === 'pending_admin_review').length,
      pendingDigitalReview: data.filter(a => a.status === 'pending_digital_review').length,
      verified: data.filter(a => a.status === 'verified').length,
      forRevision: data.filter(a => a.status === 'for_revision').length,
      rejected: data.filter(a => a.status === 'rejected').length,
      assignedToMe: qaUserId ? data.filter(a => a.assigned_to === qaUserId).length : 0,
    };

    return stats;
  }

  /**
   * Get all QA assessments with optional status filter (for QA portal)
   */
  async getAssessments(statusFilter?: ProductAssessmentStatus): Promise<QAAssessmentItem[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('product_assessments')
      .select(`
        *,
        product:products (
          id, name, description, price, category_id, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, sku, price, stock),
          seller:sellers (store_name, owner_name)
        ),
        logistics_records:product_assessment_logistics (details, created_at)
      `)
      .order('created_at', { ascending: false });

    // Filter by specific status or show all
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching QA assessments:', error);
      return [];
    }

    return (data || []).map(item => this.transformAssessment(item));
  }

  /**
   * Get assessments assigned to a specific QA member
   */
  async getMyAssessments(qaUserId: string): Promise<QAAssessmentItem[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('product_assessments')
      .select(`
        *,
        product:products (
          id, name, description, price, category_id, seller_id,
          category:categories (name),
          images:product_images (image_url, is_primary),
          variants:product_variants (id, variant_name, sku, price, stock),
          seller:sellers (store_name, owner_name)
        ),
        logistics_records:product_assessment_logistics (details, created_at)
      `)
      .eq('assigned_to', qaUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my QA assessments:', error);
      return [];
    }

    return (data || []).map(item => this.transformAssessment(item));
  }

  /**
   * Claim/assign an assessment to a QA member
   */
  async claimAssessment(assessmentId: string, qaUserId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('product_assessments')
      .update({ assigned_to: qaUserId })
      .eq('id', assessmentId);

    if (error) throw error;

    // Log the action
    const { data: assessment } = await supabase
      .from('product_assessments')
      .select('product_id')
      .eq('id', assessmentId)
      .single();

    if (assessment) {
      await this.logAction(assessmentId, assessment.product_id, qaUserId, 'assigned');
    }
  }

  /**
   * QA: Approve product → verify and publish (product goes live)
   * Simplified flow: Admin accepts listing → QA approves → verified → visible to buyers
   */
  async passDigitalReview(productId: string, qaUserId: string, notes?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const assessment = await this.getAssessmentByProductId(productId);
    if (!assessment) throw new Error('Assessment not found');
    if (assessment.status !== 'pending_digital_review') {
      throw new Error('Product must be in pending_digital_review status');
    }

    // Update assessment to verified
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('product_id', productId);

    if (error) throw error;

    // Update product to approved (goes live, visible to buyers)
    const { error: prodError } = await supabase
      .from('products')
      .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (prodError) throw prodError;

    // Create approval record (may fail silently if FK constraint blocks QA users)
    try {
      await supabase.from('product_approvals').insert({
        assessment_id: assessment.id,
        description: notes || 'QA approved - product verified and published',
        created_by: qaUserId,
      });
    } catch (e) {
      console.warn('[QATeamService] Could not create approval record:', e);
    }

    // Log action
    await this.logAction(assessment.id, productId, qaUserId, 'qa_approved_verified', notes);

    // Notify seller that product is approved and live
    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product?.seller_id) {
      try {
        await notificationService.notifySellerProductApproved({
          sellerId: product.seller_id,
          productId,
          productName: product.name || 'Your product',
        });
      } catch (e) {
        console.error('[QATeamService] Notification error:', e);
      }
    }
  }

  /**
   * QA: Pass physical review → verify product → product goes live
   */
  async passPhysicalReview(productId: string, qaUserId: string, notes?: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const assessment = await this.getAssessmentByProductId(productId);
    if (!assessment) throw new Error('Assessment not found');
    if (assessment.status !== 'pending_physical_review') {
      throw new Error('Product must be in pending_physical_review status');
    }

    // Update assessment
    const { error: assessError } = await supabase
      .from('product_assessments')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('product_id', productId);

    if (assessError) throw assessError;

    // Update product to approved (goes live)
    const { error: prodError } = await supabase
      .from('products')
      .update({ approval_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (prodError) throw prodError;

    // Create approval record (may fail silently if FK constraint blocks QA users)
    try {
      await supabase.from('product_approvals').insert({
        assessment_id: assessment.id,
        description: notes || 'Product verified and approved',
        created_by: qaUserId,
      });
    } catch (e) {
      console.warn('[QATeamService] Could not create approval record:', e);
    }

    // Log
    await this.logAction(assessment.id, productId, qaUserId, 'verified', notes);

    // Notify seller
    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product?.seller_id) {
      try {
        await notificationService.notifySellerProductApproved({
          sellerId: product.seller_id,
          productId,
          productName: product.name || 'Your product',
        });
      } catch (e) {
        console.error('[QATeamService] Notification error:', e);
      }
    }
  }

  /**
   * QA: Reject product
   */
  async rejectProduct(productId: string, qaUserId: string, reason: string, stage: 'digital' | 'physical'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const assessment = await this.getAssessmentByProductId(productId);
    if (!assessment) throw new Error('Assessment not found');

    // Update assessment
    const { error: assessError } = await supabase
      .from('product_assessments')
      .update({ status: 'rejected' })
      .eq('product_id', productId);

    if (assessError) throw assessError;

    // Update product
    const { error: prodError } = await supabase
      .from('products')
      .update({ approval_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (prodError) throw prodError;

    // Create rejection record (may fail silently if FK constraint blocks QA users)
    try {
      await supabase.from('product_rejections').insert({
        assessment_id: assessment.id,
        product_id: productId,
        description: reason,
        created_by: qaUserId,
      });
    } catch (e) {
      console.warn('[QATeamService] Could not create rejection record:', e);
    }

    // Log
    await this.logAction(assessment.id, productId, qaUserId, 'rejected', reason);

    // Notify seller
    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product?.seller_id) {
      try {
        await notificationService.notifySellerProductRejected({
          sellerId: product.seller_id,
          productId,
          productName: product.name || 'Your product',
          reason,
          stage,
        });
      } catch (e) {
        console.error('[QATeamService] Notification error:', e);
      }
    }
  }

  /**
   * QA: Request revision
   */
  async requestRevision(productId: string, qaUserId: string, reason: string, stage: 'digital' | 'physical'): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const assessment = await this.getAssessmentByProductId(productId);
    if (!assessment) throw new Error('Assessment not found');

    // Update assessment
    const { error } = await supabase
      .from('product_assessments')
      .update({ status: 'for_revision', revision_requested_at: new Date().toISOString() })
      .eq('product_id', productId);

    if (error) throw error;

    // Create revision record (may fail silently if FK constraint blocks QA users)
    try {
      await supabase.from('product_revisions').insert({
        assessment_id: assessment.id,
        description: reason,
        created_by: qaUserId,
      });
    } catch (e) {
      console.warn('[QATeamService] Could not create revision record:', e);
    }

    // Log
    await this.logAction(assessment.id, productId, qaUserId, 'revision_requested', reason);

    // Notify seller
    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product?.seller_id) {
      try {
        await notificationService.notifySellerRevisionRequested({
          sellerId: product.seller_id,
          productId,
          productName: product.name || 'Your product',
          reason,
        });
      } catch (e) {
        console.error('[QATeamService] Notification error:', e);
      }
    }
  }

  /**
   * Get QA review logs for audit trail
   */
  async getReviewLogs(assessmentId?: string): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from('qa_review_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query.limit(100);
      if (error) {
        // Table may not exist yet
        console.warn('[QATeamService] qa_review_logs not available:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('[QATeamService] Could not fetch review logs:', e);
      return [];
    }
  }

  // ---- Private helpers ----

  private async getAssessmentByProductId(productId: string) {
    const { data } = await supabase
      .from('product_assessments')
      .select('id, status, product_id')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }

  private async logAction(
    assessmentId: string,
    productId: string,
    reviewerId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('qa_review_logs').insert({
        assessment_id: assessmentId,
        product_id: productId,
        reviewer_id: reviewerId,
        action,
        notes: notes || null,
      });
      if (error) {
        // Table may not exist yet — silently ignore
        console.warn('[QATeamService] qa_review_logs insert failed (table may not exist):', error.message);
      }
    } catch (e) {
      // Silently ignore — logging is non-critical
      console.warn('[QATeamService] Failed to log action:', e);
    }
  }

  private transformAssessment(item: any): QAAssessmentItem {
    const latestLogisticsRecord = Array.isArray(item.logistics_records)
      ? [...item.logistics_records].sort(
          (a: { created_at?: string }, b: { created_at?: string }) =>
            new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
        )[0]
      : undefined;

    const logisticsDetails = latestLogisticsRecord?.details || null;

    let batchId: string | null = null;
    if (typeof logisticsDetails === 'string' && logisticsDetails.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(logisticsDetails);
        batchId = parsed?.batchId || null;
      } catch {
        batchId = null;
      }
    }

    return {
      id: item.id,
      product_id: item.product_id,
      status: item.status,
      assigned_to: item.assigned_to || null,
      admin_accepted_at: item.admin_accepted_at || null,
      submitted_at: item.submitted_at,
      verified_at: item.verified_at,
      revision_requested_at: item.revision_requested_at,
      created_at: item.created_at,
      product: item.product,
      logistics: logisticsDetails,
      batchId,
      rejection_reason: item.rejection_reason || null,
      rejection_stage: item.rejection_stage || null,
    };
  }
}

export const qaTeamService = QATeamService.getInstance();
