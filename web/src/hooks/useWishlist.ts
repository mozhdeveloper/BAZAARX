import { useState, useCallback, useSyncExternalStore } from 'react';

const WISHLIST_KEY = 'bazaar_wishlist';

function getSnapshot(): string[] {
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

let cachedIds: string[] = getSnapshot();

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === WISHLIST_KEY) {
      cachedIds = getSnapshot();
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getIds() {
  return cachedIds;
}

export function useWishlist() {
  const ids = useSyncExternalStore(subscribe, getIds);

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids]
  );

  const toggleWishlist = useCallback((productId: string) => {
    const current = getSnapshot();
    const next = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId];
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    cachedIds = next;
    // Force re-render for same-tab updates
    window.dispatchEvent(new StorageEvent('storage', { key: WISHLIST_KEY }));
  }, []);

  return { wishlistIds: ids, isWishlisted, toggleWishlist };
}
