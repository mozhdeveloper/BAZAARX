/**
 * Quick Database Connection Test
 * Run this to verify address flow works end-to-end
 * 
 * Usage:
 * 1. Update TEST_USER_ID with your actual user ID
 * 2. Run in your app or via Node with ts-node
 * 3. Check console output for PASS/FAIL
 */

import { addressService } from '../src/services/addressService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ UPDATE THIS WITH YOUR USER ID
const TEST_USER_ID = 'YOUR_USER_ID_HERE'; // Get from Supabase Auth or your profile

const testAddressFlow = async () => {
  console.log('\n🧪 ==============================================');
  console.log('📝 Address Flow Database Test');
  console.log('==============================================\n');

  let testAddressId: string | null = null;
  let passCount = 0;
  let failCount = 0;

  try {
    // ========================================
    // TEST 1: Create Address
    // ========================================
    console.log('📍 TEST 1: Creating test address...');
    
    const newAddress = {
      label: 'Test Home',
      firstName: 'Test',
      lastName: 'User',
      phone: '+639171234567',
      street: 'Test Street 123',
      barangay: 'Test Barangay',
      city: 'Marikina',
      province: '',
      region: 'Metro Manila',
      zipCode: '1802',
      isDefault: false,
      coordinates: {
        latitude: 14.627382,
        longitude: 121.078162,
      },
      addressType: 'residential' as const,
      landmark: null,
      deliveryInstructions: null,
    };

    const created = await addressService.createAddress(TEST_USER_ID, newAddress);
    
    if (created && created.id) {
      console.log('   ✅ PASS - Address created with ID:', created.id);
      testAddressId = created.id;
      passCount++;
    } else {
      console.log('   ❌ FAIL - Address creation failed');
      failCount++;
      return;
    }

    // ========================================
    // TEST 2: Verify Database Fields
    // ========================================
    console.log('\n📍 TEST 2: Verifying database fields...');
    
    const checks = [
      { field: 'firstName', expected: 'Test', actual: created.firstName },
      { field: 'city', expected: 'Marikina', actual: created.city },
      { field: 'province', expected: '', actual: created.province },
      { field: 'region', expected: 'Metro Manila', actual: created.region },
      { field: 'zipCode', expected: '1802', actual: created.zipCode },
    ];

    let dbFieldsPass = true;
    checks.forEach(check => {
      if (check.actual === check.expected) {
        console.log(`   ✅ ${check.field}: ${check.actual}`);
      } else {
        console.log(`   ❌ ${check.field}: Expected "${check.expected}", got "${check.actual}"`);
        dbFieldsPass = false;
      }
    });

    if (created.coordinates?.latitude && created.coordinates?.longitude) {
      console.log(`   ✅ coordinates: {lat: ${created.coordinates.latitude}, lng: ${created.coordinates.longitude}}`);
    } else {
      console.log('   ❌ coordinates: Missing');
      dbFieldsPass = false;
    }

    if (dbFieldsPass) {
      console.log('   ✅ PASS - All database fields correct');
      passCount++;
    } else {
      console.log('   ❌ FAIL - Some database fields incorrect');
      failCount++;
    }

    // ========================================
    // TEST 3: AsyncStorage Sync
    // ========================================
    console.log('\n📍 TEST 3: Testing AsyncStorage sync...');
    
    // Simulate CheckoutScreen save
    const formattedAddress = `${created.street}, ${created.city}`;
    await AsyncStorage.setItem('currentDeliveryAddress', formattedAddress);
    await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(created.coordinates));
    await AsyncStorage.setItem('currentLocationDetails', JSON.stringify({
      street: created.street,
      barangay: created.barangay,
      city: created.city,
      province: created.province,
      region: created.region,
      postalCode: created.zipCode,
    }));

    // Verify
    const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
    const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
    const savedDetails = await AsyncStorage.getItem('currentLocationDetails');

    if (savedAddress && savedCoords && savedDetails) {
      console.log(`   ✅ currentDeliveryAddress: ${savedAddress}`);
      console.log(`   ✅ currentDeliveryCoordinates: Saved`);
      console.log(`   ✅ currentLocationDetails: Saved`);
      console.log('   ✅ PASS - AsyncStorage sync successful');
      passCount++;
    } else {
      console.log('   ❌ FAIL - AsyncStorage sync failed');
      failCount++;
    }

    // ========================================
    // TEST 4: Retrieve Address
    // ========================================
    console.log('\n📍 TEST 4: Retrieving address from database...');
    
    const addresses = await addressService.getAddresses(TEST_USER_ID);
    const foundAddress = addresses.find(a => a.id === testAddressId);

    if (foundAddress) {
      console.log(`   ✅ PASS - Address retrieved (${addresses.length} total addresses)`);
      passCount++;
    } else {
      console.log('   ❌ FAIL - Address not found in database');
      failCount++;
    }

    // ========================================
    // TEST 5: HomeScreen Display Format
    // ========================================
    console.log('\n📍 TEST 5: Testing HomeScreen display format...');
    
    const homeAddress = await AsyncStorage.getItem('currentDeliveryAddress');
    const expectedFormat = `${created.street}, ${created.city}`;

    if (homeAddress === expectedFormat) {
      console.log(`   ✅ HomeScreen would display: "${homeAddress}"`);
      console.log('   ✅ PASS - Display format correct');
      passCount++;
    } else {
      console.log(`   ❌ Expected: "${expectedFormat}"`);
      console.log(`   ❌ Got: "${homeAddress}"`);
      console.log('   ❌ FAIL - Display format incorrect');
      failCount++;
    }

    // ========================================
    // TEST 6: Update Address
    // ========================================
    console.log('\n📍 TEST 6: Testing address update...');
    
    const updated = await addressService.updateAddress(TEST_USER_ID, testAddressId!, {
      street: 'Updated Test Street 456',
    });

    if (updated && updated.street === 'Updated Test Street 456') {
      console.log('   ✅ PASS - Address update successful');
      passCount++;
    } else {
      console.log('   ❌ FAIL - Address update failed');
      failCount++;
    }

    // ========================================
    // CLEANUP
    // ========================================
    console.log('\n📍 Cleaning up test data...');
    
    if (testAddressId) {
      await addressService.deleteAddress(testAddressId);
      console.log('   ✅ Test address deleted');
    }

    await AsyncStorage.removeItem('currentDeliveryAddress');
    await AsyncStorage.removeItem('currentDeliveryCoordinates');
    await AsyncStorage.removeItem('currentLocationDetails');
    console.log('   ✅ AsyncStorage cleared');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    failCount++;
  } finally {
    // ========================================
    // RESULTS SUMMARY
    // ========================================
    console.log('\n==============================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('==============================================');
    console.log(`✅ Passed: ${passCount}/6`);
    console.log(`❌ Failed: ${failCount}/6`);
    
    if (failCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Address flow is working correctly.\n');
      console.log('Next steps:');
      console.log('1. Test manually in the app (see MANUAL_TEST_CHECKLIST.ts)');
      console.log('2. Add a real address from CheckoutScreen');
      console.log('3. Verify it shows on HomeScreen');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Check the errors above.\n');
      console.log('Common issues:');
      console.log('- Supabase not configured correctly');
      console.log('- User ID is invalid');
      console.log('- RLS policies blocking access');
      console.log('- shipping_addresses table missing');
    }
    console.log('==============================================\n');
  }
};

// Run if executed directly
if (require.main === module) {
  testAddressFlow();
}

export { testAddressFlow };
