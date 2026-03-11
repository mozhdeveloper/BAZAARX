import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ContributorTier } from '@/stores/commentStore';

interface ContributorBadgeProps {
  tier: ContributorTier;
  size?: 'sm' | 'md';
}

export const ContributorBadge: React.FC<ContributorBadgeProps> = ({ tier, size = 'sm' }) => {
  if (tier === 'none') return null;

  const config = {
    bronze: { label: '🥉 Bronze', bg: '#FEF3C7', text: '#92400E' },
    silver: { label: '🥈 Silver', bg: '#F1F5F9', text: '#475569' },
    gold:   { label: '🥇 Gold',   bg: '#FEF3C7', text: '#B45309' },
  }[tier];

  const fontSize = size === 'md' ? 12 : 10;
  const paddingH = size === 'md' ? 8 : 6;
  const paddingV = size === 'md' ? 4 : 2;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, paddingHorizontal: paddingH, paddingVertical: paddingV },
      ]}
    >
      <Text style={[styles.text, { color: config.text, fontSize }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
