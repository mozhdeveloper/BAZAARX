import { useState, useCallback } from 'react';
import { trackShipment } from '@/services/tracking';
import type { UnifiedTrackingResponse } from '@/types/tracking';

interface UseTrackingReturn {
  tracking: UnifiedTrackingResponse | null;
  loading: boolean;
  error: string | null;
  fetchTracking: (trackingNumber: string) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for tracking shipments
 * 
 * Usage:
 * const { tracking, loading, error, fetchTracking } = useNinjaVanTracking();
 */
export function useNinjaVanTracking(): UseTrackingReturn {
  const [tracking, setTracking] = useState<UnifiedTrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async (trackingNumber: string) => {
    // Reset previous state
    setError(null);
    setTracking(null);
    setLoading(true);

    try {
      if (!trackingNumber.trim()) {
        setError('Please enter a tracking number');
        return;
      }

      console.log(`📦 Fetching tracking for: ${trackingNumber}`);
      
      const data = await trackShipment(trackingNumber);
      setTracking(data);
      console.log('✅ Tracking loaded successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tracking';
      setError(message);
      console.error('❌ Tracking error:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTracking(null);
    setError(null);
    setLoading(false);
  }, []);

  return { tracking, loading, error, fetchTracking, reset };
}
