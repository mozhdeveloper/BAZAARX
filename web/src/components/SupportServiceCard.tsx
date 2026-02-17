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
      className="flex flex-col items-center gap-3 group transition-all p-3 rounded-xl hover:bg-[var(--brand-wash)]"
    >
      <div className="w-14 h-14 bg-[var(--brand-wash)] rounded-2xl flex items-center justify-center border border-transparent group-hover:border-[var(--brand-primary)]/20 group-hover:bg-[var(--brand-primary)]/10 transition-colors">
        <div className="text-[var(--brand-primary)]">{icon}</div>
      </div>
      <span className="text-[11px] font-medium text-center text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]">
        {label}
      </span>
    </button>
  );
}
