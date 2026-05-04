import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Custom hook to manage the visibility and countdown of the Flash Sale section.
 * Handles automatic hiding when the sale expires or is paused by an admin.
 * 
 * @param flashSaleProducts - Array of products currently fetched for the flash sale.
 * @param refreshData - Callback to re-fetch data from the source (Supabase).
 */
export const useFlashSaleVisibility = (flashSaleProducts: any[], refreshData?: () => void) => {
  const [isVisible, setIsVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  // Track whether the section was visible on the previous tick so we can detect
  // the visible→hidden transition and trigger a data refresh exactly once.
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const calculateVisibility = () => {
      const now = Date.now();
      
      // 1. Filter for products that are truly active (not expired, not paused).
      //    Use secondsLeft (floor division) as the expiry condition so visibility
      //    flips to false at the same moment the displayed countdown reaches 00:00:00.
      const activeProducts = (flashSaleProducts || []).filter(p => {
        if (!p || !p.campaignEndsAt) return false;
        
        const endTime = new Date(p.campaignEndsAt).getTime();
        if (isNaN(endTime)) return false;
        
        // Expired when the floor-rounded seconds left hits 0 — matches the timer display.
        const secondsLeft = Math.floor((endTime - now) / 1000);
        const isExpired = secondsLeft <= 0;
        
        // Handle various 'paused' indicators (is_paused boolean or status string)
        const isPaused = 
          p.is_paused === true || 
          p.status === 'paused' || 
          p.status === 'inactive' ||
          p.campaignStatus === 'paused';
          
        return !isExpired && !isPaused;
      });

      // 2. Component is visible ONLY if there are active products
      const shouldShow = activeProducts.length > 0;

      // 3. Detect visible → hidden transition and trigger a single data refresh
      //    so stale products are cleared from state immediately.
      if (!shouldShow && wasVisibleRef.current) {
        wasVisibleRef.current = false;
        setIsVisible(false);
        setSecondsRemaining(0);
        refreshData?.();
        return;
      }
      wasVisibleRef.current = shouldShow;
      setIsVisible(shouldShow);

      // 4. Update countdown to the nearest end time
      if (shouldShow) {
        const endTimes = activeProducts.map(p => new Date(p.campaignEndsAt).getTime());
        const nextEnd = Math.min(...endTimes);
        setSecondsRemaining(Math.max(0, Math.floor((nextEnd - now) / 1000)));
      } else {
        setSecondsRemaining(0);
      }
    };

    // Run immediately
    calculateVisibility();
    
    // Set up tick every second
    const interval = setInterval(calculateVisibility, 1000);

    // 4. Real-time Subscription to handle Admin actions (Pause/Resume)
    // We listen to both global slots and individual campaigns
    const channel = supabase
      .channel('realtime_flash_sale_visibility')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'global_flash_sale_slots' }, 
        () => {
          console.log('[useFlashSaleVisibility] Global slot updated, refreshing...');
          refreshData?.();
        }
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'discount_campaigns' }, 
        () => {
          console.log('[useFlashSaleVisibility] Discount campaign updated, refreshing...');
          refreshData?.();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [flashSaleProducts, refreshData]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return {
    isVisible,
    secondsRemaining,
    formattedTime: formatTime(secondsRemaining)
  };
};
