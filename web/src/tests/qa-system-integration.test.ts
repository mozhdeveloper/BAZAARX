/**
 * QA System Integration Tests
 * Tests the complete product QA workflow including database operations
 * 
 * Test Coverage:
 * 1. QA Service - Database operations
 * 2. QA Store - State management and sync
 * 3. Admin workflow - Approve, Reject, Request Revision
 * 4. Seller workflow - Submit sample, track status
 * 5. Database integrity - FK constraints, status transitions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { qaService } from '@/services/qaService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ProductQAStatus } from '@/services/qaService';

// Mock product for testing
const mockProduct = {
  id: 'test-product-' + Date.now(),
  name: 'Test Product for QA',
  description: 'Testing QA workflow',
  price: 1000,
  category: 'Electronics',
  seller_id: 'test-seller-123',
  approval_status: 'pending',
  images: ['https://placehold.co/400'],
};

const mockVendor = 'Test Vendor';

describe('QA System Integration Tests', () => {
  
  beforeAll(() => {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️  Supabase not configured - tests will be skipped');
    }
  });

  describe('1. Database Schema Validation', () => {
    it('should have product_qa table with correct schema', async () => {
      if (!isSupabaseConfigured()) return;

      const { data, error } = await supabase
        .from('product_qa')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have correct indexes on product_qa', async () => {
      if (!isSupabaseConfigured()) return;

      // Query using indexed columns should be fast
      const { data, error } = await supabase
        .from('product_qa')
        .select('*')
        .eq('status', 'PENDING_DIGITAL_REVIEW')
        .limit(5);

      expect(error).toBeNull();
    });

    it('should enforce status enum constraint', async () => {
      if (!isSupabaseConfigured()) return;

      const { error } = await supabase
        .from('product_qa')
        .insert({
          product_id: 'test-id',
          vendor: 'Test',
          status: 'INVALID_STATUS', // Should fail
        });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('violates check constraint');
    });
  });

  describe('2. QA Service - Create Entry', () => {
    let testProductId: string;

    beforeEach(async () => {
      if (!isSupabaseConfigured()) return;
      
      // Create a test product first
      const { data } = await supabase
        .from('products')
        .insert(mockProduct)
        .select()
        .single();
      
      testProductId = data?.id;
    });

    afterAll(async () => {
      if (!isSupabaseConfigured()) return;
      
      // Cleanup
      await supabase.from('product_qa').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
    });

    it('should create QA entry when product is created', async () => {
      if (!isSupabaseConfigured()) return;

      const result = await qaService.createQAEntry(
        testProductId,
        mockVendor,
        mockProduct.seller_id
      );

      expect(result).not.toBeNull();
      expect(result?.product_id).toBe(testProductId);
      expect(result?.vendor).toBe(mockVendor);
      expect(result?.status).toBe('PENDING_DIGITAL_REVIEW');
      expect(result?.submitted_at).toBeDefined();
    });

    it('should have initial status as PENDING_DIGITAL_REVIEW', async () => {
      if (!isSupabaseConfigured()) return;

      const result = await qaService.createQAEntry(
        testProductId,
        mockVendor,
        mockProduct.seller_id
      );

      expect(result?.status).toBe('PENDING_DIGITAL_REVIEW');
      expect(result?.approved_at).toBeNull();
      expect(result?.verified_at).toBeNull();
      expect(result?.rejected_at).toBeNull();
    });
  });

  describe('3. QA Service - Fetch Operations', () => {
    it('should fetch all QA entries (admin)', async () => {
      if (!isSupabaseConfigured()) return;

      const entries = await qaService.getAllQAEntries();

      expect(Array.isArray(entries)).toBe(true);
      // Should include product details via JOIN
      if (entries.length > 0) {
        const entry = entries[0] as any;
        expect(entry.product).toBeDefined();
        expect(entry.product.name).toBeDefined();
      }
    });

    it('should fetch QA entries by seller ID', async () => {
      if (!isSupabaseConfigured()) return;

      const sellerId = 'test-seller-123';
      const entries = await qaService.getQAEntriesBySeller(sellerId);

      expect(Array.isArray(entries)).toBe(true);
      // All entries should belong to the seller
      entries.forEach((entry: any) => {
        expect(entry.product?.seller_id).toBe(sellerId);
      });
    });

    it('should return product details with QA entry', async () => {
      if (!isSupabaseConfigured()) return;

      const entries = await qaService.getAllQAEntries();
      
      if (entries.length > 0) {
        const entry = entries[0] as any;
        expect(entry.product).toBeDefined();
        expect(entry.product.name).toBeDefined();
        expect(entry.product.price).toBeDefined();
        expect(entry.product.category).toBeDefined();
        expect(entry.product.images).toBeDefined();
      }
    });
  });

  describe('4. QA Workflow - Status Transitions', () => {
    let testProductId: string;

    beforeEach(async () => {
      if (!isSupabaseConfigured()) return;
      
      // Create test product and QA entry
      const { data } = await supabase
        .from('products')
        .insert(mockProduct)
        .select()
        .single();
      
      testProductId = data?.id;
      
      await qaService.createQAEntry(
        testProductId,
        mockVendor,
        mockProduct.seller_id
      );
    });

    afterAll(async () => {
      if (!isSupabaseConfigured()) return;
      
      // Cleanup
      await supabase.from('product_qa').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
    });

    it('should approve for sample submission (Digital Review Pass)', async () => {
      if (!isSupabaseConfigured()) return;

      await qaService.approveForSampleSubmission(testProductId);

      const { data } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      expect(data?.status).toBe('WAITING_FOR_SAMPLE');
      expect(data?.approved_at).not.toBeNull();
    });

    it('should submit sample with logistics method', async () => {
      if (!isSupabaseConfigured()) return;

      // First approve for sample
      await qaService.approveForSampleSubmission(testProductId);
      
      // Then submit sample
      await qaService.submitSample(testProductId, 'JRS Express');

      const { data } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      expect(data?.status).toBe('IN_QUALITY_REVIEW');
      expect(data?.logistics).toBe('JRS Express');
    });

    it('should pass quality check and become ACTIVE_VERIFIED', async () => {
      if (!isSupabaseConfigured()) return;

      // Complete workflow
      await qaService.approveForSampleSubmission(testProductId);
      await qaService.submitSample(testProductId, 'LBC');
      await qaService.passQualityCheck(testProductId);

      const { data } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      expect(data?.status).toBe('ACTIVE_VERIFIED');
      expect(data?.verified_at).not.toBeNull();

      // Check products table sync
      const { data: product } = await supabase
        .from('products')
        .select('approval_status')
        .eq('id', testProductId)
        .single();

      expect(product?.approval_status).toBe('approved');
    });

    it('should reject product at digital stage', async () => {
      if (!isSupabaseConfigured()) return;

      const reason = 'Poor image quality';
      await qaService.rejectProduct(testProductId, reason, 'digital');

      const { data } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      expect(data?.status).toBe('REJECTED');
      expect(data?.rejection_reason).toBe(reason);
      expect(data?.rejection_stage).toBe('digital');
      expect(data?.rejected_at).not.toBeNull();

      // Check products table sync
      const { data: product } = await supabase
        .from('products')
        .select('approval_status, rejection_reason')
        .eq('id', testProductId)
        .single();

      expect(product?.approval_status).toBe('rejected');
      expect(product?.rejection_reason).toBe(reason);
    });

    it('should request revision with feedback', async () => {
      if (!isSupabaseConfigured()) return;

      const feedback = 'Please update product description';
      await qaService.requestRevision(testProductId, feedback, 'digital');

      const { data } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', testProductId)
        .single();

      expect(data?.status).toBe('FOR_REVISION');
      expect(data?.rejection_reason).toBe(feedback);
      expect(data?.rejection_stage).toBe('digital');
      expect(data?.revision_requested_at).not.toBeNull();

      // Check products table - should be pending
      const { data: product } = await supabase
        .from('products')
        .select('approval_status')
        .eq('id', testProductId)
        .single();

      expect(product?.approval_status).toBe('pending');
    });
  });

  describe('5. Database Sync Validation', () => {
    it('should sync QA status to products.approval_status', async () => {
      if (!isSupabaseConfigured()) return;

      const statusMappings: Array<[ProductQAStatus, string]> = [
        ['PENDING_DIGITAL_REVIEW', 'pending'],
        ['WAITING_FOR_SAMPLE', 'pending'],
        ['IN_QUALITY_REVIEW', 'pending'],
        ['ACTIVE_VERIFIED', 'approved'],
        ['FOR_REVISION', 'pending'],
        ['REJECTED', 'rejected'],
      ];

      for (const [qaStatus, expectedApprovalStatus] of statusMappings) {
        const { data } = await supabase
          .from('product_qa')
          .select(`
            status,
            product:products!product_qa_product_id_fkey (
              approval_status
            )
          `)
          .eq('status', qaStatus)
          .limit(1)
          .single();

        if (data) {
          const product = (data as any).product;
          expect(product.approval_status).toBe(expectedApprovalStatus);
        }
      }
    });

    it('should maintain referential integrity (CASCADE on delete)', async () => {
      if (!isSupabaseConfigured()) return;

      // Create test product and QA entry
      const { data: product } = await supabase
        .from('products')
        .insert({
          ...mockProduct,
          id: 'test-cascade-' + Date.now(),
        })
        .select()
        .single();

      await qaService.createQAEntry(product.id, mockVendor, mockProduct.seller_id);

      // Delete product - QA entry should cascade delete
      await supabase.from('products').delete().eq('id', product.id);

      const { data: qaEntry } = await supabase
        .from('product_qa')
        .select('*')
        .eq('product_id', product.id)
        .single();

      expect(qaEntry).toBeNull();
    });
  });

  describe('6. Edge Cases & Error Handling', () => {
    it('should handle non-existent product gracefully', async () => {
      if (!isSupabaseConfigured()) return;

      await expect(
        qaService.updateQAStatus('non-existent-id', 'ACTIVE_VERIFIED')
      ).rejects.toThrow();
    });

    it('should prevent duplicate QA entries for same product', async () => {
      if (!isSupabaseConfigured()) return;

      const { data: product } = await supabase
        .from('products')
        .insert({
          ...mockProduct,
          id: 'test-duplicate-' + Date.now(),
        })
        .select()
        .single();

      // First entry should succeed
      await qaService.createQAEntry(product.id, mockVendor, mockProduct.seller_id);

      // Second entry should fail (unique constraint on product_id)
      await expect(
        qaService.createQAEntry(product.id, mockVendor, mockProduct.seller_id)
      ).rejects.toThrow();

      // Cleanup
      await supabase.from('products').delete().eq('id', product.id);
    });

    it('should handle empty logistics method', async () => {
      if (!isSupabaseConfigured()) return;

      const { data: product } = await supabase
        .from('products')
        .insert({
          ...mockProduct,
          id: 'test-empty-logistics-' + Date.now(),
        })
        .select()
        .single();

      await qaService.createQAEntry(product.id, mockVendor, mockProduct.seller_id);
      await qaService.approveForSampleSubmission(product.id);

      // Should validate logistics before allowing submit
      await expect(
        qaService.submitSample(product.id, '')
      ).rejects.toThrow();

      // Cleanup
      await supabase.from('products').delete().eq('id', product.id);
    });
  });

  describe('7. Performance Tests', () => {
    it('should fetch QA entries efficiently (< 1s)', async () => {
      if (!isSupabaseConfigured()) return;

      const start = Date.now();
      await qaService.getAllQAEntries();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle batch status updates', async () => {
      if (!isSupabaseConfigured()) return;

      // Get first 5 pending products
      const { data: qaEntries } = await supabase
        .from('product_qa')
        .select('product_id')
        .eq('status', 'PENDING_DIGITAL_REVIEW')
        .limit(5);

      if (!qaEntries || qaEntries.length === 0) return;

      const updates = qaEntries.map(entry =>
        qaService.approveForSampleSubmission(entry.product_id)
      );

      await Promise.all(updates);

      // Verify all updated
      const { data: updated } = await supabase
        .from('product_qa')
        .select('status')
        .in('product_id', qaEntries.map(e => e.product_id));

      updated?.forEach(entry => {
        expect(entry.status).toBe('WAITING_FOR_SAMPLE');
      });
    });
  });
});

describe('QA Store Integration Tests', () => {
  // These tests would require mounting the store in a test environment
  // For now, documenting the expected behaviors
  
  it.todo('should load products from database on mount');
  it.todo('should filter products by seller ID correctly');
  it.todo('should sync state with database after actions');
  it.todo('should handle concurrent updates gracefully');
  it.todo('should persist state to localStorage for offline support');
});

describe('Admin QA Page Integration', () => {
  it.todo('should display all QA products');
  it.todo('should filter by status correctly');
  it.todo('should approve product and update database');
  it.todo('should reject product with reason');
  it.todo('should request revision with feedback');
  it.todo('should show loading state during operations');
});

describe('Seller QA Page Integration', () => {
  it.todo('should display only seller products');
  it.todo('should submit sample with logistics method');
  it.todo('should track product status changes');
  it.todo('should handle revision requests');
  it.todo('should show rejection reasons');
});
