import type {
    UnifiedTrackingResponse,
    TrackingStatus,
} from '../../types/tracking';

const PROXY_URL = '/api/track';

// AfterShip API types
interface AfterShipTracking {
    tracking_number: string;
    slug: string;
    tag: string;
    subtag: string;
    updated_at: string;
    courier_estimated_delivery_date?: { estimated_delivery_date: string } | null;
    checkpoints: Array<{
        checkpoint_time: string;
        location: string;
        message: string;
        tag: string;
    }>;
}

interface AfterShipListResponse {
    meta: { code: number };
    data: {
        trackings: AfterShipTracking[];
    };
}

export async function trackWithAfterShip(
    trackingNumber: string,
    carrierCode: string = 'ninjava'
):Promise<UnifiedTrackingResponse> {
    try {
        if (!trackingNumber.trim()){
            throw new Error('Tracking number cannot be empty.');
        }

        console.log(`🔍 Fetching tracking via local proxy: ${trackingNumber}`);

        // Call local proxy to avoid CORS
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trackingNumber,
                carrierCode,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: AfterShipListResponse = await response.json();
        
        // Find the tracking in the list
        const tracking = data.data.trackings.find(t => t.tracking_number === trackingNumber);
        
        if (!tracking) {
            throw new Error(`Tracking number "${trackingNumber}" not found in AfterShip`);
        }

        console.log('✅ Tracking data received:', tracking);

        // Transform AfterShip response to our unified format
        const unified = transformAfterShipResponse(tracking);

        return unified;
    } catch(error){
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Tracking error:', errorMessage);
        throw error;
    }
}

function transformAfterShipResponse(tracking: AfterShipTracking): UnifiedTrackingResponse {
    return {
        tracking_number: tracking.tracking_number || '',
        carrier: tracking.slug || 'unknown',
        status: mapAfterShipStatus(tracking.tag),
        last_location: extractLastLocation(tracking),
        last_update: tracking.updated_at || new Date().toISOString(),
        estimated_delivery: tracking.courier_estimated_delivery_date?.estimated_delivery_date || undefined,
        events: transformCheckpoints(tracking.checkpoints || []),
    };
}

function mapAfterShipStatus(status: string | undefined): TrackingStatus {
    if (!status) return 'pending';

    const statusMap: Record<string, TrackingStatus> = {
        // Pending states
        'Pending': 'pending',
        'InfoReceived': 'pending',
        
        // In Transit states
        'InTransit': 'in_transit',
        'OutForDelivery': 'out_for_delivery',
        
        // Delivered states
        'Delivered': 'delivered',
        
        // Failed states
        'Failed': 'failed',
        'Returned': 'failed',
        'Exception': 'failed',
    };

    return statusMap[status] || 'pending';
}

function extractLastLocation(tracking: AfterShipTracking): string {
    if (!tracking.checkpoints || tracking.checkpoints.length === 0) {
        return 'Location unknown';
    }

    // Get the most recent checkpoint (first in array)
    const lastCheckpoint = tracking.checkpoints[0];
    return lastCheckpoint.location || 'Location unknown';
}

function transformCheckpoints(checkpoints: AfterShipTracking['checkpoints']): UnifiedTrackingResponse['events'] {
    if (!Array.isArray(checkpoints)) {
        return [];
    }

    return checkpoints
        .filter((cp) => cp) // Filter out null/undefined
        .map((checkpoint) => ({
            timestamp: checkpoint.checkpoint_time || '',
            status: checkpoint.tag || 'unknown',
            location: checkpoint.location || 'Unknown',
            message: checkpoint.message || '',
        }));
}

export async function testAfterShipConnection(): Promise<boolean> {
    try {
        console.log('🧪 Testing local proxy connection...');
        
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trackingNumber: 'TEST',
                carrierCode: 'ninjava',
            }),
        });

        if (response.ok) {
            console.log('✅ Local proxy connection successful');
            return true;
        } else {
            console.error('❌ Proxy connection failed:', response.statusText);
            return false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Connection test error:', errorMessage);
        return false;
    }
}