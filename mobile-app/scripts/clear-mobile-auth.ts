/**
 * Quick Fix: Clear Auth Storage in Mobile App
 * 
 * Run this if you see "Invalid Refresh Token" errors in development
 * 
 * Usage:
 * 1. Open the mobile app
 * 2. Shake your device (or press Cmd+D on iOS / Cmd+M on Android)
 * 3. In the dev menu, go to "Debug" > "Open React Native Debugger"
 * 4. In the console, paste this code:
 * 
 * Or run: npx tsx scripts/clear-mobile-auth.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAuthStorage() {
  try {
    console.log('🧹 Clearing authentication storage...');
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log(`Found ${keys.length} storage keys`);
    
    // Find auth-related keys
    const authKeys = keys.filter(key => 
      key.includes('auth') || 
      key.includes('supabase') ||
      key.includes('token') ||
      key.includes('session')
    );
    
    console.log('Auth-related keys to clear:', authKeys);
    
    // Clear auth keys
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log('✅ Cleared', authKeys.length, 'auth keys');
    } else {
      console.log('ℹ️  No auth keys found to clear');
    }
    
    // Specifically clear known Supabase keys
    const knownKeys = [
      'supabase.auth.token',
      'sb-mdawdegxofjsjrvygqbh-auth-token', // Your specific project
    ];
    
    for (const key of knownKeys) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`✅ Cleared: ${key}`);
      } catch (error) {
        console.log(`⚠️  Key not found: ${key}`);
      }
    }
    
    console.log('\n✅ Auth storage cleared successfully!');
    console.log('📱 Please restart the mobile app or refresh to see changes.');
    console.log('🔑 You may need to log in again.\n');
    
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
  }
}

// For direct execution
clearAuthStorage();

export default clearAuthStorage;
