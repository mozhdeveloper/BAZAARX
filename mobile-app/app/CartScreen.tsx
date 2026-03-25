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
import { ChevronLeft, Check, Circle, Flame, ChevronRight, Store as StoreIcon } from 'lucide-react-native';
import { CartItemRow } from '../src/components/CartItemRow';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VariantSelectionModal } from '../src/components/VariantSelectionModal';
import { CartItem, Product } from '../src/types';
import type { ActiveDiscount } from '../src/types/discount';
import { Alert } from 'react-native';


export default function CartScreen({ navigation, route }: any) {
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const requestedIds: string[] | undefined = route?.params?.selectedCartItemIds;
    if (!requestedIds || requestedIds.length === 0 || items.length === 0) return;

    const itemIdSet = new Set(items.map(i => i.cartItemId));
    const existingRequestedIds = requestedIds.filter(id => itemIdSet.has(id));
    if (existingRequestedIds.length > 0) {
      setSelectedIds(existingRequestedIds);
    }
  }, [route?.params?.selectedCartItemIds, items]);

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
    if (variantData.option1Value) newOptions.size = variantData.option1Value;
    if (variantData.option2Value) newOptions.color = variantData.option2Value;

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

  // Memoize cart calculations — avoids recalculating on every render
  const { selectedItems, subtotal, totalSavings } = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const selected = items.filter(item => selectedSet.has(item.cartItemId));
    let sub = 0;
    let savings = 0;

    selected.forEach(item => {
      const price = item.price || 0;
      const qty = item.quantity;
      sub += price * qty;

      if (item.originalPrice && item.originalPrice > price) {
        savings += (item.originalPrice - price) * qty;
      }
    });

    return { selectedItems: selected, subtotal: sub, totalSavings: savings };
  }, [items, selectedIds]);
  const shippingFee = (subtotal > 500 || subtotal === 0) ? 0 : 50;
  const total = subtotal; // Only items subtotal, exclude shipping here as per request

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  // O(1) membership lookup — replaces O(n) Array.includes() calls in render
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev =>
      selectedSet.has(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  }, [selectedSet]);

  const toggleSellerGroup = useCallback((sellerProducts: typeof items) => {
    const sellerItemIds = sellerProducts.map(item => item.cartItemId);
    const isSellerFullySelected = sellerItemIds.every(id => selectedSet.has(id));

    if (isSellerFullySelected) {
      const removeSet = new Set(sellerItemIds);
      setSelectedIds(prev => prev.filter(id => !removeSet.has(id)));
    } else {
      setSelectedIds(prev => {
        const prevSet = new Set(prev);
        const newIds = sellerItemIds.filter(id => !prevSet.has(id));
        return [...prev, ...newIds];
      });
    }
  }, [selectedSet]);

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
      <View
        style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Cart</Text>
          <Pressable onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
            <Text style={[styles.editText, { color: BRAND_PRIMARY }]}>
              {isEditing ? 'Done' : 'Edit'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* SELECT ALL BAR */}
      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(items.map(i => i.cartItemId))}>
          <View style={[
            styles.checkboxBase,
            isAllSelected && { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY }
          ]}>
            {isAllSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
          </View>
          <Text style={styles.selectAllText}>Select All ({items.length})</Text>
        </Pressable>
        {isEditing && selectedIds.length > 0 && (
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
          const isSellerSelected = sellerProducts.every(item => selectedSet.has(item.cartItemId));

          return (
            <View key={sellerName} style={styles.sellerCard}>
              {/* STORE HEADER */}
              <View style={styles.sellerHeader}>
                <Pressable onPress={() => toggleSellerGroup(sellerProducts)} style={styles.headerCheckbox}>
                  <View style={[
                    styles.checkboxBase,
                    isSellerSelected && { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY }
                  ]}>
                    {isSellerSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </View>
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
                  <View style={styles.storeIcon}>
                    <StoreIcon size={14} color="#5D4037" strokeWidth={2.5} />
                  </View>
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
                      <View style={[
                        styles.checkboxBase,
                        selectedSet.has(item.cartItemId) && { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY }
                      ]}>
                        {selectedSet.has(item.cartItemId) && <Check size={14} color="#FFF" strokeWidth={3} />}
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <CartItemRow
                        item={item}
                        onIncrement={() => {
                          const liveItem = useCartStore.getState().items.find(
                            (cartItem) => cartItem.cartItemId === item.cartItemId || cartItem.id === item.cartItemId
                          );
                          const currentQty = liveItem?.quantity ?? item.quantity;
                          updateQuantity(item.cartItemId, currentQty + 1);
                        }}
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

              {/* Per-Seller Subtotal Removed to match reference UI */}
            </View>
          );
        })}
      </ScrollView>

      {/* FLOATING ACTION BAR */}
      {!isEditing && items.length > 0 && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 90 }]}>
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={styles.totalInfoLabel}>Total Amount</Text>
              <Text style={[styles.totalInfoPrice, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text>
              {totalSavings > 0 && (
                <Text style={styles.savingsText}>You saved ₱{totalSavings.toLocaleString()}</Text>
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
      )}

      {/* Empty Cart View */}
      {items.length === 0 && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textHeadline }}>Your cart is empty</Text>
          <Pressable 
            onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}
            style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: BRAND_PRIMARY, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Start Shopping</Text>
          </Pressable>
        </View>
      )}

      {editingItem && (() => {
        // Build an ActiveDiscount from the stored campaignDiscount on the cart item
        // so the VariantSelectionModal can display the correct discounted price.
        const cd = (editingItem as any).campaignDiscount;
        const editingItemDiscount: ActiveDiscount | null = (cd && cd.discountType && cd.discountValue != null)
          ? {
            campaignId: cd.campaignId || '',
            campaignName: cd.campaignName || '',
            discountType: cd.discountType,
            discountValue: Number(cd.discountValue),
            maxDiscountAmount: cd.maxDiscountAmount != null ? Number(cd.maxDiscountAmount) : undefined,
            discountedPrice: Number(editingItem.price ?? 0),
            originalPrice: Number(editingItem.originalPrice ?? 0),
            badgeText: undefined,
            badgeColor: undefined,
            endsAt: new Date(),
          }
          : null;

        return (
          <VariantSelectionModal
            visible={showVariantModal}
            onClose={() => setShowVariantModal(false)}
            product={editingItem as any}
            variants={editingItem.variants}
            initialSelectedVariant={editingItem.selectedVariant}
            initialQuantity={editingItem.quantity}
            onConfirm={handleSaveVariant}
            confirmLabel="Update Cart"
            hideQuantity={true}
            activeCampaignDiscount={editingItemDiscount}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, // Match soft amber theme
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontSize: 16,
    fontWeight: '700',
  },
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
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Changed from #FFF
  },
  selectAllText: { fontSize: 15, fontWeight: '700', color: COLORS.textHeadline },

  scrollContainer: { flex: 1, paddingTop: 8 },

  // REFACTORED STYLE FOR SELLER GROUP (No boxes)
  sellerCard: {
    backgroundColor: '#FFFFFF', // Pure White
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#A85D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 8,
  },
  headerCheckbox: { marginRight: 12 },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F7E9DE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBD9C8',
  },
  sellerName: { fontSize: 17, fontWeight: '800', color: '#431407' }, // Darker coffee color to match parchment theme

  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12, opacity: 0.5 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center', // Changed from flex-start to center
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  itemCheckbox: {
    width: 32,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  itemSeparator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 0, opacity: 0.3 },

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
  bottomBar: { 
    position: 'absolute', 
    left: 16, 
    right: 16, 
    backgroundColor: '#FFFFFF', // Pure White
    borderRadius: 15, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 15, 
    paddingVertical: 3 
  },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  totalInfoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  totalInfoPrice: { fontSize: 24, fontWeight: '900', color: COLORS.textHeadline },
  checkoutBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15 },
  checkoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  savingsText: { fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 2 },
});