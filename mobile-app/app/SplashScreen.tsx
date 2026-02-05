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
        // Validate the actual Supabase session
        const { data, error } = await supabase.auth.getSession();

        if (error || (!data.session && isAuthenticated)) {
          // Invalid session or mismatch
          console.log('Session refresh failed or expired', error);
          logout();
          navigation.replace('Login');
          return;
        }

        // Proceed based on store (which should be in sync now or valid)
        if (isAuthenticated) {
          navigation.replace('MainTabs', { screen: 'Home' });
        } else if (hasCompletedOnboarding) {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      } catch (e) {
        console.error('Splash checks failed', e);
        logout();
        navigation.replace('Login');
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
