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
import { ArrowLeft, ShoppingBag, Tag, Truck, CheckCircle2, Circle, CheckCircle } from 'lucide-react-native';
import { CartItemRow } from '../src/components/CartItemRow';
import { useCartStore } from '../src/stores/cartStore';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Cart'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function CartScreen({ navigation }: Props) {
  const { items, removeItem, updateQuantity, getTotal, clearCart, clearQuickOrder } = useCartStore();
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = '#FF5722';

  // Clear quick order when user navigates to cart
  useEffect(() => {
    clearQuickOrder();
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>(items.map(item => item.id));

  const selectedItems = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds]);
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = subtotal > 500 || subtotal === 0 ? 0 : 50;
  const total = subtotal + shippingFee;

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleIncrement = (productId: string) => {
    const item = items.find((i) => i.id === productId);
    if (item) updateQuantity(productId, item.quantity + 1);
  };

  const handleDecrement = (productId: string) => {
    const item = items.find((i) => i.id === productId);
    if (item && item.quantity > 1) updateQuantity(productId, item.quantity - 1);
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {/* ROUNDED HEADER STYLE COPIED FROM HOME */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>My Cart</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <ShoppingBag size={64} color={BRAND_COLOR} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Discover amazing products and deals</Text>
          <Pressable onPress={() => navigation.navigate('Shop', {})} style={[styles.shopButton, { backgroundColor: BRAND_COLOR }]}>
            <Text style={styles.shopButtonText}>Explore Products</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. BRANDED ROUNDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Cart ({items.length})</Text>
          <Pressable onPress={clearCart} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear All</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. SELECT ALL BAR */}
      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={toggleSelectAll}>
          {isAllSelected ? (
            <CheckCircle size={22} color={BRAND_COLOR} fill={BRAND_COLOR + '15'} />
          ) : (
            <Circle size={22} color="#D1D5DB" />
          )}
          <Text style={styles.selectAllText}>Select All Items</Text>
        </Pressable>
        {selectedIds.length > 0 && (
          <Pressable onPress={() => setSelectedIds([])}>
            <Text style={{ color: BRAND_COLOR, fontWeight: '700' }}>Deselect All</Text>
          </Pressable>
        )}
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. CART ITEMS */}
        <View style={styles.itemsContainer}>
          {items.map((item) => (
            <View key={item.id} style={styles.itemRowCard}>
              <Pressable style={styles.itemCheckbox} onPress={() => toggleSelectItem(item.id)}>
                {selectedIds.includes(item.id) ? (
                  <CheckCircle size={22} color={BRAND_COLOR} />
                ) : (
                  <Circle size={22} color="#D1D5DB" />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <CartItemRow
                  item={item}
                  onIncrement={() => handleIncrement(item.id)}
                  onDecrement={() => handleDecrement(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              </View>
            </View>
          ))}
        </View>

        {/* PROMO / BENEFITS */}
        {subtotal > 0 && subtotal < 500 && (
          <View style={styles.benefitBanner}>
            <Truck size={20} color={BRAND_COLOR} strokeWidth={2.5} />
            <Text style={styles.benefitText}>
              Add <Text style={{ color: BRAND_COLOR, fontWeight: '800' }}>₱{(500 - subtotal).toLocaleString()}</Text> more for <Text style={{fontWeight: '800'}}>FREE</Text> shipping
            </Text>
          </View>
        )}
        
        {subtotal >= 500 && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={20} color="#166534" strokeWidth={2.5} />
            <Text style={styles.successText}>You've unlocked FREE shipping! 🎉</Text>
          </View>
        )}

        {/* ORDER SUMMARY BOX */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Tag size={18} color={BRAND_COLOR} strokeWidth={2.5} />
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, shippingFee === 0 && { color: BRAND_COLOR, fontWeight: '800' }]}>{shippingFee === 0 ? 'FREE' : `₱${shippingFee}`}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={[styles.totalValue, { color: BRAND_COLOR }]}>₱{total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 4. ENLARGED BRANDED FLOATING ACTION BAR */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 20 }]}>
        <View style={styles.bottomBarContent}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalInfoLabel}>Total Payment</Text>
            <Text style={[styles.totalInfoPrice, { color: BRAND_COLOR }]}>₱{total.toLocaleString()}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Checkout')}
            style={[
              styles.checkoutBtn, 
              { backgroundColor: BRAND_COLOR, opacity: selectedIds.length === 0 ? 0.6 : 1 }
            ]}
            disabled={selectedIds.length === 0}
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
  // HEADER STYLE TO MATCH HOMESCREEN
  headerContainer: { 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 20, 
    borderBottomRightRadius: 20,
    paddingBottom: 20,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  clearButton: { paddingHorizontal: 12 },
  clearText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  
  selectAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectAllText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },

  scrollContainer: { flex: 1 },
  itemsContainer: { padding: 16 },
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

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 30 },
  shopButton: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 100 },
  shopButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  benefitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F0', marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12 },
  benefitText: { flex: 1, fontSize: 14, color: '#4B5563' },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12 },
  successText: { flex: 1, fontSize: 14, color: '#166534', fontWeight: '600' },

  summaryCard: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 24, padding: 20, elevation: 4, shadowOpacity: 0.05, borderWidth: 1, borderColor: '#F1F1F1' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  summaryTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  totalValue: { fontSize: 24, fontWeight: '900' },

  bottomBar: { 
    position: 'absolute', 
    left: 12, 
    right: 12, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 30, 
    elevation: 20, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 25,
    paddingVertical: 4
  },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  totalInfo: { flex: 1 },
  totalInfoLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 2 },
  totalInfoPrice: { fontSize: 24, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 32, paddingVertical: 18, borderRadius: 100 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});