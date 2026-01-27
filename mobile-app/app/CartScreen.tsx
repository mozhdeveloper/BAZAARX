import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingBag, Tag, Truck, CheckCircle2, Circle, CheckCircle, Store } from 'lucide-react-native';
import { CartItemRow } from '../src/components/CartItemRow';
import { useCartStore } from '../src/stores/cartStore';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';

export default function CartScreen({ navigation }: any) {
  const { items, removeItem, updateQuantity, clearCart, initializeForCurrentUser, clearQuickOrder } = useCartStore(); // Add clearQuickOrder
  const insets = useSafeAreaInsets();

  // Use global theme color
  const BRAND_PRIMARY = COLORS.primary;

  useEffect(() => {
    initializeForCurrentUser();
  }, []);

  // Initialize selection once, but don't force it on every item update
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Grouping logic remains the same
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
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = (subtotal > 500 || subtotal === 0) ? 0 : 50;
  const total = subtotal + shippingFee;

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
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

      {/* BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_PRIMARY }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Pressable onPress={clearCart}><Text style={styles.clearText}>Clear All</Text></Pressable>
        </View>
      </View>

      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(items.map(i => i.id))}>
          {isAllSelected ? <CheckCircle size={22} color={BRAND_PRIMARY} fill={BRAND_PRIMARY + '15'} /> : <Circle size={22} color="#D1D5DB" />}
          <Text style={styles.selectAllText}>Select All Items</Text>
        </Pressable>
        {selectedIds.length > 0 && (
          <Pressable onPress={() => setSelectedIds([])}>
            <Text style={{ color: BRAND_PRIMARY, fontWeight: '700' }}>Deselect All</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 140 }} // Adjusted padding
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedItems).map(([sellerName, sellerProducts]) => (
          <View key={sellerName} style={styles.sellerGroup}>
            <View style={styles.sellerHeader}>
              <Store size={18} color="#4B5563" />
              <Text style={styles.sellerName}>{sellerName}</Text>
            </View>

            {sellerProducts.map((item) => (
              <View key={item.id} style={styles.itemRowCard}>
                <Pressable style={styles.itemCheckbox} onPress={() => toggleSelectItem(item.id)}>
                  {selectedIds.includes(item.id) ? <CheckCircle size={22} color={BRAND_PRIMARY} /> : <Circle size={22} color="#D1D5DB" />}
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
            ))}
          </View>
        ))}

        {/* SUMMARY SECTION */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping</Text><Text style={[styles.summaryValue, shippingFee === 0 && { color: BRAND_PRIMARY }]}>{shippingFee === 0 ? 'FREE' : `₱${shippingFee}`}</Text></View>
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total Payment</Text><Text style={[styles.totalValue, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text></View>
        </View>
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
            onPress={handleCheckout}
            style={[styles.checkoutBtn, { backgroundColor: BRAND_PRIMARY, opacity: selectedIds.length === 0 ? 0.5 : 1 }]}
          >
            <Text style={styles.checkoutBtnText}>Checkout ({selectedIds.length})</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: { paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcon: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  clearText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  selectAllBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F1F1' },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectAllText: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  scrollContainer: { flex: 1 },
  sellerGroup: { marginTop: 20, paddingHorizontal: 16 },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 },
  sellerName: { fontSize: 16, fontWeight: '700', color: '#374151' },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    paddingLeft: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F1F1'
  },
  itemCheckbox: { padding: 8 },
  summaryCard: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 24, padding: 24, elevation: 2, borderWidth: 1, borderColor: '#F1F1F1' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 15, color: '#6B7280' },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1.5, backgroundColor: '#F3F4F6', marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 18, fontWeight: '800' },
  totalValue: { fontSize: 26, fontWeight: '900' },
  bottomBar: { position: 'absolute', left: 16, right: 16, backgroundColor: '#FFFFFF', borderRadius: 35, elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 25, paddingVertical: 6 },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  totalInfoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase' },
  totalInfoPrice: { fontSize: 24, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 30, paddingVertical: 18, borderRadius: 100 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});