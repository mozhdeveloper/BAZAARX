import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Scan,
  TrendingUp,
  AlertCircle,
  Package,
  Star,
  Hash,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import SellerDrawer from '../../src/components/SellerDrawer';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  maxStock: number;
}

export default function POSScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { products, addOfflineOrder } = useSellerStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'low-stock' | 'best-sellers'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.id.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    if (filterTab === 'low-stock') {
      filtered = filtered.filter((product) => product.stock > 0 && product.stock < 10);
    } else if (filterTab === 'best-sellers') {
      filtered = filtered.filter((product) => product.stock > 0 && product.sold > 50);
    }

    return filtered.filter((product) => product.isActive);
  }, [products, searchQuery, filterTab]);

  // Cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Add to cart
  const addToCart = (product: typeof products[0]) => {
    if (product.stock <= 0) return;

    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Stock Limit', `Only ${product.stock} units available`);
        return;
      }

      setCart(
        cart.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          image: product.image,
          maxStock: product.stock,
        },
      ]);
    }
  };

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0 || newQuantity > item.maxStock) return item;
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setNote('');
  };

  // Complete sale
  const completeSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before completing sale');
      return;
    }

    setIsProcessing(true);

    try {
      // Create offline order
      const orderId = addOfflineOrder(cart, cartTotal, note);

      // Show success
      setSuccessOrderId(orderId);
      setShowSuccess(true);

      // Clear cart after 2 seconds
      setTimeout(() => {
        clearCart();
      }, 2000);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <CreditCard size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>POS Lite</Text>
              <Text style={styles.headerSubtitle}>Quick checkout for offline sales</Text>
            </View>
          </View>
          {cart.length > 0 && (
            <View style={styles.cartBadgeHeader}>
              <ShoppingCart size={20} color="#FFF" />
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cart.length}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Search Bar in Header */}
        <View style={styles.searchBar}>
          <Scan size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or Scan product..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Scroll Container */}
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
      >
        {/* Products Section */}
        <View style={styles.productsSection}>
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
              onPress={() => setFilterTab('all')}
            >
              <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                All Items
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'low-stock' && styles.filterTabActive]}
              onPress={() => setFilterTab('low-stock')}
            >
              <AlertCircle size={14} color={filterTab === 'low-stock' ? '#FFF' : '#6B7280'} />
              <Text
                style={[styles.filterTabText, filterTab === 'low-stock' && styles.filterTabTextActive]}
              >
                Low Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'best-sellers' && styles.filterTabActive]}
              onPress={() => setFilterTab('best-sellers')}
            >
              <TrendingUp size={14} color={filterTab === 'best-sellers' ? '#FFF' : '#6B7280'} />
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'best-sellers' && styles.filterTabTextActive,
                ]}
              >
                Best Sellers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGridContainer}>
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock === 0;
              const cartItem = cart.find((item) => item.productId === product.id);
              const remainingStock = product.stock - (cartItem?.quantity || 0);

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
                  onPress={() => !isOutOfStock && addToCart(product)}
                  disabled={isOutOfStock}
                  activeOpacity={0.7}
                >
                  {/* Product Image */}
                  <View style={styles.productImageContainer}>
                    <Image source={{ uri: product.image }} style={styles.productImage} />

                    {/* Stock Badge */}
                    <View
                      style={[
                        styles.stockBadge,
                        remainingStock === 0
                          ? styles.stockBadgeOut
                          : remainingStock < 10
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                      ]}
                    >
                      <Text style={styles.stockBadgeText}>
                        {remainingStock === 0 ? 'Out' : remainingStock}
                      </Text>
                    </View>

                    {/* Cart Quantity Badge */}
                    {cartItem && (
                      <View style={styles.cartQuantityBadge}>
                        <Text style={styles.cartQuantityText}>×{cartItem.quantity}</Text>
                      </View>
                    )}
                  </View>

                  {/* Product Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productCategory}>{product.category}</Text>

                    {/* Product Details */}
                    <View style={styles.productDetails}>
                      <View style={styles.productDetailRow}>
                        <Hash size={12} color="#9CA3AF" />
                        <Text style={styles.productDetailText}>
                          {product.id.slice(-8)}
                        </Text>
                      </View>
                      <View style={styles.productDetailRow}>
                        <Package size={12} color={remainingStock < 10 ? '#F59E0B' : '#10B981'} />
                        <Text
                          style={[
                            styles.productDetailText,
                            { color: remainingStock < 10 ? '#F59E0B' : '#10B981' },
                          ]}
                        >
                          {remainingStock}
                        </Text>
                      </View>
                    </View>

                    {/* Price & Add Button */}
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>₱{product.price.toLocaleString()}</Text>
                      {!isOutOfStock && (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => addToCart(product)}
                        >
                          <Plus size={14} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            {filteredProducts.length === 0 && (
              <View style={styles.emptyState}>
                <Search size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No products found</Text>
                <Text style={styles.emptyStateText}>Try a different search or filter</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cart Section */}
        <View style={styles.cartSection}>
          {/* Cart Header */}
          <View style={styles.cartHeader}>
            <View style={styles.cartHeaderLeft}>
              <ShoppingCart size={20} color="#FF5722" />
              <Text style={styles.cartTitle}>Current Sale</Text>
              {cart.length > 0 && (
                <View style={styles.cartItemCount}>
                  <Text style={styles.cartItemCountText}>{cart.length}</Text>
                </View>
              )}
            </View>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items */}
          <View style={styles.cartContent}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <View style={styles.emptyCartIcon}>
                  <ShoppingCart size={40} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyCartTitle}>Cart is empty</Text>
                <Text style={styles.emptyCartText}>Click products to add</Text>
              </View>
            ) : (
              <View style={styles.cartItems}>
                {cart.map((item) => (
                  <View key={item.productId} style={styles.cartItem}>
                    <Image source={{ uri: item.image }} style={styles.cartItemImage} />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.cartItemPrice}>₱{item.price.toLocaleString()} each</Text>

                      {/* Quantity Controls */}
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.productId, -1)}
                        >
                          <Minus size={14} color="#6B7280" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.productId, 1)}
                          disabled={item.quantity >= item.maxStock}
                        >
                          <Plus size={14} color="#6B7280" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeFromCart(item.productId)}
                        >
                          <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.cartItemTotal}>
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <View style={styles.cartFooter}>
              {/* Note Input */}
              <TextInput
                style={styles.noteInput}
                placeholder="Add note (optional)..."
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
              />

              {/* Totals */}
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>₱0.00</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>₱0.00</Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
              </View>

              {/* Charge Button */}
              <TouchableOpacity
                style={[styles.chargeButton, isProcessing && styles.chargeButtonDisabled]}
                onPress={completeSale}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Text style={styles.chargeButtonText}>Processing...</Text>
                ) : (
                  <>
                    <CreditCard size={20} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.chargeButtonText}>Charge ₱{cartTotal.toLocaleString()}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIcon}>
                <CheckCircle size={32} color="#10B981" strokeWidth={2} />
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowSuccess(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Sale Completed!</Text>
            <Text style={styles.modalSubtitle}>Inventory has been updated successfully</Text>

            <View style={styles.orderDetails}>
              <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Order ID:</Text>
                <Text style={styles.orderDetailValue}>{successOrderId.slice(0, 20)}...</Text>
              </View>
              <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Total Amount:</Text>
                <Text style={styles.orderDetailValueAmount}>₱{cartTotal.toLocaleString()}</Text>
              </View>
              <View style={styles.orderDetailRow}>
                <Text style={styles.orderDetailLabel}>Status:</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>Paid & Completed</Text>
                </View>
              </View>
            </View>

            <Text style={styles.modalNote}>
              This transaction is now visible in your Orders page.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.viewOrdersButton}
                onPress={() => {
                  setShowSuccess(false);
                  navigation.navigate('SellerTabs');
                }}
              >
                <Text style={styles.viewOrdersButtonText}>View Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderBottomLeftRadius: 20, 
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  cartBadgeHeader: {
    position: 'relative',
    marginLeft: 12,
  },
  cartCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  mainScrollContent: {
    paddingBottom: 20,
  },
  productsSection: {
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#FF5722',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  productsGridContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productImageContainer: {
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  stockBadgeLow: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  stockBadgeOk: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cartQuantityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF5722',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartQuantityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    minHeight: 36,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 10,
    color: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  addButton: {
    backgroundColor: '#FF5722',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cartSection: {
    backgroundColor: '#FFF',
    marginTop: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartItemCount: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartItemCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  clearButton: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  cartContent: {
    maxHeight: 400,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCartTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  emptyCartText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cartItems: {
    padding: 16,
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    width: 32,
    textAlign: 'center',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  noteInput: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
  },
  totals: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    marginTop: 12,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  chargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5722',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chargeButtonDisabled: {
    opacity: 0.6,
  },
  chargeButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    flex: 1,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  orderDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  orderDetailValueAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  paidBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  modalNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewOrdersButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOrdersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});
