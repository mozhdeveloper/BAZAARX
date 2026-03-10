/**
 * Address Store (Zustand)
 * 
 * Unified state management for addresses across screens.
 * 
 * Two address concepts:
 * - sessionAddress: The active delivery location shown in HomeScreen header.
 *   Stored in AsyncStorage + DB as "Current Location" row. Changing this does
 *   NOT overwrite the user's default address.
 * - defaultAddress / savedAddresses: Addresses from `shipping_addresses` table.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addressService, type Address } from '../services/addressService';

interface SessionAddress {
  displayAddress: string;          // "123 St, Marikina" — shown in header
  coordinates: { latitude: number; longitude: number } | null;
  details?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
  };
}

interface AddressStoreState {
  // --- Session (HomeScreen header) ---
  sessionAddress: SessionAddress;

  // --- Saved addresses ---
  savedAddresses: Address[];
  defaultAddress: Address | null;
  isLoading: boolean;

  // --- Actions: Session ---
  setSessionAddress: (
    userId: string | null,
    address: string,
    coords?: { latitude: number; longitude: number } | null,
    details?: SessionAddress['details'],
  ) => Promise<void>;
  loadSessionAddress: (userId: string | null) => Promise<void>;

  // --- Actions: Saved addresses ---
  loadSavedAddresses: (userId: string) => Promise<void>;
  addSavedAddress: (userId: string, address: Omit<Address, 'id'>) => Promise<Address>;
  updateSavedAddress: (userId: string, id: string, updates: Partial<Omit<Address, 'id'>>) => Promise<Address>;
  deleteSavedAddress: (id: string) => Promise<void>;
  setDefaultAddress: (userId: string, addressId: string) => Promise<void>;

  // --- Cleanup ---
  reset: () => void;
}

const INITIAL_SESSION: SessionAddress = {
  displayAddress: 'Select Location',
  coordinates: null,
};

export const useAddressStore = create<AddressStoreState>((set, get) => ({
  sessionAddress: { ...INITIAL_SESSION },
  savedAddresses: [],
  defaultAddress: null,
  isLoading: false,

  // ─── Session Address ──────────────────────────────────────────────────

  setSessionAddress: async (userId, address, coords, details) => {
    const session: SessionAddress = {
      displayAddress: address,
      coordinates: coords ?? null,
      details,
    };
    set({ sessionAddress: session });

    // Persist to AsyncStorage (always, even for guests)
    try {
      await AsyncStorage.setItem('currentDeliveryAddress', address);
      if (coords) {
        await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(coords));
      }
    } catch (e) {
      console.error('[addressStore] AsyncStorage write error:', e);
    }

    // Persist to DB if authenticated
    if (userId) {
      try {
        await addressService.saveCurrentDeliveryLocation(userId, address, coords ?? null, details);
      } catch (e) {
        console.error('[addressStore] DB save session error:', e);
      }
    }
  },

  loadSessionAddress: async (userId) => {
    // 1. Fast-read from AsyncStorage
    try {
      const [savedAddress, savedCoords] = await Promise.all([
        AsyncStorage.getItem('currentDeliveryAddress'),
        AsyncStorage.getItem('currentDeliveryCoordinates'),
      ]);

      if (savedAddress) {
        set({
          sessionAddress: {
            displayAddress: savedAddress,
            coordinates: savedCoords ? JSON.parse(savedCoords) : null,
          },
        });
      }
    } catch (e) {
      console.error('[addressStore] AsyncStorage read error:', e);
    }

    // 2. If logged in, try DB for authoritative value
    if (userId) {
      try {
        const dbLocation = await addressService.getCurrentDeliveryLocation(userId);
        if (dbLocation) {
          const formatted = dbLocation.city
            ? `${dbLocation.street}, ${dbLocation.city}`
            : dbLocation.street || 'Select Location';

          set({
            sessionAddress: {
              displayAddress: formatted,
              coordinates: dbLocation.coordinates,
              details: {
                street: dbLocation.street,
                barangay: dbLocation.barangay,
                city: dbLocation.city,
                province: dbLocation.province,
                region: dbLocation.region,
                postalCode: dbLocation.zipCode,
              },
            },
          });
        }
      } catch (e) {
        console.error('[addressStore] DB load session error:', e);
      }
    }
  },

  // ─── Saved Addresses ──────────────────────────────────────────────────

  loadSavedAddresses: async (userId) => {
    set({ isLoading: true });
    try {
      const addresses = await addressService.getAddresses(userId);
      const defaultAddr = addresses.find(a => a.isDefault) ?? null;
      set({ savedAddresses: addresses, defaultAddress: defaultAddr, isLoading: false });
    } catch (e) {
      console.error('[addressStore] Load addresses error:', e);
      set({ isLoading: false });
    }
  },

  addSavedAddress: async (userId, address) => {
    const created = await addressService.createAddress(userId, address);
    const { savedAddresses } = get();
    const updatedList = created.isDefault
      ? [created, ...savedAddresses.map(a => ({ ...a, isDefault: false }))]
      : [created, ...savedAddresses];
    set({
      savedAddresses: updatedList,
      defaultAddress: created.isDefault ? created : get().defaultAddress,
    });
    return created;
  },

  updateSavedAddress: async (userId, id, updates) => {
    const updated = await addressService.updateAddress(userId, id, updates);
    set(state => {
      const updatedList = state.savedAddresses.map(a =>
        a.id === id
          ? updated
          : updates.isDefault ? { ...a, isDefault: false } : a
      );
      return {
        savedAddresses: updatedList,
        defaultAddress: updated.isDefault ? updated : (state.defaultAddress?.id === id && !updated.isDefault ? null : state.defaultAddress),
      };
    });
    return updated;
  },

  deleteSavedAddress: async (id) => {
    await addressService.deleteAddress(id);
    set(state => {
      const updatedList = state.savedAddresses.filter(a => a.id !== id);
      return {
        savedAddresses: updatedList,
        defaultAddress: state.defaultAddress?.id === id ? null : state.defaultAddress,
      };
    });
  },

  setDefaultAddress: async (userId, addressId) => {
    await addressService.setDefaultAddress(userId, addressId);
    set(state => {
      const updatedList = state.savedAddresses.map(a => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      return {
        savedAddresses: updatedList,
        defaultAddress: updatedList.find(a => a.id === addressId) ?? null,
      };
    });
  },

  // ─── Reset ─────────────────────────────────────────────────────────────

  reset: () => {
    set({
      sessionAddress: { ...INITIAL_SESSION },
      savedAddresses: [],
      defaultAddress: null,
      isLoading: false,
    });
  },
}));
