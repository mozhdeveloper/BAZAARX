/**
 * Audit log panel for a product request (admin only).
 * BX-07-023, BX-07-036.
 */
import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { productRequestService, type RequestAuditEntry } from '@/services/productRequestService';
import { format } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  approve: 'bg-green-100 text-green-800',
  reject:  'bg-red-100 text-red-800',
  hold:    'bg-amber-100 text-amber-800',
  resolve: 'bg-blue-100 text-blue-800',
  merge:   'bg-purple-100 text-purple-800',
  link_product: 'bg-cyan-100 text-cyan-800',
  stage_change: 'bg-gray-100 text-gray-800',
  convert: 'bg-amber-200 text-amber-900',
};

export function RequestAuditLog({ requestId, refreshKey = 0 }: { requestId: string; refreshKey?: number }) {
  const [entries, setEntries] = useState<RequestAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    productRequestService.getAuditLog(requestId).then((rows) => {
      setEntries(rows); setLoading(false);
    });
  }, [requestId, refreshKey]);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3">Activity Log</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">No actions taken yet</p>
      ) : (
        <ScrollArea className="max-h-72">
          <ol className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="border-l-2 border-gray-200 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[e.action] || 'bg-gray-100 text-gray-700'}`}>
                    {e.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">{format(e.createdAt, 'MMM d, h:mm a')}</span>
                </div>
                {e.details?.reason && <p className="text-sm text-gray-700">{e.details.reason}</p>}
                {e.details?.prev_status && e.details?.new_status && (
                  <p className="text-xs text-gray-500">
                    {e.details.prev_status} → <strong>{e.details.new_status}</strong>
                  </p>
                )}
                {e.details?.target_id && (
                  <p className="text-xs text-gray-500 font-mono break-all">target: {e.details.target_id}</p>
                )}
              </li>
            ))}
          </ol>
        </ScrollArea>
      )}
    </div>
  );
}
