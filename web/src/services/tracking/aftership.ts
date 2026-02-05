import type {
    UnifiedTrackingResponse,
    AfterShipResponse,
    TrackingStatus,
    AfterShipCheckpoint,
} from '../../types/tracking';

const API_KEY = import.meta.env.VITE_AFTERSHIP_API_KEY || '';
const API_URL = import.meta.env.VITE_AFTERSHIP_API_URL || '';

if (!API_KEY) {
    console.warn('AfterShip API key is not set in environment variables.'); 
}

export async function trackWithAfterShip(
    trackingNumber: string,
    carrierCode: string = 'ninjava'
):Promise<UnifiedTrackingResponse> {
    try {
        if (!trackingNumber.trim()){
            throw new Error('Tracking number cannot be empty.');
        }

        const url = `${API_URL}/trackings/${carrierCode}/${trackingNumber}`;

        console.log(`🔍 Fetching tracking from AfterShip: ${trackingNumber}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'aftership-api-key': API_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 404) {
            throw new Error(
                `Tracking number "${trackingNumber}" not found. Please verify the number.`
            );
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('AfterShip API Error:', errorData);
            throw new Error(
                `AfterShip API Error: ${response.status} ${response.statusText}`
            );
        }

        const data: AfterShipResponse = await response.json();
        const tracking = data.data.tracking;

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

function transformAfterShipResponse(tracking: AfterShipResponse['data']['tracking']): UnifiedTrackingResponse   {
    return {
        tracking_number: tracking.tracking_number || '',
        carrier: tracking.slug || 'unknown',
        status: mapAfterShipStatus(tracking.delivery_status),
        last_location: extractLastLocation(tracking),
        last_update: tracking.updated_at || new Date().toISOString(),
        estimated_delivery: tracking.estimated_delivery_date,
        events: transformCheckpoints(tracking.checkpoints || []),
    }
}

function mapAfterShipStatus(status: string | undefined): TrackingStatus {
    if (!status) return 'pending';

    const statusMap: Record<string, TrackingStatus> = {
        'pending': 'pending',
        'on_the_way': 'in_transit',
        'in_transit': 'in_transit',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered',
        'failed': 'failed',
        'returned': 'failed',
        'exception': 'failed'
    };

    return statusMap[status.toLowerCase()] || 'pending';
}

function extractLastLocation(tracking: AfterShipResponse['data']['tracking']): string {
    if (!tracking.checkpoints || tracking.checkpoints.length === 0) {
        return 'Location unknown';
    }

    // Get the most recent checkpoint
    const lastCheckpoint = tracking.checkpoints[0];
    return lastCheckpoint.location || 'Location unknown';
}

function transformCheckpoints(checkpoints: AfterShipCheckpoint[]): UnifiedTrackingResponse['events'] {
    if (!Array.isArray(checkpoints)) {
        return [];
    }

    return checkpoints
        .filter((cp) => cp) // Filter out null/undefined
        .map((checkpoint) => ({
        timestamp: checkpoint.checkpoint_time || '',
        status: checkpoint.checkpoint_status || 'unknown',
        location: checkpoint.location || 'Unknown',
        message: checkpoint.message || '',
        }));
}

export async function testAfterShipConnection(): Promise<boolean> {
    try {
        console.log('🧪 Testing AfterShip connection...');
        
        const response = await fetch(
            `${API_URL}/trackings`,
            {
                method: 'GET',
                headers: {
                    'aftership-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.ok) {
            console.log('✅ AfterShip connection successful');
            return true;
        } else {
            console.error('❌ AfterShip connection failed:', response.statusText);
            return false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ AfterShip test error:', errorMessage);
        return false;
    }
}