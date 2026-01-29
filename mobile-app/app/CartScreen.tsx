import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Circle, Store, Flame } from 'lucide-react-native';
import { CartItemRow } from '../src/components/CartItemRow';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function CartScreen({ navigation }: any) {
  const { items, removeItem, updateQuantity, clearCart, initializeForCurrentUser, clearQuickOrder } = useCartStore(); // Add clearQuickOrder
  const insets = useSafeAreaInsets();

  // Use global theme color
  const BRAND_PRIMARY = COLORS.primary;

  useEffect(() => {
    initializeForCurrentUser();
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const groupedItems = useMemo(() => {
    const sortedItems = [...items].reverse();
    return sortedItems.reduce((groups, item) => {
      const seller = item.seller || 'Verified Seller';
      if (!groups[seller]) groups[seller] = [];
      groups[seller].push(item);
      return groups;
    }, {} as Record<string, typeof items>);
  }, [items]);

  const selectedItems = items.filter(item => selectedIds.includes(item.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const totalSavings = selectedItems.reduce((sum, item) => {
    const savings = (item.originalPrice && item.originalPrice > (item.price || 0)) 
      ? (item.originalPrice - (item.price || 0)) * item.quantity 
      : 0;
    return sum + savings;
  }, 0);
  const shippingFee = (subtotal > 500 || subtotal === 0) ? 0 : 50;
  const total = subtotal + shippingFee;

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSellerGroup = (sellerProducts: typeof items) => {
    const sellerItemIds = sellerProducts.map(item => item.id);
    const isSellerFullySelected = sellerItemIds.every(id => selectedIds.includes(id));

    if (isSellerFullySelected) {
      setSelectedIds(prev => prev.filter(id => !sellerItemIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const newIds = sellerItemIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  const handleCheckout = () => {
    if (selectedIds.length === 0) return;
    
    // Clear any previous quick order to ensure we checkout strictly from cart selections
    clearQuickOrder();
    
    // In a real app, we might pass selectedIds to checkout, 
    // but for now we assume Checkout takes all "items" or we need to implement partial checkout in store.
    // The current CheckoutScreen logic takes `items` (all cart items) if quickOrder is null.
    // To support selecting specific items, we would need to filter `items` in the store or pass them.
    // For this demo, let's assume we checkout ALL items if we select checkout, 
    // OR we can pass a param. 
    // However, existing `CheckoutScreen` logic is simple. 
    // Let's navigate to Checkout. 
    navigation.navigate('Checkout');
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_PRIMARY }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Pressable onPress={clearCart}><Text style={styles.clearText}>Clear All</Text></Pressable>
        </View>
      </View>

      {/* SELECT ALL BAR */}
      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(items.map(i => i.id))}>
          {isAllSelected ? <CheckCircle size={22} color={BRAND_PRIMARY} fill={BRAND_PRIMARY + '15'} /> : <Circle size={22} color="#D1D5DB" />}
          <Text style={styles.selectAllText}>Select All Items</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 200 }} // Increased padding to ensure visibility
        showsVerticalScrollIndicator={false}
      >
        {/* SELLER GROUPS */}
        {Object.entries(groupedItems).map(([sellerName, sellerProducts]) => {
          const isSellerSelected = sellerProducts.every(item => selectedIds.includes(item.id));

          return (
            <View key={sellerName} style={styles.sellerCard}>
              {/* STORE HEADER */}
              <View style={styles.sellerHeader}>
                <Pressable onPress={() => toggleSellerGroup(sellerProducts)} style={styles.headerCheckbox}>
                  {isSellerSelected ? (
                    <CheckCircle size={20} color={BRAND_PRIMARY} fill={BRAND_PRIMARY + '15'} />
                  ) : (
                    <Circle size={20} color="#D1D5DB" />
                  )}
                </Pressable>
                <View style={styles.storeInfo}>
                  <Store size={16} color="#4B5563" />
                  <Text style={styles.sellerName}>{sellerName}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* PRODUCTS LIST */}
              {sellerProducts.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.itemRow}>
                    <Pressable style={styles.itemCheckbox} onPress={() => toggleSelectItem(item.id)}>
                      {selectedIds.includes(item.id) ? (
                        <CheckCircle size={20} color={BRAND_PRIMARY} />
                      ) : (
                        <Circle size={20} color="#D1D5DB" />
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <CartItemRow
                        item={item}
                        onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                        onDecrement={() => item.quantity > 1 && updateQuantity(item.id, item.quantity - 1)}
                        onRemove={() => removeItem(item.id)}
                      />
                    </View>
                  </View>
                  {/* Add divider if not the last item */}
                  {index < sellerProducts.length - 1 && <View style={styles.itemSeparator} />}
                </View>
              ))}
            </View>
          );
        })}

        {/* ORDER SUMMARY CARD */}
        {items.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {totalSavings > 0 && (
              <View style={styles.savingsBanner}>
                <View style={styles.savingsIconContainer}>
                  <Flame size={14} color="#FFF" fill="#FFF" />
                </View>
                <Text style={styles.savingsBannerText}>
                  You're saving <Text style={{ fontWeight: '800' }}>₱{totalSavings.toLocaleString()}</Text> on this order!
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.dashedDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payment</Text>
              <Text style={[styles.totalValue, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BAR */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 55 }]}>
        <View style={styles.bottomBarContent}>
          <View>
            <Text style={styles.totalInfoLabel}>Grand Total</Text>
            <Text style={[styles.totalInfoPrice, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text>
          </View>
          <Pressable
            disabled={selectedIds.length === 0}
            onPress={async () => {
              // Clear any previous quick order to prioritize cart selection
              clearQuickOrder();

              // Get delivery address from AsyncStorage
              try {
                const deliveryAddress = await AsyncStorage.getItem('currentDeliveryAddress');
                const coordsStr = await AsyncStorage.getItem('currentDeliveryCoordinates');
                const deliveryCoordinates = coordsStr ? JSON.parse(coordsStr) : null;

                navigation.navigate('Checkout', {
                  selectedItems,
                  deliveryAddress,
                  deliveryCoordinates
                });
              } catch (error) {
                console.error('Error reading delivery address:', error);
                navigation.navigate('Checkout', { selectedItems });
              }
            }}
            style={[styles.checkoutBtn, { backgroundColor: BRAND_PRIMARY, opacity: selectedIds.length === 0 ? 0.5 : 1 }]}>
            <Text style={styles.checkoutBtnText}>Checkout ({selectedIds.length})</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' }, // Slightly darker bg for contrast
  headerContainer: { paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcon: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  clearText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },

  selectAllBar: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20, // Overlap header slightly
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 8,
  },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectAllText: { fontSize: 15, fontWeight: '700', color: '#374151' },

  scrollContainer: { flex: 1, paddingTop: 8 },

  // NEW CARD STYLE FOR SELLER GROUP
  sellerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerCheckbox: { marginRight: 10 },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 4 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  itemCheckbox: { padding: 8 },
  itemSeparator: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 50, marginVertical: 4 }, // Indented divider

  // SUMMARY CARD
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  savingsIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  savingsBannerText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
    flex: 1,
  },
  dashedDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#D1D5DB' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  totalValue: { fontSize: 22, fontWeight: '900' },

  // BOTTOM BAR
  bottomBar: { position: 'absolute', left: 16, right: 16, backgroundColor: '#FFFFFF', borderRadius: 35, elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 25, paddingVertical: 6 },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  totalInfoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' },
  totalInfoPrice: { fontSize: 24, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 30, paddingVertical: 16, borderRadius: 100 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});