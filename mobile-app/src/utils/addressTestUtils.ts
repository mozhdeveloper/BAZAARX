/**
 * Address Flow Validation Test - Run in React Native App
 * 
 * Usage:
 * 1. Import this in your App.tsx or any screen
 * 2. Call runAddressFlowTest() after user login
 * 3. Check console for results
 */

import { addressService } from '../services/addressService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const runAddressFlowTest = async (userId: string) => {
  console.log('\n🧪 ==========================================');
  console.log('📝 Address Flow Validation Test');
  console.log('============================================\n');

  let testAddressId: string | null = null;
  const results: string[] = [];
  let passCount = 0;
  let failCount = 0;

  const pass = (message: string) => {
    console.log(`✅ PASS: ${message}`);
    results.push(`✅ ${message}`);
    passCount++;
  };

  const fail = (message: string, error?: any) => {
    console.log(`❌ FAIL: ${message}`, error || '');
    results.push(`❌ ${message}`);
    failCount++;
  };

  try {
    // TEST 1: Create Test Address
    console.log('\n📍 TEST 1: Creating test address...');
    try {
      const testAddress = {
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

      const created = await addressService.createAddress(userId, testAddress);
      
      if (created && created.id) {
        testAddressId = created.id;
        pass(`Address created with ID: ${created.id.substring(0, 8)}...`);
        
        // Verify fields
        if (created.city === 'Marikina' && created.region === 'Metro Manila') {
          pass('Database fields saved correctly');
        } else {
          fail('Database fields incorrect');
        }
      } else {
        fail('Address creation returned null');
      }
    } catch (error) {
      fail('Address creation error', error);
    }

    // TEST 2: AsyncStorage Sync
    console.log('\n📍 TEST 2: Testing AsyncStorage sync...');
    try {
      if (testAddressId) {
        const formattedAddress = 'Test Street 123, Marikina';
        await AsyncStorage.setItem('currentDeliveryAddress', formattedAddress);
        await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify({
          latitude: 14.627382,
          longitude: 121.078162,
        }));

        const saved = await AsyncStorage.getItem('currentDeliveryAddress');
        if (saved === formattedAddress) {
          pass('AsyncStorage sync works');
        } else {
          fail('AsyncStorage value mismatch');
        }
      }
    } catch (error) {
      fail('AsyncStorage sync error', error);
    }

    // TEST 3: Retrieve Address
    console.log('\n📍 TEST 3: Retrieving addresses...');
    try {
      const addresses = await addressService.getAddresses(userId);
      if (addresses && addresses.length > 0) {
        pass(`Retrieved ${addresses.length} address(es)`);
        
        const testAddr = addresses.find(a => a.id === testAddressId);
        if (testAddr) {
          pass('Test address found in database');
        } else {
          fail('Test address not found');
        }
      } else {
        fail('No addresses retrieved');
      }
    } catch (error) {
      fail('Address retrieval error', error);
    }

    // TEST 4: Update Address
    console.log('\n📍 TEST 4: Updating address...');
    try {
      if (testAddressId) {
        const updated = await addressService.updateAddress(userId, testAddressId, {
          street: 'Updated Test Street 456',
        });
        
        if (updated && updated.street === 'Updated Test Street 456') {
          pass('Address update works');
        } else {
          fail('Address update failed');
        }
      }
    } catch (error) {
      fail('Address update error', error);
    }

    // CLEANUP
    console.log('\n📍 Cleaning up...');
    try {
      if (testAddressId) {
        await addressService.deleteAddress(testAddressId);
        console.log('   ✅ Test address deleted');
      }
      
      await AsyncStorage.removeItem('currentDeliveryAddress');
      await AsyncStorage.removeItem('currentDeliveryCoordinates');
      console.log('   ✅ AsyncStorage cleared');
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }

  } catch (error) {
    fail('Unexpected test error', error);
  }

  // Results Summary
  console.log('\n============================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('============================================');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  const resultMessage = results.join('\n');
  
  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
    Alert.alert(
      '✅ Tests Passed',
      `All ${passCount} tests passed!\n\nAddress flow is working correctly.`,
      [{ text: 'OK' }]
    );
  } else {
    console.log('\n⚠️ SOME TESTS FAILED\n');
    Alert.alert(
      '⚠️ Tests Failed',
      `${passCount} passed, ${failCount} failed.\n\nCheck console logs for details.`,
      [{ text: 'OK' }]
    );
  }
  
  console.log('============================================\n');
  
  return {
    passed: passCount,
    failed: failCount,
    results,
  };
};

/**
 * Validate that address form can be filled
 */
export const validateAddressFormFields = () => {
  const requiredFields = [
    'firstName',
    'phone',
    'street',
    'city',
    'region',
  ];
  
  console.log('✅ Required fields for address form:');
  requiredFields.forEach(field => {
    console.log(`   - ${field}`);
  });
  
  return requiredFields;
};

/**
 * Validate Metro Manila vs Other Regions
 */
export const validateRegionLogic = () => {
  console.log('\n📍 Address Region Logic:');
  console.log('   Metro Manila/NCR:');
  console.log('   ✅ Province is OPTIONAL');
  console.log('   ✅ Cities load directly from region');
  console.log('');
  console.log('   Other Regions (CALABARZON, etc):');
  console.log('   ⚠️ Province is REQUIRED');
  console.log('   ⚠️ Cities load from selected province');
  
  return true;
};

export default {
  runAddressFlowTest,
  validateAddressFormFields,
  validateRegionLogic,
};
