import React from "react";

interface SupportServiceCardProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function SupportServiceCard({
  icon,
  label,
  onClick,
}: SupportServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 group transition-all p-3 rounded-xl hover:bg-gray-50"
    >
      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-transparent group-hover:border-[#FF4500]/20 group-hover:bg-[#FF4500]/10 transition-colors">
        <div className="text-[#FF4500]">{icon}</div>
      </div>
      <span className="text-[11px] font-medium text-center text-gray-600 group-hover:text-[#FF4500]">
        {label}
      </span>
    </button>
  );
}
