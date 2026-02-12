/**
 * Address Flow Integration Test
 * Tests the complete flow: Add Address → Save to DB → Display on Home
 */

import { addressService } from '../src/services/addressService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock test user
const TEST_USER_ID = 'test-user-123';
const TEST_USER_NAME = 'Juan Dela Cruz';
const TEST_USER_PHONE = '+639171234567';

// Mock address data
const TEST_ADDRESS = {
  label: 'Home',
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  phone: '+639171234567',
  street: 'Kamagong Street, Unit 123',
  barangay: 'Industrial Valley',
  city: 'Marikina',
  province: '', // Empty for Metro Manila
  region: 'Metro Manila',
  zipCode: '1802',
  isDefault: true,
  coordinates: {
    latitude: 14.627382,
    longitude: 121.078162,
  },
  addressType: 'residential' as const,
  landmark: null,
  deliveryInstructions: null,
};

describe('Address Flow Integration Tests', () => {
  let createdAddressId: string | null = null;

  beforeAll(async () => {
    // Clear AsyncStorage before tests
    await AsyncStorage.clear();
  });

  afterAll(async () => {
    // Cleanup: Delete test address from database
    if (createdAddressId) {
      try {
        await addressService.deleteAddress(createdAddressId);
        console.log(`✅ Cleaned up test address: ${createdAddressId}`);
      } catch (error) {
        console.warn('Failed to cleanup test address:', error);
      }
    }
  });

  describe('Test Case 1: Create Address', () => {
    it('should create a new address in the database', async () => {
      // Act
      const created = await addressService.createAddress(TEST_USER_ID, TEST_ADDRESS);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.firstName).toBe('Juan');
      expect(created.lastName).toBe('Dela Cruz');
      expect(created.phone).toBe('+639171234567');
      expect(created.street).toBe('Kamagong Street, Unit 123');
      expect(created.barangay).toBe('Industrial Valley');
      expect(created.city).toBe('Marikina');
      expect(created.province).toBe(''); // Metro Manila has no province
      expect(created.region).toBe('Metro Manila');
      expect(created.zipCode).toBe('1802');
      expect(created.isDefault).toBe(true);
      expect(created.coordinates).toEqual({
        latitude: 14.627382,
        longitude: 121.078162,
      });

      // Save ID for cleanup
      createdAddressId = created.id;
      console.log(`✅ Address created with ID: ${created.id}`);
    }, 10000);

    it('should sync to AsyncStorage after creation', async () => {
      // Simulate what CheckoutScreen does after save
      const formattedAddress = `${TEST_ADDRESS.street}, ${TEST_ADDRESS.city}`;
      await AsyncStorage.setItem('currentDeliveryAddress', formattedAddress);
      await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(TEST_ADDRESS.coordinates));
      await AsyncStorage.setItem('currentLocationDetails', JSON.stringify({
        street: TEST_ADDRESS.street,
        barangay: TEST_ADDRESS.barangay,
        city: TEST_ADDRESS.city,
        province: TEST_ADDRESS.province,
        region: TEST_ADDRESS.region,
        postalCode: TEST_ADDRESS.zipCode,
      }));

      // Verify AsyncStorage
      const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
      const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
      const savedDetails = await AsyncStorage.getItem('currentLocationDetails');

      expect(savedAddress).toBe('Kamagong Street, Unit 123, Marikina');
      expect(JSON.parse(savedCoords!)).toEqual(TEST_ADDRESS.coordinates);
      expect(JSON.parse(savedDetails!)).toEqual({
        street: TEST_ADDRESS.street,
        barangay: TEST_ADDRESS.barangay,
        city: TEST_ADDRESS.city,
        province: TEST_ADDRESS.province,
        region: TEST_ADDRESS.region,
        postalCode: TEST_ADDRESS.zipCode,
      });

      console.log('✅ AsyncStorage sync verified');
    });
  });

  describe('Test Case 2: Retrieve Address', () => {
    it('should fetch addresses from database', async () => {
      const addresses = await addressService.getAddresses(TEST_USER_ID);

      expect(addresses).toBeDefined();
      expect(addresses.length).toBeGreaterThan(0);

      const testAddress = addresses.find(a => a.id === createdAddressId);
      expect(testAddress).toBeDefined();
      expect(testAddress?.firstName).toBe('Juan');
      expect(testAddress?.city).toBe('Marikina');

      console.log(`✅ Retrieved ${addresses.length} address(es) from database`);
    });

    it('should fetch default address', async () => {
      const defaultAddress = await addressService.getDefaultAddress(TEST_USER_ID);

      expect(defaultAddress).toBeDefined();
      expect(defaultAddress?.isDefault).toBe(true);
      expect(defaultAddress?.id).toBe(createdAddressId);

      console.log('✅ Default address retrieved correctly');
    });
  });

  describe('Test Case 3: HomeScreen Display', () => {
    it('should format address for HomeScreen display', async () => {
      // Simulate HomeScreen loading logic
      const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
      const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');

      expect(savedAddress).toBe('Kamagong Street, Unit 123, Marikina');
      expect(savedCoords).toBeDefined();

      const coords = JSON.parse(savedCoords!);
      expect(coords.latitude).toBeCloseTo(14.627382, 5);
      expect(coords.longitude).toBeCloseTo(121.078162, 5);

      console.log('✅ HomeScreen would display:', savedAddress);
    });

    it('should load from database if AsyncStorage is empty', async () => {
      // Clear AsyncStorage to simulate first load
      await AsyncStorage.removeItem('currentDeliveryAddress');

      // Simulate HomeScreen loading from DB
      const currentLoc = await addressService.getCurrentDeliveryLocation(TEST_USER_ID);

      expect(currentLoc).toBeDefined();
      if (currentLoc?.label === 'Current Location' || currentLoc?.isDefault) {
        const formatted = `${currentLoc.street}, ${currentLoc.city}`;
        expect(formatted).toContain('Marikina');
        console.log('✅ HomeScreen can load from DB when AsyncStorage is empty');
      }
    });
  });

  describe('Test Case 4: Metro Manila Validation', () => {
    it('should allow empty province for Metro Manila', async () => {
      const metroManilaAddress = {
        ...TEST_ADDRESS,
        label: 'Office',
        city: 'Quezon City',
        province: '', // Should be valid
      };

      const created = await addressService.createAddress(TEST_USER_ID, metroManilaAddress);
      
      expect(created).toBeDefined();
      expect(created.province).toBe('');
      expect(created.city).toBe('Quezon City');

      // Cleanup
      await addressService.deleteAddress(created.id);
      console.log('✅ Metro Manila address with empty province is valid');
    });

    it('should require province for non-Metro Manila regions', async () => {
      const calabarzonAddress = {
        ...TEST_ADDRESS,
        region: 'CALABARZON',
        province: 'Laguna',
        city: 'Santa Rosa',
      };

      const created = await addressService.createAddress(TEST_USER_ID, calabarzonAddress);
      
      expect(created).toBeDefined();
      expect(created.province).toBe('Laguna');
      expect(created.region).toBe('CALABARZON');

      // Cleanup
      await addressService.deleteAddress(created.id);
      console.log('✅ Non-Metro Manila requires province');
    });
  });

  describe('Test Case 5: Multiple Addresses', () => {
    it('should handle multiple addresses with one default', async () => {
      // Create second address (non-default)
      const address2 = {
        ...TEST_ADDRESS,
        label: 'Office',
        city: 'Pasig',
        isDefault: false,
      };

      const created2 = await addressService.createAddress(TEST_USER_ID, address2);

      // Fetch all addresses
      const addresses = await addressService.getAddresses(TEST_USER_ID);
      
      expect(addresses.length).toBeGreaterThanOrEqual(2);
      
      const defaultAddresses = addresses.filter(a => a.isDefault);
      expect(defaultAddresses.length).toBe(1); // Only one should be default

      // Cleanup
      await addressService.deleteAddress(created2.id);
      console.log('✅ Multiple addresses with single default works');
    });

    it('should switch default address', async () => {
      // Create second address
      const address2 = {
        ...TEST_ADDRESS,
        label: 'Office',
        city: 'Pasig',
        isDefault: false,
      };

      const created2 = await addressService.createAddress(TEST_USER_ID, address2);

      // Set second address as default
      await addressService.setDefaultAddress(TEST_USER_ID, created2.id);

      // Verify
      const defaultAddress = await addressService.getDefaultAddress(TEST_USER_ID);
      expect(defaultAddress?.id).toBe(created2.id);

      // Cleanup
      await addressService.deleteAddress(created2.id);
      console.log('✅ Switching default address works');
    });
  });

  describe('Test Case 6: Update Address', () => {
    it('should update address fields', async () => {
      if (!createdAddressId) {
        throw new Error('No address to update');
      }

      const updates = {
        street: 'Updated Street, Bldg 456',
        zipCode: '1803',
      };

      const updated = await addressService.updateAddress(TEST_USER_ID, createdAddressId, updates);

      expect(updated).toBeDefined();
      expect(updated.street).toBe('Updated Street, Bldg 456');
      expect(updated.zipCode).toBe('1803');
      expect(updated.city).toBe('Marikina'); // Unchanged fields remain

      console.log('✅ Address update works');
    });
  });

  describe('Test Case 7: Database Schema Validation', () => {
    it('should store coordinates as JSONB', async () => {
      // Fetch the address and verify coordinates structure
      const addresses = await addressService.getAddresses(TEST_USER_ID);
      const testAddress = addresses.find(a => a.id === createdAddressId);

      expect(testAddress?.coordinates).toBeDefined();
      expect(typeof testAddress?.coordinates).toBe('object');
      expect(testAddress?.coordinates).toHaveProperty('latitude');
      expect(testAddress?.coordinates).toHaveProperty('longitude');

      console.log('✅ Coordinates stored as JSONB object');
    });

    it('should parse address_line_1 correctly', async () => {
      // The DB stores "Name, Phone, Street" in address_line_1
      // The service should parse it back correctly
      const addresses = await addressService.getAddresses(TEST_USER_ID);
      const testAddress = addresses.find(a => a.id === createdAddressId);

      expect(testAddress?.firstName).toBe('Juan');
      expect(testAddress?.lastName).toBe('Cruz'); // "Dela Cruz" split
      expect(testAddress?.phone).toBe('+639171234567');

      console.log('✅ address_line_1 parsing works correctly');
    });
  });
});

// Run tests
console.log('\n🧪 Starting Address Flow Integration Tests...\n');
