import React from "react";

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-square bg-gray-200" />
      {/* Text */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}
