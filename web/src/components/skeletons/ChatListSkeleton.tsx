/**
 * ChatListSkeleton — shimmer skeleton for the conversation sidebar list.
 * Used in both MessagesPage (buyer) and SellerMessages (seller).
 */

export default function ChatListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          {/* Avatar circle */}
          <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name + time row */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 bg-gray-200 rounded-full w-28" />
              <div className="h-2.5 bg-gray-100 rounded-full w-12 flex-shrink-0" />
            </div>
            {/* Last message preview */}
            <div className="h-3 bg-gray-100 rounded-full w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
