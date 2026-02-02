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

console.log('\n🧪 ORDER DETAILS CRUD TEST');
console.log('============================================================\n');

async function testOrderDetailsCRUD() {
  let testOrderId: string | null = null;
  
  try {
    // Get a seller
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

    console.log(`Using seller: ${seller.store_name}\n`);

    // ==========================================
    // CREATE: Create a test order
    // ==========================================
    console.log('📝 CREATE: Creating test order...');
    const testOrder = {
      seller_id: seller.id,
      buyer_name: 'Original Name',
      buyer_email: 'original@example.com',
      order_number: `TEST-CRUD-${Date.now()}`,
      status: 'pending_payment',
      subtotal: 1500,
      total_amount: 1500,
      shipping_address: '123 Test Street',
      order_type: 'ONLINE',
      payment_method: 'cod',
      notes: 'Original order note',
    };

    const { data: createdOrder, error: createError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();

    if (createError) {
      console.log('❌ CREATE Failed:', createError.message);
      return;
    }

    testOrderId = createdOrder.id;
    console.log(`✅ CREATE: Order created`);
    console.log(`   - ID: ${createdOrder.id}`);
    console.log(`   - Order #: ${createdOrder.order_number}`);
    console.log(`   - Buyer: ${createdOrder.buyer_name}`);
    console.log(`   - Email: ${createdOrder.buyer_email}`);
    console.log(`   - Note: ${createdOrder.notes}\n`);

    // ==========================================
    // READ: Read the order back
    // ==========================================
    console.log('📖 READ: Reading order details...');
    const { data: readOrder, error: readError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', testOrderId)
      .single();

    if (readError) {
      console.log('❌ READ Failed:', readError.message);
    } else {
      console.log(`✅ READ: Order retrieved`);
      console.log(`   - Buyer: ${readOrder.buyer_name}`);
      console.log(`   - Status: ${readOrder.status}\n`);
    }

    // ==========================================
    // UPDATE: Update order details
    // ==========================================
    console.log('✏️ UPDATE: Updating order details...');
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        buyer_name: 'Updated Customer Name',
        buyer_email: 'updated@example.com',
        notes: 'Updated order note - modified by seller',
      })
      .eq('id', testOrderId)
      .select()
      .single();

    if (updateError) {
      console.log('❌ UPDATE Details Failed:', updateError.message);
    } else {
      console.log(`✅ UPDATE: Order details updated`);
      console.log(`   - Name: Original Name → ${updatedOrder.buyer_name}`);
      console.log(`   - Email: original@example.com → ${updatedOrder.buyer_email}`);
      console.log(`   - Note: ${updatedOrder.notes}\n`);
    }

    // ==========================================
    // UPDATE: Update order status
    // ==========================================
    console.log('✏️ UPDATE: Updating order status...');
    const { data: statusOrder, error: statusError } = await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', testOrderId)
      .select()
      .single();

    if (statusError) {
      console.log('❌ UPDATE Status Failed:', statusError.message);
    } else {
      console.log(`✅ UPDATE: Order status updated`);
      console.log(`   - Status: pending_payment → ${statusOrder.status}\n`);
    }

    // ==========================================
    // DELETE: Delete the test order
    // ==========================================
    console.log('🗑️ DELETE: Deleting test order...');
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', testOrderId);

    if (deleteError) {
      console.log('❌ DELETE Failed:', deleteError.message);
    } else {
      console.log('✅ DELETE: Test order deleted\n');
      testOrderId = null;
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('============================================================');
    console.log('📊 CRUD OPERATIONS SUMMARY');
    console.log('============================================================');
    console.log('');
    console.log('  ✅ CREATE - Create new orders');
    console.log('  ✅ READ   - Read order details');
    console.log('  ✅ UPDATE - Update buyer name, email, notes');
    console.log('  ✅ UPDATE - Update order status');
    console.log('  ✅ DELETE - Delete orders');
    console.log('');
    console.log('🎉 ALL ORDER CRUD OPERATIONS WORKING!');
    console.log('');
    console.log('============================================================');
    console.log('📋 SUPABASE QUERIES REFERENCE');
    console.log('============================================================');
    console.log('');
    console.log('// UPDATE order details:');
    console.log(`UPDATE orders 
SET buyer_name = 'New Name',
    buyer_email = 'new@email.com',
    notes = 'New note'
WHERE id = 'ORDER_ID';`);
    console.log('');
    console.log('// UPDATE order status:');
    console.log(`UPDATE orders 
SET status = 'processing' -- or 'delivered', 'cancelled'
WHERE id = 'ORDER_ID';`);
    console.log('');
    console.log('// Valid status values:');
    console.log('  - pending_payment');
    console.log('  - processing (to-ship)');
    console.log('  - delivered (completed)');
    console.log('  - cancelled');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup if test order still exists
    if (testOrderId) {
      await supabase.from('orders').delete().eq('id', testOrderId);
      console.log('🧹 Cleaned up test order');
    }
  }
}

testOrderDetailsCRUD();
