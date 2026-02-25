/**
 * Create QA Assessments for Existing Products
 * This script creates product_assessments entries for products that don't have any
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createAssessments() {
  console.log('Creating QA assessments for existing products...\n');

  // Get all products that don't have assessments
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, approval_status, seller_id');

  if (productsError) {
    console.error('Error fetching products:', productsError);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No products found');
    process.exit(0);
  }

  // Get existing assessments
  const { data: existingAssessments } = await supabase
    .from('product_assessments')
    .select('product_id');

  const existingProductIds = new Set(existingAssessments?.map(a => a.product_id) || []);

  // Create assessments for products without them
  let created = 0;
  for (const product of products) {
    if (existingProductIds.has(product.id)) {
      continue;
    }

    // Determine initial status based on approval_status
    // Products marked as 'approved' should be in 'verified' status
    // Products marked as 'pending' should be in 'pending_digital_review'
    const qaStatus = product.approval_status === 'approved' 
      ? 'verified' 
      : product.approval_status === 'rejected' 
        ? 'rejected' 
        : 'pending_digital_review';

    const { error } = await supabase
      .from('product_assessments')
      .insert({
        product_id: product.id,
        status: qaStatus,
        submitted_at: new Date().toISOString(),
        verified_at: qaStatus === 'verified' ? new Date().toISOString() : null,
        notes: `Auto-created assessment for existing product`
      });

    if (error) {
      console.log(`  ❌ ${product.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${product.name} → ${qaStatus}`);
      created++;
    }
  }

  console.log(`\n✅ Created ${created} assessments`);
  
  // Now let's also create some "pending" products for testing
  console.log('\nCreating test products for QA review...');
  
  // Get a seller ID to use
  const { data: sellers } = await supabase.from('sellers').select('id').limit(1);
  const sellerId = sellers?.[0]?.id;
  
  if (sellerId) {
    // Get a category
    const { data: categories } = await supabase.from('categories').select('id').limit(1);
    const categoryId = categories?.[0]?.id;
    
    if (categoryId) {
      const testProducts = [
        { name: 'Test QA Product 1 - Pending Review', price: 999, approval_status: 'pending' },
        { name: 'Test QA Product 2 - Needs Approval', price: 1499, approval_status: 'pending' },
        { name: 'Test QA Product 3 - New Submission', price: 2999, approval_status: 'pending' },
      ];
      
      for (const tp of testProducts) {
        // Create product
        const { data: newProduct, error: prodError } = await supabase
          .from('products')
          .insert({
            name: tp.name,
            description: 'Test product for QA review testing',
            price: tp.price,
            category_id: categoryId,
            seller_id: sellerId,
            approval_status: tp.approval_status,
          })
          .select()
          .single();
          
        if (prodError) {
          console.log(`  ❌ Failed to create ${tp.name}: ${prodError.message}`);
          continue;
        }
        
        // Create assessment
        const { error: assessError } = await supabase
          .from('product_assessments')
          .insert({
            product_id: newProduct.id,
            status: 'pending_digital_review',
            submitted_at: new Date().toISOString(),
          });
          
        if (assessError) {
          console.log(`  ❌ Failed to create assessment for ${tp.name}: ${assessError.message}`);
        } else {
          console.log(`  ✓ Created test product: ${tp.name}`);
        }
      }
    }
  }
  
  console.log('\n✅ Done!');
  process.exit(0);
}

createAssessments();
