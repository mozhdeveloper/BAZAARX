import { useState, useEffect, useMemo } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import type { RegistryItem, Address } from '@/stores/buyer/buyerTypes';

export function useRegistryCheckout(checkoutItems: any[]) {
  const { loadPublicRegistry } = useBuyerStore();
  const [registryData, setRegistryData] = useState<RegistryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isRegistryOrder = useMemo(() => {
    return checkoutItems.some(item => !!item.registryId);
  }, [checkoutItems]);

  const registryId = useMemo(() => {
    if (!isRegistryOrder) return null;
    return checkoutItems.find(item => !!item.registryId)?.registryId || null;
  }, [isRegistryOrder, checkoutItems]);

  useEffect(() => {
    if (registryId) {
      setIsLoading(true);
      loadPublicRegistry(registryId)
        .then(data => {
          setRegistryData(data);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setRegistryData(null);
    }
  }, [registryId, loadPublicRegistry]);

  const recipientAddress = useMemo(() => {
    if (!registryData?.delivery?.showAddress) return null;
    
    // We don't have the full address object here usually, 
    // but the system might provide a masked version or we mask it here.
    // For now, we'll assume registryData.delivery contains what we need to show.
    return {
      recipientName: registryData.recipientName || registryData.delivery.recipientName || 'Recipient',
      // Masking logic: Show City/Province but hide street
      city: '***', // Registry data should ideally have these masked if privacy is on
      province: '***',
      maskedStreet: 'Hidden Address (Secure Registry Gifting)',
    };
  }, [registryData]);

  return {
    isRegistryOrder,
    registryId,
    registryData,
    recipientAddress,
    isLoading,
  };
}
