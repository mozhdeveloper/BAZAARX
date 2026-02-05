import { trackWithAfterShip, testAfterShipConnection } from './aftership';
import type { UnifiedTrackingResponse } from '@/types/tracking';

const provider = import.meta.env.VITE_TRACKING_PROVIDER || 'aftership';

/**
 * Main tracking function - works with any provider
 */
export async function trackShipment(
  trackingNumber: string
): Promise<UnifiedTrackingResponse> {
  if (provider === 'aftership') {
    return trackWithAfterShip(trackingNumber);
  }

  throw new Error(
    `Unknown tracking provider: ${provider}. Supported: 'aftership'`
  );
}

/**
 * Test the tracking service connection
 */
export async function testTrackingService(): Promise<boolean> {
  if (provider === 'aftership') {
    return testAfterShipConnection();
  }

  return false;
}

// Export types for use in components
export type { UnifiedTrackingResponse } from '@/types/tracking';
