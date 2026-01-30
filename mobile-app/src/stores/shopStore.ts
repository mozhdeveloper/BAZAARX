import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { officialStores } from '../data/stores';

import { Store } from '../data/stores';

interface ShopState {
    followedShops: Store[];
    followShop: (shop: Store) => void;
    unfollowShop: (id: string) => void;
    isShopFollowed: (id: string) => boolean;
}

export const useShopStore = create<ShopState>()(
    persist(
        (set, get) => ({
            // Initialize with all official stores followed, per user expectation/demo
            followedShops: officialStores,

            followShop: (shop: Store) => {
                set((state) => {
                    if (state.followedShops.some(s => s.id === shop.id)) {
                        return state;
                    }
                    return { followedShops: [...state.followedShops, shop] };
                });
            },

            unfollowShop: (id: string) => {
                set((state) => ({
                    followedShops: state.followedShops.filter(s => s.id !== id)
                }));
            },

            isShopFollowed: (id: string) => {
                return get().followedShops.some(s => s.id === id);
            }
        }),
        {
            name: 'shop-storage-v2',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
