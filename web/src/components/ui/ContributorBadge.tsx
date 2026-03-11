import React from 'react';
import type { ContributorTier } from '@/stores/commentStore';

interface ContributorBadgeProps {
  tier: ContributorTier;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<ContributorTier, { label: string; emoji: string; color: string } | null> = {
  none:   null,
  bronze: { label: 'Bronze', emoji: '🥉', color: '#92400E' },
  silver: { label: 'Silver', emoji: '🥈', color: '#475569' },
  gold:   { label: 'Gold',   emoji: '🥇', color: '#92400E' },
};

export const ContributorBadge: React.FC<ContributorBadgeProps> = ({ tier, size = 'sm' }) => {
  const config = TIER_CONFIG[tier];
  if (!config) return null;

  const sizeClass = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-0.5'
    : 'text-sm px-2 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClass}`}
      style={{
        background: tier === 'gold'   ? '#FEF3C7'
                  : tier === 'silver' ? '#F1F5F9'
                  : '#FEF9C3',
        borderColor: tier === 'gold'   ? '#F59E0B'
                   : tier === 'silver' ? '#94A3B8'
                   : '#D97706',
        color: config.color,
      }}
      title={`${config.label} Contributor`}
    >
      {config.emoji}
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
};
