import { useState } from 'react';
import { useNinjaVanTracking } from '@/hooks/useNinjaVanTracking';
import TrackingTimeline from './TrackingTimeline';

export default function TrackingForm() {
  const [input, setInput] = useState('');
  const { tracking, loading, error, fetchTracking } = useNinjaVanTracking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchTracking(input);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter Ninja Van tracking number (e.g., NV123456789)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                Tracking...
              </>
            ) : (
              'Track'
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">❌ Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Success - Show Timeline */}
      {tracking && !error && (
        <>
          <TrackingTimeline data={tracking} />
        </>
      )}

      {/* Empty State */}
      {!tracking && !error && !loading && (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg">🔍 Enter a tracking number to get started</p>
          <p className="text-sm mt-2">Example: NV123456789</p>
        </div>
      )}
    </div>
  );
}
