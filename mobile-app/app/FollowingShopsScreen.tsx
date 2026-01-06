import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Store, MapPin, Star, Users } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowingShops'>;

interface Shop {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  followers: number;
  productCount: number;
}

export default function FollowingShopsScreen({ navigation }: Props) {
  const followingShops: Shop[] = [
    {
      id: '1',
      name: "Maria's Fresh Produce",
      location: 'Quezon City, Metro Manila',
      image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9',
      rating: 4.8,
      followers: 1234,
      productCount: 45,
    },
    {
      id: '2',
      name: 'Traditional Crafts PH',
      location: 'Vigan, Ilocos Sur',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5',
      rating: 4.9,
      followers: 2567,
      productCount: 78,
    },
    {
      id: '3',
      name: 'Benguet Coffee Co.',
      location: 'Baguio City',
      image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e',
      rating: 4.7,
      followers: 3456,
      productCount: 23,
    },
    {
      id: '4',
      name: 'Davao Fruit Paradise',
      location: 'Davao City',
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf',
      rating: 4.9,
      followers: 4321,
      productCount: 56,
    },
  ];

  const handleUnfollow = (shopId: string) => {
    console.log('Unfollow shop:', shopId);
  };

  const handleVisitShop = (shopId: string) => {
    console.log('Visit shop:', shopId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Following Shops</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {followingShops.length === 0 ? (
          <View style={styles.emptyState}>
            <Store size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Shops Yet</Text>
            <Text style={styles.emptyText}>
              Start following your favorite shops to see them here
            </Text>
          </View>
        ) : (
          followingShops.map((shop) => (
            <View key={shop.id} style={styles.shopCard}>
              <Image source={{ uri: shop.image }} style={styles.shopImage} />
              <View style={styles.shopInfo}>
                <View style={styles.shopHeader}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <View style={styles.ratingBadge}>
                    <Star size={14} color="#FBBF24" fill="#FBBF24" />
                    <Text style={styles.ratingText}>{shop.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.locationRow}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.locationText}>{shop.location}</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Users size={14} color="#6B7280" />
                    <Text style={styles.statText}>{shop.followers} followers</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Store size={14} color="#6B7280" />
                    <Text style={styles.statText}>{shop.productCount} products</Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.visitButton,
                      pressed && styles.visitButtonPressed,
                    ]}
                    onPress={() => handleVisitShop(shop.id)}
                  >
                    <Text style={styles.visitButtonText}>Visit Shop</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.unfollowButton,
                      pressed && styles.unfollowButtonPressed,
                    ]}
                    onPress={() => handleUnfollow(shop.id)}
                  >
                    <Text style={styles.unfollowButtonText}>Unfollow</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shopImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  shopInfo: {
    padding: 16,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6A00',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  visitButton: {
    flex: 1,
    backgroundColor: '#FF6A00',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  visitButtonPressed: {
    backgroundColor: '#E55F00',
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unfollowButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  unfollowButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
