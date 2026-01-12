import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
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

  // Mock Data matching web
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'scheduled':
        return '#3B82F6';
      case 'ended':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#D1FAE5';
      case 'scheduled':
        return '#DBEAFE';
      case 'ended':
        return '#F3F4F6';
      default:
        return '#F3F4F6';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Flash Sales</Text>
            <Text style={styles.headerSubtitle}>Manage sale campaigns</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Join Campaign Button */}
        <View style={styles.topActions}>
          <Pressable style={styles.joinButton}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.joinButtonText}>Join Campaign</Text>
          </Pressable>
        </View>

        {/* Flash Sales List */}
        <View style={styles.salesList}>
          {flashSales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              {/* Sale Header */}
              <View style={styles.saleHeader}>
                <View style={styles.saleHeaderLeft}>
                  <View style={styles.iconContainer}>
                    <Zap size={20} color="#FF5722" strokeWidth={2.5} fill="#FF5722" />
                  </View>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleName}>{sale.name}</Text>
                    <View style={styles.dateContainer}>
                      <Calendar size={12} color="#6B7280" strokeWidth={2} />
                      <Text style={styles.dateText}>
                        {formatDate(sale.startDate)} - {formatDate(sale.endDate)}
                      </Text>
                    </View>
                    <View style={styles.dateContainer}>
                      <Clock size={12} color="#6B7280" strokeWidth={2} />
                      <Text style={styles.dateText}>
                        {sale.status === 'active' ? 'Ends in 2 days' : 'Starts in 5 days'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBgColor(sale.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(sale.status) },
                    ]}
                  >
                    {sale.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Products Section */}
              <View style={styles.productsSection}>
                <Text style={styles.productsLabel}>Participating Products</Text>
                
                {sale.products.length > 0 ? (
                  <View style={styles.productsList}>
                    {sale.products.map((product) => (
                      <View key={product.id} style={styles.productCard}>
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                        />
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <View style={styles.priceContainer}>
                            <Text style={styles.flashPrice}>
                              ₱{product.flashPrice.toLocaleString()}
                            </Text>
                            <Text style={styles.originalPrice}>
                              ₱{product.originalPrice.toLocaleString()}
                            </Text>
                          </View>
                          <Text style={styles.stockInfo}>
                            {product.sold} / {product.stock} sold
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyProducts}>
                    <Text style={styles.emptyText}>No products added yet</Text>
                    <Pressable style={styles.addButton}>
                      <Text style={styles.addButtonText}>Add Products</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <Pressable style={styles.editButton}>
                  <Edit size={16} color="#6B7280" strokeWidth={2.5} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.deleteButton}>
                  <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.deleteButtonText}>Withdraw</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  topActions: {
    padding: 20,
  },
  joinButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  salesList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 16,
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleInfo: {
    flex: 1,
    gap: 4,
  },
  saleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  productsSection: {
    marginBottom: 16,
  },
  productsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    gap: 12,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF5722',
  },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  stockInfo: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
