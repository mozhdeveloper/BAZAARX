import React from "react";

interface SupportChatChipProps {
  icon: React.ReactNode;
  label: string;
}

export function SupportChatChip({ icon, label }: SupportChatChipProps) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#FF4500] hover:text-[#FF4500] whitespace-nowrap transition-colors shadow-sm">
      {icon}
      {label}
    </button>
  );
}
