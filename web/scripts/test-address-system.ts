/**
 * Address System Test Script
 * Tests address CRUD operations with coordinates/map support
 * Tests both frontend form fields and backend database operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mdawdegxofjsjrvygqbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kYXdkZWd4b2Zqc2pydnlncWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTE2OTcsImV4cCI6MjA4NDAyNzY5N30.ediCAbhR5G5RdScXEK39kwB9dvlYc0dqYoCT9I75ivg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test buyer account
const TEST_BUYER = {
  email: 'anna.cruz@gmail.com',
  password: 'Buyer123!'
};

let buyerId: string = '';
let testAddressId: string = '';

// Test results tracking
let passed = 0;
let failed = 0;
const results: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

function logResult(name: string, success: boolean, error?: string) {
  if (success) {
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', error });
    console.log(`  ❌ ${name}: ${error}`);
  }
}

// ============ TEST FUNCTIONS ============

async function test01_BuyerAuth() {
  console.log('\n📋 TEST 1: Buyer Authentication');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_BUYER.email,
      password: TEST_BUYER.password
    });
    
    if (error) throw error;
    buyerId = data.user?.id || '';
    logResult('Buyer login successful', true);
    console.log(`    Buyer ID: ${buyerId}`);
  } catch (error: any) {
    logResult('Buyer login', false, error.message);
  }
}

async function test02_GetExistingAddresses() {
  console.log('\n📋 TEST 2: Get Existing Addresses');
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    console.log(`    Found ${data?.length || 0} existing addresses`);
    if (data && data.length > 0) {
      data.forEach((addr, i) => {
        console.log(`    ${i + 1}. ${addr.label}: ${addr.street}, ${addr.city}`);
        if (addr.coordinates) {
          console.log(`       📍 Coordinates: ${addr.coordinates.lat}, ${addr.coordinates.lng}`);
        }
      });
    }
    logResult('Fetched addresses', true);
  } catch (error: any) {
    logResult('Fetch addresses', false, error.message);
  }
}

async function test03_CreateAddressWithoutCoordinates() {
  console.log('\n📋 TEST 3: Create Address Without Coordinates');
  try {
    const newAddress = {
      user_id: buyerId,
      label: 'Test Office',
      first_name: 'Anna',
      last_name: 'Cruz',
      phone: '09171234567',
      street: '123 Test Street',
      barangay: 'Poblacion',
      city: 'Makati',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1234',
      is_default: false
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert([newAddress])
      .select()
      .single();

    if (error) throw error;
    
    testAddressId = data.id;
    console.log(`    Created address ID: ${testAddressId}`);
    logResult('Create address without coordinates', true);
  } catch (error: any) {
    logResult('Create address without coordinates', false, error.message);
  }
}

async function test04_CreateAddressWithCoordinates() {
  console.log('\n📋 TEST 4: Create Address With Coordinates (Map Location)');
  try {
    const newAddress = {
      user_id: buyerId,
      label: 'Test Map Location',
      first_name: 'Anna',
      last_name: 'Cruz',
      phone: '09171234567',
      street: 'Ayala Avenue corner Makati Avenue',
      barangay: 'Bel-Air',
      city: 'Makati',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1226',
      is_default: false,
      coordinates: {
        lat: 14.5547,
        lng: 121.0244
      }
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert([newAddress])
      .select()
      .single();

    if (error) throw error;
    
    console.log(`    Created address ID: ${data.id}`);
    console.log(`    📍 Coordinates: ${data.coordinates.lat}, ${data.coordinates.lng}`);
    
    // Verify coordinates were saved correctly
    if (data.coordinates?.lat === 14.5547 && data.coordinates?.lng === 121.0244) {
      logResult('Create address with coordinates', true);
    } else {
      throw new Error('Coordinates not saved correctly');
    }
    
    // Store for cleanup
    testAddressId = data.id;
  } catch (error: any) {
    logResult('Create address with coordinates', false, error.message);
  }
}

async function test05_UpdateAddressCoordinates() {
  console.log('\n📋 TEST 5: Update Address With New Coordinates');
  try {
    const newCoordinates = {
      lat: 14.5995,
      lng: 120.9842 // Updated to Manila
    };

    const { data, error } = await supabase
      .from('addresses')
      .update({
        coordinates: newCoordinates,
        city: 'Manila',
        province: 'Metro Manila'
      })
      .eq('id', testAddressId)
      .select()
      .single();

    if (error) throw error;
    
    console.log(`    Updated coordinates to: ${data.coordinates.lat}, ${data.coordinates.lng}`);
    console.log(`    Updated city: ${data.city}`);
    
    if (data.coordinates?.lat === 14.5995 && data.coordinates?.lng === 120.9842) {
      logResult('Update address coordinates', true);
    } else {
      throw new Error('Coordinates not updated correctly');
    }
  } catch (error: any) {
    logResult('Update address coordinates', false, error.message);
  }
}

async function test06_SetDefaultAddress() {
  console.log('\n📋 TEST 6: Set Address as Default');
  try {
    // First unset all defaults
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', buyerId);

    // Set our test address as default
    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', testAddressId)
      .select()
      .single();

    if (error) throw error;
    
    if (data.is_default === true) {
      console.log(`    ⭐ Address ${testAddressId} is now default`);
      logResult('Set default address', true);
    } else {
      throw new Error('Default flag not set');
    }
  } catch (error: any) {
    logResult('Set default address', false, error.message);
  }
}

async function test07_GetDefaultAddress() {
  console.log('\n📋 TEST 7: Get Default Address');
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', buyerId)
      .eq('is_default', true)
      .single();

    if (error) throw error;
    
    console.log(`    Default address: ${data.label} - ${data.street}, ${data.city}`);
    if (data.coordinates) {
      console.log(`    📍 Coordinates: ${data.coordinates.lat}, ${data.coordinates.lng}`);
    }
    logResult('Get default address', true);
  } catch (error: any) {
    logResult('Get default address', false, error.message);
  }
}

async function test08_AddressWithDeliveryInstructions() {
  console.log('\n📋 TEST 8: Create Address with Delivery Instructions');
  try {
    const newAddress = {
      user_id: buyerId,
      label: 'Home with Instructions',
      first_name: 'Anna',
      last_name: 'Cruz',
      phone: '09171234567',
      street: '456 Sample Street',
      barangay: 'San Antonio',
      city: 'Pasig',
      province: 'Metro Manila',
      region: 'NCR',
      zip_code: '1600',
      is_default: false,
      landmark: 'Near SM Megamall',
      delivery_instructions: 'Please call before delivery. Gate code: 1234',
      address_type: 'residential',
      coordinates: {
        lat: 14.5849,
        lng: 121.0590
      }
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert([newAddress])
      .select()
      .single();

    if (error) throw error;
    
    console.log(`    Created address ID: ${data.id}`);
    console.log(`    Landmark: ${data.landmark}`);
    console.log(`    Instructions: ${data.delivery_instructions}`);
    logResult('Create address with delivery instructions', true);
    
    // Cleanup - delete this test address
    await supabase.from('addresses').delete().eq('id', data.id);
  } catch (error: any) {
    logResult('Create address with delivery instructions', false, error.message);
  }
}

async function test09_DeleteTestAddresses() {
  console.log('\n📋 TEST 9: Cleanup Test Addresses');
  try {
    // Delete test addresses created during this test run
    const { data: addresses } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', buyerId)
      .in('label', ['Test Office', 'Test Map Location', 'Home with Instructions']);

    if (addresses && addresses.length > 0) {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .in('id', addresses.map(a => a.id));

      if (error) throw error;
      console.log(`    Deleted ${addresses.length} test addresses`);
    } else {
      console.log('    No test addresses to clean up');
    }
    
    logResult('Cleanup test addresses', true);
  } catch (error: any) {
    logResult('Cleanup test addresses', false, error.message);
  }
}

async function test10_VerifyAddressSchema() {
  console.log('\n📋 TEST 10: Verify Address Schema Supports All Fields');
  try {
    // Check if we can create an address with all fields
    const fullAddress = {
      user_id: buyerId,
      label: 'Schema Test',
      first_name: 'Test',
      last_name: 'User',
      phone: '09123456789',
      street: 'Test Street',
      barangay: 'Test Barangay',
      city: 'Test City',
      province: 'Test Province',
      region: 'Test Region',
      zip_code: '1234',
      landmark: 'Test Landmark',
      delivery_instructions: 'Test Instructions',
      is_default: false,
      address_type: 'commercial' as const,
      coordinates: { lat: 0, lng: 0 }
    };

    const { data, error } = await supabase
      .from('addresses')
      .insert([fullAddress])
      .select()
      .single();

    if (error) throw error;

    // Verify all fields
    const fieldsToCheck = [
      'label', 'first_name', 'last_name', 'phone', 'street', 
      'barangay', 'city', 'province', 'region', 'zip_code',
      'landmark', 'delivery_instructions', 'is_default', 
      'address_type', 'coordinates'
    ];

    const missingFields = fieldsToCheck.filter(field => !(field in data));
    
    if (missingFields.length === 0) {
      console.log('    All address fields supported ✓');
      logResult('Schema supports all fields', true);
    } else {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }

    // Cleanup
    await supabase.from('addresses').delete().eq('id', data.id);
  } catch (error: any) {
    logResult('Schema supports all fields', false, error.message);
  }
}

// ============ MAIN EXECUTION ============

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         BAZAARPH ADDRESS SYSTEM TEST SUITE                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n⏰ Started at: ${new Date().toLocaleString()}`);

  await test01_BuyerAuth();
  
  if (buyerId) {
    await test02_GetExistingAddresses();
    await test03_CreateAddressWithoutCoordinates();
    await test04_CreateAddressWithCoordinates();
    await test05_UpdateAddressCoordinates();
    await test06_SetDefaultAddress();
    await test07_GetDefaultAddress();
    await test08_AddressWithDeliveryInstructions();
    await test09_DeleteTestAddresses();
    await test10_VerifyAddressSchema();
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total:  ${passed + failed}`);
  console.log(`\n  Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    - ${r.name}: ${r.error}`);
    });
  }

  console.log(`\n⏰ Completed at: ${new Date().toLocaleString()}`);
  
  // Sign out
  await supabase.auth.signOut();
}

runTests().catch(console.error);
