import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, Circle, Flame, ChevronRight } from 'lucide-react-native';
import { CartItemRow } from '../src/components/CartItemRow';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VariantSelectionModal } from '../src/components/VariantSelectionModal';
import { CartItem, Product } from '../src/types';
import { Alert } from 'react-native';


export default function CartScreen({ navigation }: any) {
  const { items, removeItem, updateQuantity, clearCart, initializeForCurrentUser, clearQuickOrder, updateItemVariant, removeItems } = useCartStore(); // Add clearQuickOrder
  const insets = useSafeAreaInsets();

  // Use global theme color
  const BRAND_PRIMARY = COLORS.primary;

  useEffect(() => {
    initializeForCurrentUser();
  }, []);

  // Also refresh when screen is focused (returning from product detail, etc.)
  useFocusEffect(
    useCallback(() => {
      initializeForCurrentUser();
    }, [])
  );



  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit Variant State
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const handleEditVariant = (item: CartItem) => {
    setEditingItem(item);
    setShowVariantModal(true);
  };

  const handleSaveVariant = async (
    variantData: {
      option1Value?: string;
      option2Value?: string;
      variantId?: string;
    },
    newQuantity: number
  ) => {
    if (!editingItem) return;

    // Build personalized options
    const newOptions: any = {
      ...editingItem.selectedVariant, // Keep existing (like fallback)
      option1Value: variantData.option1Value,
      option2Value: variantData.option2Value,
      variantId: variantData.variantId,
    };
    // Also update legacy fields if applicable (though store might handle mapping)
    if (variantData.option1Value) newOptions.color = variantData.option1Value;
    if (variantData.option2Value) newOptions.size = variantData.option2Value;

    await updateItemVariant(editingItem.cartItemId, variantData.variantId, newOptions);

    // Also update quantity if changed
    if (newQuantity !== editingItem.quantity) {
      updateQuantity(editingItem.id, newQuantity);
    }

    setEditingItem(null);
  };

  // Delete Handlers
  const handleRemoveSingle = (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem(item.cartItemId) // Using cartItemId as per store update
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCart }
      ]
    );
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Selected',
      `Remove ${selectedIds.length} item(s) from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeItems(selectedIds);
            setSelectedIds([]); // Clear selection after delete
          }
        }
      ]
    );
  };

  const groupedItems = useMemo(() => {
    return items.reduce((groups, item) => {
      const seller = item.seller || 'Verified Seller';
      if (!groups[seller]) groups[seller] = [];
      groups[seller].push(item);
      return groups;
    }, {} as Record<string, typeof items>);
  }, [items]);

  const selectedItems = items.filter(item => selectedIds.includes(item.cartItemId));
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
    const sellerItemIds = sellerProducts.map(item => item.cartItemId);
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

  const handleCheckout = async () => {
    if (selectedIds.length === 0) return;

    // Clear any previous quick order to ensure we checkout strictly from cart selections
    clearQuickOrder();

    // Get delivery address from AsyncStorage
    let deliveryAddress: string | undefined;
    let deliveryCoordinates: { latitude: number; longitude: number } | undefined;

    try {
      const savedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
      const savedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');

      if (savedAddress) {
        deliveryAddress = savedAddress;
      }
      if (savedCoords) {
        deliveryCoordinates = JSON.parse(savedCoords);
      }
    } catch (error) {
      console.error('[CartScreen] Error reading delivery address:', error);
    }

    // Navigate to Checkout with selected items and delivery address
    navigation.navigate('Checkout', {
      selectedItems: selectedItems, // Pass the selected cart items
      deliveryAddress,
      deliveryCoordinates,
    });
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      {/* HEADER */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 5 }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
      </LinearGradient>

      {/* SELECT ALL BAR */}
      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(items.map(i => i.cartItemId))}>
          {isAllSelected ? <CheckCircle size={22} color={BRAND_PRIMARY} fill={BRAND_PRIMARY + '15'} /> : <Circle size={22} color="#D1D5DB" />}
          <Text style={styles.selectAllText}>Select All Items</Text>
        </Pressable>
        {selectedIds.length > 0 && (
          <Pressable onPress={handleDeleteSelected}>
            <Text style={[styles.clearText, { color: '#EF4444' }]}>Delete ({selectedIds.length})</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 200 }} // Increased padding to ensure visibility
        showsVerticalScrollIndicator={false}
      >
        {/* SELLER GROUPS */}
        {Object.entries(groupedItems).map(([sellerName, sellerProducts]) => {
          const isSellerSelected = sellerProducts.every(item => selectedIds.includes(item.cartItemId));

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
                <Pressable
                  style={styles.storeInfo}
                  onPress={() => {
                    const sellerId = sellerProducts[0]?.sellerId || sellerProducts[0]?.seller_id;
                    if (sellerId) {
                      navigation.navigate('StoreDetail', { store: { id: sellerId, name: sellerName } });
                    }
                  }}
                >
                  <Text style={styles.sellerName}>{sellerName}</Text>
                  <ChevronRight size={16} color="#9CA3AF" />
                </Pressable>
              </View>

              <View style={styles.cardDivider} />

              {/* PRODUCTS LIST */}
              {sellerProducts.map((item, index) => (
                <View key={item.cartItemId}>
                  <View style={styles.itemRow}>
                    <Pressable style={styles.itemCheckbox} onPress={() => toggleSelectItem(item.cartItemId)}>
                      {selectedIds.includes(item.cartItemId) ? (
                        <CheckCircle size={20} color={BRAND_PRIMARY} />
                      ) : (
                        <Circle size={20} color="#D1D5DB" />
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <CartItemRow
                        item={item}
                        onIncrement={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        onDecrement={() => item.quantity > 1 && updateQuantity(item.cartItemId, item.quantity - 1)}
                        onChange={(val) => updateQuantity(item.cartItemId, val)}
                        onRemove={() => handleRemoveSingle(item)}
                        onEdit={item.selectedVariant ? () => handleEditVariant(item) : undefined}
                        onPress={() => navigation.navigate('ProductDetail', { product: item })}
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
      </ScrollView>

      {/* FLOATING ACTION BAR */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 80 }]}>
        <View style={styles.bottomBarContent}>
          <View>
            <Text style={[styles.totalInfoPrice, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text>
            {totalSavings > 0 && (
              <Text style={styles.savingsText}>Saved: ₱{totalSavings.toLocaleString()}</Text>
            )}
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
      {editingItem && (
        <VariantSelectionModal
          visible={showVariantModal}
          onClose={() => setShowVariantModal(false)}
          product={editingItem as any} // Cast because CartItem has superset of Product props mostly
          variants={editingItem.variants} // Pass variants for stock validation
          initialSelectedVariant={editingItem.selectedVariant}
          initialQuantity={editingItem.quantity}
          onConfirm={handleSaveVariant}
          confirmLabel="Update Cart"
          hideQuantity={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, // Match soft amber theme
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    // backgroundColor: '#FFE5CC', // Removed for gradient
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  clearTextWrapper: {
    position: 'absolute',
    right: 0,
  },
  clearText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 13 },

  selectAllBar: {
    backgroundColor: 'transparent',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectAllText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  scrollContainer: { flex: 1, paddingTop: 8 },

  // REFACTORED STYLE FOR SELLER GROUP (No boxes)
  sellerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 14,
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 0,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 8,
  },
  headerCheckbox: { marginRight: 12 },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerName: { fontSize: 17, fontWeight: '800', color: '#111827' }, // Black subheader

  cardDivider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 12 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  itemCheckbox: {
    width: 44,
    height: 90,
    paddingTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemSeparator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 12, opacity: 0.6 },

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
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  totalValue: { fontSize: 22, fontWeight: '900', color: COLORS.textHeadline },

  // BOTTOM BAR
  bottomBar: { position: 'absolute', left: 16, right: 16, backgroundColor: '#FFFFFF', borderRadius: 15, elevation: 15, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, paddingVertical: 3 },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  totalInfoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  totalInfoPrice: { fontSize: 24, fontWeight: '900', color: COLORS.textHeadline },
  checkoutBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  savingsText: { fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 2 },
});