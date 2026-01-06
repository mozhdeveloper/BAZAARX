import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

interface BadgePillProps {
  text: string;
  variant?: 'verified' | 'seller' | 'item' | 'success';
  icon?: boolean;
}

export const BadgePill: React.FC<BadgePillProps> = ({ 
  text, 
  variant = 'verified',
  icon = true 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'verified':
        return {
          container: styles.verifiedContainer,
          text: styles.verifiedText,
          iconColor: '#2563EB',
        };
      case 'seller':
        return {
          container: styles.sellerContainer,
          text: styles.sellerText,
          iconColor: '#2563EB',
        };
      case 'item':
        return {
          container: styles.itemContainer,
          text: styles.itemText,
          iconColor: '#FF6A00',
        };
      case 'success':
        return {
          container: styles.successContainer,
          text: styles.successText,
          iconColor: '#22C55E',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View style={[styles.container, variantStyles.container]}>
      {icon && <Check size={12} color={variantStyles.iconColor} />}
      <Text style={[styles.text, variantStyles.text]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifiedText: {
    color: '#2563EB',
  },
  sellerContainer: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  sellerText: {
    color: '#0284C7',
  },
  itemContainer: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  itemText: {
    color: '#FF6A00',
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successText: {
    color: '#16A34A',
  },
});
