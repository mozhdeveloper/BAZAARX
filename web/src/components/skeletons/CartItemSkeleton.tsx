import React from "react";

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 animate-pulse">
      <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex items-center gap-3 mt-2">
          <div className="h-7 bg-gray-200 rounded-lg w-24" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
