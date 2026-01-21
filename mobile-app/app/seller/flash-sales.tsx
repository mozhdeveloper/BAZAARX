import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { ArrowLeft, Zap, Plus, Calendar, Clock, Edit, Trash2 } from 'lucide-react-native';

interface FlashSaleProduct {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  stock: number;
  sold: number;
}

interface FlashSale {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'active' | 'ended';
  products: FlashSaleProduct[];
}

export default function FlashSalesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();

  const flashSales: FlashSale[] = [
    {
      id: '1',
      name: 'Weekend Special',
      startDate: new Date('2024-12-20T00:00:00'),
      endDate: new Date('2024-12-22T23:59:59'),
      status: 'active',
      products: [
        {
          id: 'p1',
          name: 'Wireless Earbuds',
          image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
          originalPrice: 2999,
          flashPrice: 1499,
          stock: 50,
          sold: 12,
        },
      ],
    },
    {
      id: '2',
      name: 'New Year Blast',
      startDate: new Date('2025-01-01T00:00:00'),
      endDate: new Date('2025-01-01T23:59:59'),
      status: 'scheduled',
      products: [],
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderProduct = (product: FlashSaleProduct) => {
    const progress = (product.sold / product.stock) * 100;
    
    return (
      <View key={product.id} style={styles.productCard}>
        <Image
          source={{ uri: product.image }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.flashPrice}>
              ₱{product.flashPrice.toLocaleString()}
            </Text>
            <Text style={styles.originalPrice}>
              ₱{product.originalPrice.toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {product.sold}/{product.stock} sold
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSaleCard = (sale: FlashSale) => {
    const isActive = sale.status === 'active';
    
    return (
      <View key={sale.id} style={styles.saleCard}>
        {/* Sale Header */}
        <View style={styles.saleHeaderContainer}>
          <View style={styles.saleHeader}>
            <View style={styles.saleHeaderLeft}>
              <View style={[
                styles.iconContainer,
                isActive ? styles.iconContainerActive : styles.iconContainerScheduled
              ]}>
                <Zap 
                  size={24} 
                  color={isActive ? '#FF5722' : '#3B82F6'} 
                  strokeWidth={2.5} 
                  fill={isActive ? '#FF5722' : '#3B82F6'}
                />
              </View>
              <View style={styles.saleInfo}>
                <Text style={styles.saleName}>{sale.name}</Text>
                <View style={styles.infoRow}>
                  <Calendar size={13} color="#9CA3AF" strokeWidth={2} />
                  <Text style={styles.infoText}>
                    {formatDate(sale.startDate)} - {formatDate(sale.endDate)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={13} color="#9CA3AF" strokeWidth={2} />
                  <Text style={[
                    styles.timeText,
                    isActive ? styles.timeTextActive : styles.timeTextScheduled
                  ]}>
                    {isActive ? 'Ends in 2 days' : 'Starts in 5 days'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              isActive ? styles.statusBadgeActive : styles.statusBadgeScheduled
            ]}>
              <Text style={[
                styles.statusText,
                isActive ? styles.statusTextActive : styles.statusTextScheduled
              ]}>
                {sale.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>Participating Products</Text>
          
          {sale.products.length > 0 ? (
            <View style={{ gap: 12 }}>
              {sale.products.map(renderProduct)}
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <View style={styles.emptyIconContainer}>
                <Plus size={28} color="#9CA3AF" strokeWidth={2.5} />
              </View>
              <Text style={styles.emptyText}>No products added yet</Text>
              <Pressable style={styles.addProductsButton}>
                <Text style={styles.addProductsButtonText}>Add Products</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Actions Footer */}
        <View style={styles.actionsFooter}>
          <Pressable style={[styles.actionButton, styles.editButton]}>
            <Edit size={16} color="#4B5563" strokeWidth={2.5} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.withdrawButton]}>
            <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Flash Sales</Text>
            <Text style={styles.headerSubtitle}>Manage sale campaigns</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Join Campaign Button */}
        <View style={styles.joinButtonContainer}>
          <Pressable style={styles.joinButton}>
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.joinButtonText}>Join Campaign</Text>
          </Pressable>
        </View>

        {/* Flash Sales List */}
        <View style={styles.salesList}>
          {flashSales.map(renderSaleCard)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  
  // Join Campaign Button
  joinButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  joinButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  
  // Sales List
  salesList: {
    paddingHorizontal: 20,
    gap: 20,
  },
  
  // Sale Card
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  
  // Sale Header
  saleHeaderContainer: {
    padding: 20,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#FFF5F0',
  },
  iconContainerScheduled: {
    backgroundColor: '#EFF6FF',
  },
  saleInfo: {
    flex: 1,
    gap: 6,
  },
  saleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeTextActive: {
    color: '#F97316',
  },
  timeTextScheduled: {
    color: '#3B82F6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeScheduled: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextScheduled: {
    color: '#3B82F6',
  },
  
  // Products Section
  productsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  
  // Product Card
  productCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flashPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5722',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  
  // Empty State
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  addProductsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addProductsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.2,
  },
  
  // Actions Footer
  actionsFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FCA5A5',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  }
});
