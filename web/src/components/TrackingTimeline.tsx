import type { UnifiedTrackingResponse } from '@/types/tracking';

interface Props {
  data: UnifiedTrackingResponse;
}

export default function TrackingTimeline({ data }: Props) {
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('deliver')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('transit') || statusLower.includes('way')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('fail')) return 'bg-red-100 text-red-800';
    
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.tracking_number}</h2>
            <p className="text-gray-600 mt-1">📍 {data.last_location}</p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
              data.status
            )}`}
          >
            {data.status.toUpperCase().replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Last Update</p>
            <p className="text-gray-900 mt-1">{formatDate(data.last_update)}</p>
          </div>
          {data.estimated_delivery && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Est. Delivery</p>
              <p className="text-gray-900 mt-1">{formatDate(data.estimated_delivery)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {data.events.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">📦 Delivery Timeline</h3>
          {data.events.map((event, index) => (
            <div key={index} className="flex gap-4">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                ></div>
                {index < data.events.length - 1 && (
                  <div className="w-1 h-12 bg-gray-300 my-2"></div>
                )}
              </div>

              {/* Event details */}
              <div className="flex-1 pb-4">
                <p className="font-semibold text-gray-900">{event.status}</p>
                <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                {event.message && (
                  <p className="text-sm text-gray-700 mt-2 italic">{event.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>No tracking events available yet</p>
        </div>
      )}
    </div>
  );
}
