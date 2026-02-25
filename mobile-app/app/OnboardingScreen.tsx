import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingBag, Store, Truck, Shield } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Discover Local Products',
    description: 'Browse thousands of authentic Filipino products from trusted local sellers nationwide',
    icon: ShoppingBag,
    color: '#FF6A00',
  },
  {
    id: '2',
    title: 'Support Filipino Sellers',
    description: 'Connect directly with local businesses and help grow the Philippine economy',
    icon: Store,
    color: '#FF8C42',
  },
  {
    id: '3',
    title: 'Fast & Secure Delivery',
    description: 'Get your orders delivered quickly with secure payment and reliable tracking',
    icon: Truck,
    color: '#FF6A00',
  },
  {
    id: '4',
    title: 'Shop with Confidence',
    description: 'Verified sellers, buyer protection, and 24/7 customer support for peace of mind',
    icon: Shield,
    color: '#FF8C42',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    navigation.replace('Login');
  };

  const handleGetStarted = () => {
    completeOnboarding();
    navigation.replace('Login');
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[item.color, `${item.color}CC`]}
            style={styles.iconGradient}
          >
            <Icon size={80} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        {currentIndex === slides.length - 1 ? (
          <Pressable style={styles.getStartedButton} onPress={handleGetStarted}>
            <LinearGradient
              colors={['#FF6A00', '#FF8C42']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FF6A00',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  getStartedButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#FF6A00',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
