// Static Philippine checkpoints for MVP
// Phase 2: Replace with real data from database

export interface Checkpoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  status: 'completed' | 'current' | 'pending';
  time?: string;
}

export interface CheckpointRoute {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  checkpoints: Checkpoint[];
}

export const STATIC_CHECKPOINTS: Record<string, CheckpointRoute> = {
  metro_manila: {
    origin: {
      lat: 14.5995,
      lng: 120.9842,
      label: 'BazaarPH Warehouse - Manila',
    },
    destination: {
      lat: 14.5564,
      lng: 121.0240,
      label: 'Your Address',
    },
    checkpoints: [
      {
        id: 'warehouse',
        label: 'BazaarPH Warehouse - Manila',
        lat: 14.5995,
        lng: 120.9842,
        status: 'completed',
        time: '10:30 AM',
      },
      {
        id: 'processing',
        label: 'Processing Center - Quezon City',
        lat: 14.676,
        lng: 121.0437,
        status: 'current',
        time: '11:15 AM',
      },
      {
        id: 'transit',
        label: 'Distribution Hub - Makati',
        lat: 14.5547,
        lng: 121.0244,
        status: 'pending',
        time: '2:45 PM',
      },
      {
        id: 'delivery',
        label: 'Your Address',
        lat: 14.5564,
        lng: 121.0240,
        status: 'pending',
        time: '4:20 PM',
      },
    ],
  },
  cebu: {
    origin: {
      lat: 10.3157,
      lng: 123.8854,
      label: 'BazaarPH Warehouse - Cebu',
    },
    destination: {
      lat: 10.3352,
      lng: 123.9087,
      label: 'Your Address - Cebu',
    },
    checkpoints: [
      {
        id: 'warehouse',
        label: 'BazaarPH Warehouse - Cebu',
        lat: 10.3157,
        lng: 123.8854,
        status: 'completed',
        time: '9:00 AM',
      },
      {
        id: 'processing',
        label: 'Processing Center - Mandaue',
        lat: 10.3237,
        lng: 123.9227,
        status: 'current',
        time: '10:30 AM',
      },
      {
        id: 'transit',
        label: 'Distribution Hub - Lapu-Lapu',
        lat: 10.3103,
        lng: 123.9492,
        status: 'pending',
        time: '1:00 PM',
      },
      {
        id: 'delivery',
        label: 'Your Address - Cebu',
        lat: 10.3352,
        lng: 123.9087,
        status: 'pending',
        time: '3:30 PM',
      },
    ],
  },
  // Default fallback route
  default: {
    origin: {
      lat: 14.5995,
      lng: 120.9842,
      label: 'Warehouse',
    },
    destination: {
      lat: 14.5564,
      lng: 121.0240,
      label: 'Your Address',
    },
    checkpoints: [
      {
        id: 'warehouse',
        label: 'Warehouse',
        lat: 14.5995,
        lng: 120.9842,
        status: 'completed',
        time: '10:30 AM',
      },
      {
        id: 'processing',
        label: 'Processing Center',
        lat: 14.676,
        lng: 121.0437,
        status: 'current',
        time: '11:15 AM',
      },
      {
        id: 'transit',
        label: 'Distribution Hub',
        lat: 14.5547,
        lng: 121.0244,
        status: 'pending',
        time: '2:45 PM',
      },
      {
        id: 'delivery',
        label: 'Your Address',
        lat: 14.5564,
        lng: 121.0240,
        status: 'pending',
        time: '4:20 PM',
      },
    ],
  },
};
