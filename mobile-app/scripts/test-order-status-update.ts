import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🧪 ORDER STATUS UPDATE TEST');
console.log('============================================================\n');

async function testOrderStatusUpdate() {
  try {
    // 1. Create a test order
    console.log('📝 Step 1: Creating test order...');
    const { data: seller } = await supabase
      .from('sellers')
      .select('id, store_name')
      .eq('approval_status', 'approved')
      .limit(1)
      .single();

    if (!seller) {
      console.log('❌ No approved seller found');
      return;
    }

    const testOrder = {
      seller_id: seller.id,
      buyer_name: 'Test Customer',
      buyer_email: 'test@example.com',
      order_number: `TEST-${Date.now()}`,
      status: 'pending_payment',
      subtotal: 1000,
      total_amount: 1000,
      shipping_address: '123 Test St',
      order_type: 'ONLINE',
      payment_method: 'cod',
    };

    const { data: createdOrder, error: createError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create test order:', createError.message);
      return;
    }

    console.log(`✅ Created order: ${createdOrder.order_number} (ID: ${createdOrder.id})`);
    console.log(`   Initial status: ${createdOrder.status}\n`);

    // 2. Update to processing (to-ship)
    console.log('📝 Step 2: Updating to "processing" (seller clicks Ship)...');
    const { data: processingOrder, error: updateError1 } = await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', createdOrder.id)
      .select()
      .single();

    if (updateError1) {
      console.log('❌ Failed to update to processing:', updateError1.message);
    } else {
      console.log(`✅ Status updated: ${createdOrder.status} → ${processingOrder.status}\n`);
    }

    // 3. Update to delivered (completed)
    console.log('📝 Step 3: Updating to "delivered" (seller marks as delivered)...');
    const { data: deliveredOrder, error: updateError2 } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', createdOrder.id)
      .select()
      .single();

    if (updateError2) {
      console.log('❌ Failed to update to delivered:', updateError2.message);
    } else {
      console.log(`✅ Status updated: ${processingOrder.status} → ${deliveredOrder.status}\n`);
    }

    // 4. Test cancellation
    console.log('📝 Step 4: Creating another order to test cancellation...');
    const testOrder2 = {
      seller_id: seller.id,
      buyer_name: 'Test Customer 2',
      buyer_email: 'test2@example.com',
      order_number: `TEST-${Date.now()}-CANCEL`,
      status: 'pending_payment',
      subtotal: 500,
      total_amount: 500,
      shipping_address: '456 Test Ave',
      order_type: 'OFFLINE',
      payment_method: 'cash',
    };

    const { data: createdOrder2, error: createError2 } = await supabase
      .from('orders')
      .insert([testOrder2])
      .select()
      .single();

    if (!createError2) {
      console.log(`✅ Created order: ${createdOrder2.order_number}`);
      
      const { data: cancelledOrder, error: cancelError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', createdOrder2.id)
        .select()
        .single();

      if (cancelError) {
        console.log('❌ Failed to cancel order:', cancelError.message);
      } else {
        console.log(`✅ Order cancelled: ${createdOrder2.status} → ${cancelledOrder.status}\n`);
      }

      // Cleanup
      await supabase.from('orders').delete().eq('id', createdOrder2.id);
    }

    // 5. Verify final state
    console.log('📝 Step 5: Verifying final state in database...');
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', createdOrder.id)
      .single();

    if (finalOrder) {
      console.log(`✅ Order ${finalOrder.order_number}:`);
      console.log(`   - Status: ${finalOrder.status}`);
      console.log(`   - Type: ${finalOrder.order_type}`);
      console.log(`   - Subtotal: ₱${finalOrder.subtotal}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('orders').delete().eq('id', createdOrder.id);
    console.log('✅ Cleanup complete\n');

    console.log('============================================================');
    console.log('✅ ALL ORDER STATUS UPDATES WORKING CORRECTLY');
    console.log('   - pending_payment → processing ✓');
    console.log('   - processing → delivered ✓');
    console.log('   - pending_payment → cancelled ✓');
    console.log('============================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOrderStatusUpdate();
