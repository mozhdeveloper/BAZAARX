import React from "react";

interface SupportChatChipProps {
  icon: React.ReactNode;
  label: string;
}

export function SupportChatChip({ icon, label }: SupportChatChipProps) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--brand-wash-gold)]/20 rounded-full text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] whitespace-nowrap transition-colors shadow-sm">
      {icon}
      {label}
    </button>
  );
}
