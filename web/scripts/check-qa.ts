import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('Checking QA products...\n');
  
  // Check product assessments
  const { data: assessments, error } = await supabase
    .from('product_assessments')
    .select('*, product:products(name)')
    .limit(20);
    
  console.log('Product Assessments:', assessments?.length || 0, 'entries');
  if (assessments && assessments.length > 0) {
    assessments.forEach((a: any) => {
      console.log(`  - ${a.product?.name || 'Unknown'} | Status: ${a.status}`);
    });
  }
  if (error) console.log('Error:', error.message);

  // Check pending products specifically
  const { data: pendingAssessments } = await supabase
    .from('product_assessments')
    .select('*, product:products(name)')
    .eq('status', 'pending_digital_review');
  
  console.log('\n🔍 Pending Digital Review:', pendingAssessments?.length || 0);
  pendingAssessments?.forEach((a: any) => {
    console.log(`  - ${a.product?.name || 'Unknown'}`);
  });
  
  // Check products without assessments
  const { data: products, error: pError } = await supabase
    .from('products')
    .select('id, name, approval_status')
    .limit(5);
    
  console.log('\nSample Products:', products?.length || 0);
  products?.forEach((p: any) => console.log(`  - ${p.name} | approval_status: ${p.approval_status}`));
  
  process.exit(0);
}

check();
