/**
 * Jest Setup File for Mobile App Tests
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Global test timeout
jest.setTimeout(30000);

// Suppress console warnings during tests (optional)
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('deprecated') || args[0]?.includes?.('Warning')) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
