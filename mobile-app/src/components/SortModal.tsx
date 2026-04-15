import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import type { SortOption } from '../types/filter.types';
import { COLORS } from '../constants/theme';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (sortOption: SortOption) => void;
  selectedSort: SortOption;
}

const SORT_OPTIONS: { value: SortOption; label: string; description: string }[] = [
  { value: 'relevance', label: 'Relevance', description: 'Most relevant to your search' },
  { value: 'price-low', label: 'Price: Low to High', description: 'Cheapest first' },
  { value: 'price-high', label: 'Price: High to Low', description: 'Most expensive first' },
  { value: 'rating-high', label: 'Rating: High to Low', description: 'Highest rated first' },
  { value: 'newest', label: 'Newest First', description: 'Recently added products' },
  { value: 'best-selling', label: 'Best Selling', description: 'Most popular products' },
];

export default function SortModal({
  visible,
  onClose,
  onSelect,
  selectedSort,
}: SortModalProps) {
  const [currentSort, setCurrentSort] = useState<SortOption>(selectedSort);

  useEffect(() => {
    if (visible) {
      setCurrentSort(selectedSort);
    }
  }, [visible, selectedSort]);

  const handleSelect = (option: SortOption) => {
    setCurrentSort(option);
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sort By</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Sort Options */}
          <View style={styles.optionsContainer}>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionRow,
                  currentSort === option.value && styles.optionRowSelected
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    currentSort === option.value && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {currentSort === option.value && (
                  <Check size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionRowSelected: {
    backgroundColor: '#F9FAFB',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.gray500,
  },
});
