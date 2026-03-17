import { useState, useCallback } from 'react';
import { useCartStore } from '../stores/cartStore';
import type { Product } from '../types';

interface AddedProductInfo {
  name: string;
  image: string;
}

/**
 * Encapsulates common cart operations used across multiple screens:
 * add-to-cart with modal confirmation, buy-now quick order, and buy-again from orders.
 */
export function useCart() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const setQuickOrder = useCartStore((s) => s.setQuickOrder);
  const initializeForCurrentUser = useCartStore((s) => s.initializeForCurrentUser);

  const [addedProductInfo, setAddedProductInfo] = useState<AddedProductInfo | null>(null);
  const [showAddedModal, setShowAddedModal] = useState(false);

  const itemCount = items.length;

  const addToCart = useCallback(async (
    product: Product,
    quantity: number,
    options?: { variant?: any; displayImage?: string; forceNewItem?: boolean },
  ) => {
    const itemToAdd = { ...product, selectedVariant: options?.variant, quantity };
    const cartItemId = await addItem(itemToAdd as any, { forceNewItem: options?.forceNewItem });
    const variantText = options?.variant ? ` (${options.variant.name || options.variant.label || ''})` : '';
    setAddedProductInfo({
      name: `${product.name}${variantText}`,
      image: options?.displayImage || product.image || (product as any).images?.[0] || '',
    });
    setShowAddedModal(true);
    return cartItemId;
  }, [addItem]);

  const buyNow = useCallback((
    product: Product,
    quantity: number,
    options?: { variant?: any; price?: number },
  ) => {
    const itemToOrder = options?.price ? { ...product, price: options.price, selectedVariant: options.variant } : { ...product, selectedVariant: options?.variant };
    setQuickOrder(itemToOrder as any, quantity);
  }, [setQuickOrder]);

  const buyAgain = useCallback(async (orderItems: any[]) => {
    const addedIds = (await Promise.all(
      orderItems.map((item: any) => addItem(item as any, { forceNewItem: true })),
    )).filter(Boolean) as string[];
    return addedIds;
  }, [addItem]);

  const dismissAddedModal = useCallback(() => {
    setShowAddedModal(false);
    setAddedProductInfo(null);
  }, []);

  return {
    items,
    itemCount,
    addToCart,
    buyNow,
    buyAgain,
    removeItem,
    updateQuantity,
    clearCart,
    initializeForCurrentUser,
    addedProductInfo,
    showAddedModal,
    dismissAddedModal,
  };
}
