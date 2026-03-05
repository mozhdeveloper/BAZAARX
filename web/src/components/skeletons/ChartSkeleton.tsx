import React from "react";

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-56 mb-8" />
      <div className="h-[300px] bg-gray-100 rounded-xl flex items-end gap-2 px-4 pb-4">
        {[40, 65, 50, 80, 60, 90, 75].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t-lg"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}
