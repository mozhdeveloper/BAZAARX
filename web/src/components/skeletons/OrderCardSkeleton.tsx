import React from "react";

export function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>
      <div className="flex gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <div className="h-8 bg-gray-200 rounded-lg w-24" />
        <div className="h-8 bg-gray-200 rounded-lg w-24" />
      </div>
    </div>
  );
}
