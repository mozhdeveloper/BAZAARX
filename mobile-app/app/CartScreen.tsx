import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartItemRow } from '../src/components/CartItemRow';
import { DeleteConfirmationModal } from '../src/components/DeleteConfirmationModal';
import { VariantSelectionModal } from '../src/components/VariantSelectionModal';
import { COLORS } from '../src/constants/theme';
import { useCartStore } from '../src/stores/cartStore';
import { CartItem } from '../src/types';
import type { ActiveDiscount } from '../src/types/discount';


export default function CartScreen({ navigation, route }: any) {
  const { items, removeItem, updateQuantity, clearCart, initializeForCurrentUser, clearQuickOrder, updateItemVariant, removeItems, error } = useCartStore();
  const insets = useSafeAreaInsets();

  // Use global theme color
  const BRAND_PRIMARY = COLORS.primary;

  useEffect(() => {
    const init = async () => {
      await initializeForCurrentUser();
      
      // Check for invalid cart quantities after initialization
      const items = useCartStore.getState().items;
      let adjustmentsMade = false;

      for (const item of items) {
        // Calculate effective stock for this item
        let stock: number | null = null;
        if (item.selectedVariant?.variantId) {
          if (item.variants) {
            const variant = item.variants.find(v => v.id === item.selectedVariant?.variantId);
            if (variant) stock = variant.stock ?? null;
          }
        } else {
          stock = item.stock ?? null;
        }

        // Only adjust if stock > 0 AND quantity exceeds stock
        // If stock is 0 or null, do nothing and let UI render "Out of Stock"
        if (stock !== null && stock > 0 && item.quantity > stock) {
          updateQuantity(item.cartItemId, stock);
          adjustmentsMade = true;
        }
      }

      if (adjustmentsMade) {
        Alert.alert('Cart Adjusted', 'Some items in your cart had their quantities adjusted due to stock changes.');
      }
    };
    
    init();
  }, [initializeForCurrentUser, updateQuantity]);

  // Handle error state and display alert
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Update Failed',
        error,
        [
          {
            text: 'OK',
            onPress: () => useCartStore.setState({ error: null }),
          },
        ]
      );
    }
  }, [error]);

  // Handle error state and display alert
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Update Failed',
        error,
        [
          {
            text: 'OK',
            onPress: () => useCartStore.setState({ error: null }),
          },
        ]
      );
    }
  }, [error]);

  // Also refresh when screen is focused (returning from product detail, etc.)
  useFocusEffect(
    useCallback(() => {
      initializeForCurrentUser();
    }, [])
  );



  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; item?: CartItem } | null>(null);

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
    setDeleteTarget({ type: 'single', item });
  };

  const handleDeleteSelected = () => {
    setDeleteTarget({ type: 'bulk' });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'bulk') {
      removeItems(selectedIds);
      setSelectedIds([]);
    } else if (deleteTarget.type === 'single' && deleteTarget.item) {
      removeItem(deleteTarget.item.cartItemId);
      // Also remove from selection if it was selected
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.item?.cartItemId));
    }
    setDeleteTarget(null);
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
  const total = subtotal;

  // O(1) membership lookup — replaces O(n) Array.includes() calls in render
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Helper: resolve effective stock for a cart item
  const getItemStock = useCallback((item: CartItem): number | null => {
    if (item.selectedVariant?.variantId) {
      if (item.variants) {
        const v = item.variants.find(v => v.id === item.selectedVariant?.variantId);
        if (v) return v.stock;
      }
      // Variant selected but not found in local variants array — don't use base product stock
      return null;
    }
    return item.stock ?? null;
  }, []);

  const isItemUnavailable = useCallback((item: CartItem) => {
    const s = getItemStock(item);
    const isOutOfStock = s !== null && s === 0;
    const isSellerInactive = item.isSellerActive === false;
    return isOutOfStock || isSellerInactive;
  }, [getItemStock]);

  const selectableItems = useMemo(() => items.filter(i => !isItemUnavailable(i)), [items, isItemUnavailable]);
  const isAllSelected = selectableItems.length > 0 && selectableItems.every(i => selectedSet.has(i.cartItemId));
  const hasOutOfStockSelected = useMemo(() => selectedItems.some(i => isItemUnavailable(i)), [selectedItems, isItemUnavailable]);

  const toggleSelectItem = useCallback((id: string) => {
    const item = items.find(i => i.cartItemId === id);
    if (item && isItemUnavailable(item)) return;
    setSelectedIds(prev =>
      selectedSet.has(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  }, [selectedSet, items, isItemUnavailable]);

  const toggleSellerGroup = useCallback((sellerProducts: typeof items) => {
    const sellerItemIds = sellerProducts.filter(item => !isItemUnavailable(item)).map(item => item.cartItemId);
    const isSellerFullySelected = sellerItemIds.length > 0 && sellerItemIds.every(id => selectedSet.has(id));

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
  }, [selectedSet, isItemUnavailable]);

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
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* SELECT ALL BAR */}
      <View style={styles.selectAllBar}>
        <Pressable style={styles.checkboxWrapper} onPress={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(selectableItems.map(i => i.cartItemId))}>
          <View style={[
            styles.checkboxBase,
            isAllSelected && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
          ]}>
            {isAllSelected && <Check size={12} color="#FFF" strokeWidth={2.5} />}
          </View>
          <Text style={styles.selectAllText}>Select All ({items.length})</Text>
        </Pressable>
        {selectedIds.length > 0 && (
          <Pressable onPress={handleDeleteSelected}>
            <Text style={[styles.clearText, { color: '#EF4444' }]}>Delete ({selectedIds.length})</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SELLER GROUPS */}
        {Object.entries(groupedItems).map(([sellerName, sellerProducts], idx) => {
          const sellerIsActive = sellerProducts[0]?.isSellerActive !== false;
          const sellerRestrictionReason = sellerProducts[0]?.sellerRestrictionReason || null;
          const isSellerSelected = sellerProducts.every(item => selectedSet.has(item.cartItemId));

          return (
            <View key={sellerName} style={[styles.sellerCard, idx === Object.entries(groupedItems).map(() => 0).length - 1 && { marginBottom: 0 }]}>
              {/* STORE HEADER */}
              <View style={styles.sellerHeader}>
                {sellerIsActive ? (
                  <Pressable onPress={() => toggleSellerGroup(sellerProducts)} style={styles.headerCheckbox}>
                    <View style={[
                      styles.checkboxBase,
                      isSellerSelected && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                    ]}>
                      {isSellerSelected && <Check size={12} color="#FFF" strokeWidth={2.5} />}
                    </View>
                  </Pressable>
                ) : (
                  <View style={[styles.headerCheckbox, styles.restrictionBadge]}>
                    <Text style={styles.restrictionBadgeText}>{sellerRestrictionReason}</Text>
                  </View>
                )}
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
                    <Pressable style={styles.itemCheckbox} onPress={() => toggleSelectItem(item.cartItemId)} disabled={isItemUnavailable(item)}>
                      <View style={[
                        styles.checkboxBase,
                        isItemUnavailable(item) && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.5 },
                        !isItemUnavailable(item) && selectedSet.has(item.cartItemId) && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
                      ]}>
                        {!isItemUnavailable(item) && selectedSet.has(item.cartItemId) && <Check size={12} color="#FFF" strokeWidth={2.5} />}
                      </View>
                    </Pressable>
                    <View style={[{ flex: 1 }, !sellerIsActive && { opacity: 0.5 }]}>
                      <CartItemRow
                        item={item}
                        onIncrement={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        onDecrement={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        onChange={() => {}}
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
      {items.length > 0 && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + 80 }]}>
          <View style={styles.bottomBarContent}>
            <View>

              <Text style={[styles.totalInfoPrice, { color: BRAND_PRIMARY }]}>₱{total.toLocaleString()}</Text>
              {totalSavings > 0 && (
                <Text style={styles.savingsText}>Saved ₱{totalSavings.toLocaleString()}</Text>
              )}
            </View>
            <Pressable
              disabled={selectedIds.length === 0 || hasOutOfStockSelected}
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
              style={[styles.checkoutBtn, { backgroundColor: BRAND_PRIMARY, opacity: (selectedIds.length === 0 || hasOutOfStockSelected) ? 0.5 : 1 }]}>
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

      <DeleteConfirmationModal
        visible={!!deleteTarget}
        title={deleteTarget?.type === 'bulk' ? 'Delete Selected Items?' : 'Remove Item?'}
        description={deleteTarget?.type === 'bulk'
          ? `Are you sure you want to remove ${selectedIds.length} items from your cart?`
          : 'Are you sure you want to remove this item from your cart?'
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
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
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Changed from #FFF
  },
  selectAllText: { fontSize: 14, fontWeight: '500', color: COLORS.textHeadline },

  scrollContainer: { flex: 1, paddingTop: 8 },

  // REFACTORED STYLE FOR SELLER GROUP (No boxes)
  sellerCard: {
    backgroundColor: '#FFFFFF', // Pure White
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
    borderRadius: 6,
    backgroundColor: '#F7E9DE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBD9C8',
  },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#431407' }, // Darker coffee color to match parchment theme

  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12, opacity: 0.5 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  itemCheckbox: {
    width: 24,
    height: 90,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  itemSeparator: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 0, opacity: 0.3 },

  restrictionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },

  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 3
  },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 },
  totalInfoLabel: { fontSize: 14, color: COLORS.gray500, fontWeight: '500' },
  totalInfoPrice: { fontSize: 20, fontWeight: '500', color: COLORS.textHeadline },
  checkoutBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  checkoutBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  savingsText: { fontSize: 12, color: '#DC2626', fontWeight: '400', marginTop: 2 },
});