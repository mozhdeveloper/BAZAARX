export interface UnifiedTrackingResponse {
    tracking_number: string;
    carrier: string;
    status: TrackingStatus;
    last_location: string;
    last_update: string;
    estimated_delivery?: string;
    events: TrackingEvent[];
}

export type TrackingStatus =
    | 'pending' 
    | 'in_transit' 
    | 'out_for_delivery' 
    | 'delivered' 
    | 'failed';

export interface TrackingEvent {
    timestamp: string;
    status: string;
    location: string;
    message: string;
}

//AFTERSHIP INTERFACES
export interface AfterShipCheckpoint {
  checkpoint_time: string;
  checkpoint_status: string;
  location: string;
  message: string;
}

export interface AfterShipTracking {
  tracking_number: string;
  slug: string;
  delivery_status: string;
  track_info?: TrackingEvent[];
  updated_at: string;
  estimated_delivery_date?: string;
  checkpoints?: AfterShipCheckpoint[];
}

export interface AfterShipResponse {
  data: {
    tracking: AfterShipTracking;
  };
}