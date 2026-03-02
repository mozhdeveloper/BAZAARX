import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

import { supabase } from '../src/lib/supabase';

// ...

export default function SplashScreen({ navigation }: Props) {
  const { isAuthenticated, hasCompletedOnboarding, logout } = useAuthStore();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const checkSession = async () => {
      // Wait a minimum time for the animation
      await new Promise(resolve => setTimeout(resolve, 2500));

      try {
        // Race checkSession against an 8-second timeout so Expo Go never hangs
        await Promise.race([
          useAuthStore.getState().checkSession(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('checkSession timed out')), 8_000)
          ),
        ]);

        // Get fresh state after checkSession finishes (it updates the store internally)
        const { isAuthenticated: isAuth, hasCompletedOnboarding: hasOnboarding } = useAuthStore.getState();

        if (isAuth) {
          navigation.replace('MainTabs', { screen: 'Home' });
        } else if (hasOnboarding) {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (e: any) {
        const isTimeout = e?.message?.includes('timed out') || e?.name === 'AbortError';
        console.error(isTimeout ? 'Splash: network timeout, proceeding offline' : 'Splash checks failed', e);
        // On timeout or any failure: navigate based on locally cached auth state
        const { isAuthenticated: isAuth, hasCompletedOnboarding: hasOnboarding } = useAuthStore.getState();
        if (isAuth) {
          navigation.replace('MainTabs', { screen: 'Home' });
        } else if (hasOnboarding) {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      }
    };

    checkSession();
  }, [isAuthenticated, hasCompletedOnboarding]);

  return (
    <LinearGradient
      colors={['#FF6A00', '#FF8C42', '#FFB347']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <ShoppingBag size={64} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName}>BazaarX</Text>
        <Text style={styles.tagline}>Shop Local, Live Better</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
          <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginTop: 48,
    gap: 8,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    opacity: 0.3,
  },
  loadingDotDelay1: {
    opacity: 0.6,
  },
  loadingDotDelay2: {
    opacity: 1,
  },
});
