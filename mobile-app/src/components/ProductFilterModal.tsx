import { Check, ChevronRight, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import type { FilterCategory, ProductFilters } from '../types/filter.types';
import { DEFAULT_FILTERS, PRICE_RANGES, RATING_OPTIONS } from '../types/filter.types';

interface CategoryOption {
  id: string;
  name: string;
  path: string[];
  hasChildren?: boolean;
}

interface BrandOption {
  id: string;
  name: string;
}

interface ProductFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ProductFilters) => void;
  initialFilters: ProductFilters;
  availableCategories?: CategoryOption[];
  availableBrands?: BrandOption[];
}

export default function ProductFilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
  availableCategories = [],
  availableBrands = [],
}: ProductFilterModalProps) {
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [selectedFilterGroup, setSelectedFilterGroup] = useState<FilterCategory | null>(null);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // Initialize temporary price inputs when modal opens
  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setTempMinPrice(initialFilters.priceRange.min?.toString() || '');
      setTempMaxPrice(initialFilters.priceRange.max?.toString() || '');
      setSelectedFilterGroup(null);
      setBrandSearchQuery('');
    }
  }, [visible, initialFilters]);

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++;
    if (filters.minRating !== null) count++;
    if (filters.shippedFrom) count++;
    if (filters.withVouchers) count++;
    if (filters.onSale) count++;
    if (filters.freeShipping) count++;
    if (filters.preferredSeller) count++;
    if (filters.officialStore) count++;
    if (filters.selectedBrands.length > 0) count++;
    if (filters.standardDelivery || filters.sameDayDelivery || filters.cashOnDelivery || filters.pickupAvailable) count++;
    return count;
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setTempMinPrice('');
    setTempMaxPrice('');
  };

  // Apply filters
  const handleApply = () => {
    const priceRange = {
      min: tempMinPrice ? parseFloat(tempMinPrice) : null,
      max: tempMaxPrice ? parseFloat(tempMaxPrice) : null,
    };

    // Validate min <= max
    if (priceRange.min !== null && priceRange.max !== null && priceRange.min > priceRange.max) {
      alert('Minimum price cannot be greater than maximum price');
      return;
    }

    onApply({
      ...filters,
      priceRange,
    });
    onClose();
  };

  // Update specific filter
  const updateFilter = (key: keyof ProductFilters, value: any) => {
    setFilters((prev: ProductFilters) => ({ ...prev, [key]: value }));
  };

  // Toggle brand selection
  const toggleBrand = (brandName: string) => {
    setFilters((prev: ProductFilters) => {
      const brands = prev.selectedBrands.includes(brandName)
        ? prev.selectedBrands.filter((b: string) => b !== brandName)
        : [...prev.selectedBrands, brandName];
      return { ...prev, selectedBrands: brands };
    });
  };

  // Filtered brands based on search
  const filteredBrands = availableBrands.filter(brand =>
    brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

  // Render filter group header
  const renderFilterHeader = (title: string, category: FilterCategory) => (
    <TouchableOpacity
      style={styles.filterHeader}
      onPress={() => setSelectedFilterGroup(selectedFilterGroup === category ? null : category)}
    >
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterHeaderRight}>
        {selectedFilterGroup === category && (
          <Text style={styles.clearText} onPress={() => {
            setSelectedFilterGroup(null);
            // Reset this specific filter group
            switch (category) {
              case 'category':
                updateFilter('categoryId', null);
                updateFilter('categoryPath', []);
                break;
              case 'price':
                setTempMinPrice('');
                setTempMaxPrice('');
                break;
              case 'rating':
                updateFilter('minRating', null);
                break;
              case 'location':
                updateFilter('shippedFrom', null);
                break;
              case 'promo':
                updateFilter('withVouchers', false);
                updateFilter('onSale', false);
                updateFilter('freeShipping', false);
                updateFilter('preferredSeller', false);
                updateFilter('officialStore', false);
                break;
              case 'brand':
                updateFilter('selectedBrands', []);
                break;
              case 'shipping':
                updateFilter('standardDelivery', false);
                updateFilter('sameDayDelivery', false);
                updateFilter('cashOnDelivery', false);
                updateFilter('pickupAvailable', false);
                break;
            }
          }}>
            Clear
          </Text>
        )}
        <ChevronRight size={20} color={COLORS.gray400} style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );

  // Render category selection
  const renderCategorySection = () => {
    if (selectedFilterGroup !== 'category') return null;

    return (
      <View style={styles.filterContent}>
        {availableCategories.length === 0 ? (
          <Text style={styles.emptyText}>No categories available</Text>
        ) : (
          availableCategories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.optionRow,
                filters.categoryId === category.id && styles.optionRowSelected
              ]}
              onPress={() => {
                updateFilter('categoryId', category.id);
                updateFilter('categoryPath', category.path);
              }}
            >
              <Text style={[
                styles.optionText,
                filters.categoryId === category.id && styles.optionTextSelected
              ]}>
                {category.path.join(' > ')}
              </Text>
              {filters.categoryId === category.id && (
                <Check size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  // Render price range section
  const renderPriceSection = () => {
    if (selectedFilterGroup !== 'price') return null;

    return (
      <View style={styles.filterContent}>
        {/* Custom price inputs */}
        <View style={styles.priceInputRow}>
          <View style={styles.priceInputContainer}>
            <Text style={styles.priceLabel}>Min</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="₱0"
              placeholderTextColor={COLORS.gray400}
              value={tempMinPrice}
              onChangeText={setTempMinPrice}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.priceSeparator}>-</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.priceLabel}>Max</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="₱99,999+"
              placeholderTextColor={COLORS.gray400}
              value={tempMaxPrice}
              onChangeText={setTempMaxPrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Quick select ranges */}
        <Text style={styles.quickRangeTitle}>Quick Select</Text>
        <View style={styles.quickRangeGrid}>
          {PRICE_RANGES.map((range: typeof PRICE_RANGES[number]) => (
            <TouchableOpacity
              key={range.label}
              style={[
                styles.quickRangeButton,
                filters.priceRange.min === range.min && filters.priceRange.max === range.max
                  ? styles.quickRangeButtonSelected
                  : null
              ]}
              onPress={() => {
                setTempMinPrice(range.min?.toString() || '');
                setTempMaxPrice(range.max?.toString() || '');
              }}
            >
              <Text style={[
                styles.quickRangeText,
                filters.priceRange.min === range.min && filters.priceRange.max === range.max
                  ? styles.quickRangeTextSelected
                  : null
              ]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render rating section
  const renderRatingSection = () => {
    if (selectedFilterGroup !== 'rating') return null;

    return (
      <View style={styles.filterContent}>
        {RATING_OPTIONS.map((option: typeof RATING_OPTIONS[number]) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.optionRow,
              filters.minRating === option.value && styles.optionRowSelected
            ]}
            onPress={() => updateFilter('minRating', option.value)}
          >
            <Text style={[
              styles.optionText,
              filters.minRating === option.value && styles.optionTextSelected
            ]}>
              {option.label}
            </Text>
            {filters.minRating === option.value && (
              <Check size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render shipped from section
  const renderLocationSection = () => {
    if (selectedFilterGroup !== 'location') return null;

    const locationOptions = [
      { id: 'philippines', label: 'Philippines' },
      { id: 'metro_manila', label: 'Metro Manila' },
    ];

    return (
      <View style={styles.filterContent}>
        {locationOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionRow,
              filters.shippedFrom === option.id && styles.optionRowSelected
            ]}
            onPress={() => updateFilter('shippedFrom', option.id)}
          >
            <Text style={[
              styles.optionText,
              filters.shippedFrom === option.id && styles.optionTextSelected
            ]}>
              {option.label}
            </Text>
            {filters.shippedFrom === option.id && (
              <Check size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render shops & promos section
  const renderPromoSection = () => {
    if (selectedFilterGroup !== 'promo') return null;

    const promoOptions = [
      { key: 'withVouchers', label: 'With Vouchers' },
      { key: 'onSale', label: 'On Sale' },
      { key: 'freeShipping', label: 'Free Shipping' },
      { key: 'preferredSeller', label: 'Preferred Seller' },
      { key: 'officialStore', label: 'Official Store' },
    ];

    return (
      <View style={styles.filterContent}>
        {promoOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={styles.optionRow}
            onPress={() => updateFilter(option.key as keyof ProductFilters, !filters[option.key as keyof ProductFilters])}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            <View style={[
              styles.checkbox,
              filters[option.key as keyof ProductFilters] && styles.checkboxSelected
            ]}>
              {filters[option.key as keyof ProductFilters] && (
                <Check size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render brand section
  const renderBrandSection = () => {
    if (selectedFilterGroup !== 'brand') return null;

    return (
      <View style={styles.filterContent}>
        {/* Search bar */}
        <View style={styles.brandSearchContainer}>
          <Search size={18} color={COLORS.gray400} style={styles.brandSearchIcon} />
          <TextInput
            style={styles.brandSearchInput}
            placeholder="Search brands"
            placeholderTextColor={COLORS.gray400}
            value={brandSearchQuery}
            onChangeText={setBrandSearchQuery}
          />
        </View>

        {/* Brand list */}
        <ScrollView style={styles.brandList}>
          {filteredBrands.length === 0 ? (
            <Text style={styles.emptyText}>No brands found</Text>
          ) : (
            filteredBrands.map(brand => (
              <TouchableOpacity
                key={brand.id}
                style={styles.optionRow}
                onPress={() => toggleBrand(brand.name)}
              >
                <Text style={styles.optionText}>{brand.name}</Text>
                <View style={[
                  styles.checkbox,
                  filters.selectedBrands.includes(brand.name) && styles.checkboxSelected
                ]}>
                  {filters.selectedBrands.includes(brand.name) && (
                    <Check size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // Render shipping option section
  const renderShippingSection = () => {
    if (selectedFilterGroup !== 'shipping') return null;

    const shippingOptions = [
      { key: 'standardDelivery', label: 'Standard Delivery' },
      { key: 'sameDayDelivery', label: 'Same Day Delivery' },
      { key: 'cashOnDelivery', label: 'Cash on Delivery (COD)' },
      { key: 'pickupAvailable', label: 'Pickup Available' },
    ];

    return (
      <View style={styles.filterContent}>
        {shippingOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={styles.optionRow}
            onPress={() => updateFilter(option.key as keyof ProductFilters, !filters[option.key as keyof ProductFilters])}
          >
            <Text style={styles.optionText}>{option.label}</Text>
            <View style={[
              styles.checkbox,
              filters[option.key as keyof ProductFilters] && styles.checkboxSelected
            ]}>
              {filters[option.key as keyof ProductFilters] && (
                <Check size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Filter Groups */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Category */}
            {renderFilterHeader('Category', 'category')}
            {renderCategorySection()}

            {/* Price Range */}
            {renderFilterHeader('Price Range', 'price')}
            {renderPriceSection()}

            {/* Ratings */}
            {renderFilterHeader('Ratings', 'rating')}
            {renderRatingSection()}

            {/* Shipped From */}
            {renderFilterHeader('Shipped From', 'location')}
            {renderLocationSection()}

            {/* Shops & Promos */}
            {renderFilterHeader('Shops & Promos', 'promo')}
            {renderPromoSection()}

            {/* Brand */}
            {renderFilterHeader('Brand', 'brand')}
            {renderBrandSection()}

            {/* Shipping Option */}
            {renderFilterHeader('Shipping Option', 'shipping')}
            {renderShippingSection()}

            {/* Spacer for bottom buttons */}
            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.resetButton]}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>
                Apply{getActiveFilterCount() > 0 ? ` (${getActiveFilterCount()})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  filterContent: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionRowSelected: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  // Price styles
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.gray500,
    marginBottom: 6,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  priceSeparator: {
    fontSize: 18,
    color: COLORS.gray400,
    paddingBottom: 10,
  },
  quickRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  quickRangeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
  },
  quickRangeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickRangeText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  quickRangeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Brand styles
  brandSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  brandSearchIcon: {
    marginRight: 8,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  brandList: {
    maxHeight: 200,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    paddingVertical: 16,
  },
  bottomSpacer: {
    height: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
