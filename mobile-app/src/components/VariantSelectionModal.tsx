import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartItem, Product } from '../types';
import { discountService } from '../services/discountService';
import type { ActiveDiscount } from '../types/discount';

const { width } = Dimensions.get('window');

interface VariantSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | CartItem;
  variants?: any[]; // Optional variants array override
  initialSelectedVariant?: {
    option1Value?: string;
    option2Value?: string;
    // Legacy support
    color?: string;
    size?: string;
  } | null;
  initialQuantity?: number;
  onConfirm: (
    selectedVariant: {
      option1Value?: string;
      option2Value?: string;
      variantId?: string;
      price?: number;
      stock?: number;
      image?: string | null;
    },
    quantity: number
  ) => void | Promise<void>;
  confirmLabel?: string;
  isBuyNow?: boolean;
  hideQuantity?: boolean;
  /** Pass the active campaign discount so variant prices are shown discounted */
  activeCampaignDiscount?: ActiveDiscount | null;
}

// Color hex mapping helper (copied from ProductDetailScreen for consistency)
const colorNameToHex: Record<string, string> = {
  'black': '#374151',
  'graphite black': '#374151',
  'white': '#F9FAFB',
  'pearl white': '#F9FAFB',
  'navy': '#1E3A8A',
  'deep navy': '#1E3A8A',
  'blue': '#3B82F6',
  'red': '#EF4444',
  'green': '#10B981',
  'yellow': '#F59E0B',
  'pink': '#EC4899',
  'purple': '#8B5CF6',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'silver': '#C0C0C0',
  'gold': '#D4AF37',
  'rose gold': '#B76E79',
  'bronze': '#CD7F32',
  'orange': '#F97316',
  'brown': '#92400E',
  'beige': '#F5F5DC',
  'cream': '#FFFDD0',
};

const getColorHex = (colorName: string): string => {
  const normalized = colorName.toLowerCase().trim();
  return colorNameToHex[normalized] || '#6B7280';
};

export const VariantSelectionModal: React.FC<VariantSelectionModalProps> = React.memo(({
  visible,
  onClose,
  product,
  variants: providedVariants,
  initialSelectedVariant,
  initialQuantity = 1,
  onConfirm,
  confirmLabel = 'Confirm',
  isBuyNow = false,
  hideQuantity = false,
  activeCampaignDiscount = null,
}) => {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(500)).current;

  // --- Variant Logic Extraction ---
  // Skip heavy computation when modal is not visible
  const variants = providedVariants || (product as any).variants || [];
  const hasStructuredVariants = visible ? variants.length > 0 : false;

  // ─── Refined Variant Logic (Align with Web) ───

  const parseOptions = useCallback((opts: any) => {
    const raw = typeof opts === 'string' ? JSON.parse(opts) : opts;
    if (!Array.isArray(raw)) return [];

    // Dedupe with case-insensitivity
    const seen = new Set();
    return raw.reduce((acc: string[], curr: any) => {
      if (curr && typeof curr === 'string' && curr.trim() !== '') {
        const normalized = curr.trim().toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          acc.push(curr.trim());
        }
      }
      return acc;
    }, []);
  }, []);

  const option1Values = useMemo(() => {
    const raw = hasStructuredVariants
      ? [...new Set(variants.map((v: any) => v.option_1_value || v.size).filter(Boolean))]
      : (product.option1Values || product.colors || []);
    return parseOptions(raw);
  }, [hasStructuredVariants, variants, product, parseOptions]);

  const option2Values = useMemo(() => {
    const raw = hasStructuredVariants
      ? [...new Set(variants.map((v: any) => v.option_2_value || v.color).filter(Boolean))]
      : (product.option2Values || product.sizes || []);
    return parseOptions(raw);
  }, [hasStructuredVariants, variants, product, parseOptions]);

  const variantLabel1 = ((product as any).variant_label_1 || (product as any).selectedVariant?.option1Label || '').trim();
  const variantLabel2 = ((product as any).variant_label_2 || (product as any).selectedVariant?.option2Label || '').trim();
  const hasLegacySizeAxis1 = hasStructuredVariants && variants.some((v: any) => !v.option_1_value && !!v.size);
  const hasLegacyColorAxis2 = hasStructuredVariants && variants.some((v: any) => !v.option_2_value && !!v.color);

  // Check if axis 1 and 2 are effectively identical (redundant case)
  const isRedundant = useMemo(() => {
    if (option1Values.length === 0 || option2Values.length === 0) return false;
    if (option1Values.length !== option2Values.length) return false;
    const s1 = [...option1Values].sort().join('|').toLowerCase();
    const s2 = [...option2Values].sort().join('|').toLowerCase();
    return s1 === s2;
  }, [option1Values, option2Values]);

  // If redundant, we suppress the second axis
  const hasOption1 = option1Values.length > 0;
  const hasOption2 = option2Values.length > 0 && !isRedundant;

  const finalVariantLabel1 = variantLabel1 || (hasLegacySizeAxis1 ? 'Size' : 'Option 1');
  const finalVariantLabel2 = variantLabel2 || (hasLegacyColorAxis2 ? 'Color' : 'Option 2');

  // Selection State
  const [selectedOption1, setSelectedOption1] = useState<string | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(initialQuantity);

  const handleSelectOption1 = (value: string) => {
    if (selectedOption1 !== value) {
      setSelectedOption1(value);
    }
  };

  const handleSelectOption2 = (value: string) => {
    if (selectedOption2 !== value) {
      setSelectedOption2(value);
    }
  };

  // Track previous visibility to catch the opening moment
  const prevVisibleRef = useRef(visible);

  useEffect(() => {
    if (visible) {
      if (!prevVisibleRef.current) {
        // Reset to initial state ONLY on fresh open
        fadeAnim.setValue(0);
        slideAnim.setValue(500);

        const initOp1 = initialSelectedVariant?.option1Value || initialSelectedVariant?.color || (hasOption1 ? option1Values[0] : null);
        const initOp2 = initialSelectedVariant?.option2Value || initialSelectedVariant?.size || (hasOption2 ? option2Values[0] : null);

        setSelectedOption1(initOp1);
        setSelectedOption2(initOp2);
        setQuantity(initialQuantity);
        setIsConfirming(false);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }
    // DO NOT reset immediately on false, let handleCloseInternal handle it
    // If it was closed by prop from outside, content will just vanish because Modal is hidden

    prevVisibleRef.current = visible;
  }, [visible, initialSelectedVariant, initialQuantity, hasOption1, hasOption2]);

  const handleCloseInternal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  // Compute Active Variant Info (Price, Stock, Image)
  const activeVariantInfo = useMemo(() => {
    // If no real variants, fallback to product info
    if (!hasStructuredVariants) {
      return {
        price: product.price,
        stock: product.stock,
        image: product.image,
        variantId: undefined
      };
    }

    const normalize = (val: any) => String(val || '').trim().toLowerCase();

    const matched = variants.find((v: any) => {
      const targetOp1 = normalize(selectedOption1);
      const targetOp2 = normalize(selectedOption2);

      const vOption1 = normalize(v.option_1_value || v.size);
      const vOption2 = normalize(v.option_2_value || v.color);

      const op1Match = !selectedOption1 || vOption1 === targetOp1;
      const op2Match = !selectedOption2 || vOption2 === targetOp2;
      return op1Match && op2Match;
    });

    return {
      price: matched?.price ?? product.price,
      stock: matched?.stock ?? product.stock,
      image: matched?.thumbnail_url || matched?.image || product.image,
      variantId: matched?.id,
    };
  }, [hasStructuredVariants, variants, selectedOption1, selectedOption2, product]);

  useEffect(() => {
    const maxStock = Math.max(1, Number(activeVariantInfo.stock ?? 1));
    setQuantity((prev) => Math.max(1, Math.min(prev, maxStock)));
  }, [activeVariantInfo.stock]);

  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    // Block if seller is on vacation
    if ((product as any).is_vacation_mode) {
      return;
    }

    // Validation
    if ((hasOption1 && !selectedOption1) || (hasOption2 && !selectedOption2)) {
      return;
    }

    // Prevent double-tap
    if (isConfirming) return;
    setIsConfirming(true);

    // Close modal immediately, then notify parent
    handleCloseInternal();

    // Fire-and-forget — parent handles async work + loading overlay
    onConfirm({
      option1Value: selectedOption1 || undefined,
      option2Value: selectedOption2 || undefined,
      variantId: activeVariantInfo.variantId,
      price: activeVariantInfo.price,
      stock: activeVariantInfo.stock,
      image: activeVariantInfo.image || null,
    }, quantity);
  };

  // Pre-compute disabled states for all options to avoid per-chip .find() calls
  const disabledOption1Map = useMemo(() => {
    if (!hasStructuredVariants) return new Map<string, boolean>();
    const normalize = (val: any) => String(val || '').trim().toLowerCase();
    const map = new Map<string, boolean>();
    for (const val of option1Values) {
      const targetVal = normalize(val);
      if (hasOption2 && selectedOption2) {
        const normSel2 = normalize(selectedOption2);
        const matchingVariant = variants.find((v: any) => {
          const v1 = v.option_1_value || v.size;
          const v2 = v.option_2_value || v.color;
          return normalize(v1) === targetVal && normalize(v2) === normSel2;
        });
        map.set(val, !matchingVariant || Number(matchingVariant.stock || 0) <= 0);
      } else {
        const hasStock = variants.some((v: any) => {
          const v1 = v.option_1_value || v.size;
          return normalize(v1) === targetVal && Number(v.stock || 0) > 0;
        });
        map.set(val, !hasStock);
      }
    }
    return map;
  }, [hasStructuredVariants, variants, option1Values, hasOption2, selectedOption2]);

  const disabledOption2Map = useMemo(() => {
    if (!hasStructuredVariants) return new Map<string, boolean>();
    const normalize = (val: any) => String(val || '').trim().toLowerCase();
    const map = new Map<string, boolean>();
    for (const val of option2Values) {
      const targetVal = normalize(val);
      if (hasOption1 && selectedOption1) {
        const normSel1 = normalize(selectedOption1);
        const matchingVariant = variants.find((v: any) => {
          const v1 = v.option_1_value || v.size;
          const v2 = v.option_2_value || v.color;
          return normalize(v1) === normSel1 && normalize(v2) === targetVal;
        });
        map.set(val, !matchingVariant || Number(matchingVariant.stock || 0) <= 0);
      } else {
        const hasStock = variants.some((v: any) => {
          const v2 = v.option_2_value || v.color;
          return normalize(v2) === targetVal && Number(v.stock || 0) > 0;
        });
        map.set(val, !hasStock);
      }
    }
    return map;
  }, [hasStructuredVariants, variants, option2Values, hasOption1, selectedOption1]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleCloseInternal}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1 }}>
        {/* OVERLAY - FADES SEPARATELY */}
        <TouchableWithoutFeedback onPress={handleCloseInternal}>
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* CONTENT - SLIDES SEPARATELY */}
        <Animated.View style={[
          styles.modalContent,
          {
            paddingBottom: insets.bottom + 20,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{ translateY: slideAnim }]
          }
        ]}>

          {/* HEADER */}
          <View style={styles.modalHeader}>
            <Image
              source={{ uri: activeVariantInfo.image }}
              style={styles.modalImage}
              resizeMode="cover"
            />
            <View style={styles.modalInfo}>
              {(() => {
                const rawPrice = activeVariantInfo.price ?? 0;
                if (!activeCampaignDiscount || rawPrice === 0) {
                  return (
                    <Text style={styles.modalPrice}>₱{rawPrice.toLocaleString()}</Text>
                  );
                }
                const discounted = discountService.calculateLineDiscount(rawPrice, 1, activeCampaignDiscount).discountedUnitPrice;
                const hasDiscount = discounted < rawPrice;
                return hasDiscount ? (
                  <View>
                    <Text style={[styles.modalPrice, { color: '#DC2626' }]}>₱{discounted.toLocaleString()}</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '600' }}>
                      ₱{rawPrice.toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.modalPrice}>₱{discounted.toLocaleString()}</Text>
                );
              })()}
              <Text style={[styles.modalStock, { color: Number(activeVariantInfo.stock || 0) <= 0 ? '#DC2626' : '#10B981' }]}>
                {Number(activeVariantInfo.stock || 0) <= 0 ? 'Out of Stock' : `In Stock: ${activeVariantInfo.stock}`}
              </Text>
              <Text style={styles.modalSelections} numberOfLines={1}>
                {[selectedOption1, selectedOption2].filter(Boolean).join(', ') || 'Select variants'}
              </Text>
            </View>
            <Pressable onPress={handleCloseInternal} style={styles.closeBtn}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* OPTION 1 */}
            {hasOption1 && (
              <View style={styles.optionSection}>
                <View style={styles.optionLabelRow}>
                  <Text style={styles.optionLabel}>{finalVariantLabel1}</Text>
                  {selectedOption1 && (
                    <Text style={styles.optionLabelValue}> {selectedOption1}</Text>
                  )}
                </View>
                <View style={styles.optionGrid}>
                  {option1Values.map((val: string, i: number) => {
                    const isSelected = selectedOption1 === val;
                    const isDisabled = disabledOption1Map.get(val) ?? false;

                    return (
                      <Pressable
                        key={`op1-${i}`}
                        onPress={() => !isDisabled && handleSelectOption1(val)}
                        style={[
                          styles.optionChip,
                          isSelected && styles.optionChipSelected,
                          isDisabled && styles.optionChipDisabled,
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          isSelected && { color: '#FFF' },
                          isDisabled && styles.optionTextDisabled,
                        ]}>{val}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* OPTION 2 */}
            {hasOption2 && (
              <View style={styles.optionSection}>
                <View style={styles.optionLabelRow}>
                  <Text style={styles.optionLabel}>{finalVariantLabel2}</Text>
                  {selectedOption2 && (
                    <Text style={styles.optionLabelValue}> {selectedOption2}</Text>
                  )}
                </View>
                <View style={styles.optionGrid}>
                  {option2Values.map((val: string, i: number) => {
                    const isSelected = selectedOption2 === val;
                    const isDisabled = disabledOption2Map.get(val) ?? false;

                    return (
                      <Pressable
                        key={`op2-${i}`}
                        onPress={() => !isDisabled && handleSelectOption2(val)}
                        style={[
                          styles.optionChip,
                          isSelected && styles.optionChipSelected,
                          isDisabled && styles.optionChipDisabled,
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          isSelected && { color: '#FFF' },
                          isDisabled && styles.optionTextDisabled,
                        ]}>{val}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* QUANTITY */}
            {!hideQuantity && (
              <View style={styles.qtyContainer}>
                <Text style={[styles.optionLabel, { marginBottom: 0 }]}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                    onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
                  >
                    <Minus size={20} color={quantity <= 1 ? '#D1D5DB' : BRAND_COLOR} />
                  </Pressable>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Pressable
                    style={[
                      styles.qtyBtn,
                      quantity >= (activeVariantInfo.stock ?? 99) && styles.qtyBtnDisabled
                    ]}
                    onPress={() => {
                      const maxStock = Math.max(1, Number(activeVariantInfo.stock ?? 99));
                      setQuantity(prev => Math.min(maxStock, prev + 1));
                    }}
                  >
                    <Plus
                      size={20}
                      color={quantity >= (activeVariantInfo.stock ?? 99) ? '#D1D5DB' : BRAND_COLOR}
                    />
                  </Pressable>
                </View>
              </View>
            )}

          </ScrollView>

          {/* ACTION BTN */}
          {(() => {
            const isVacationMode = (product as any).is_vacation_mode;
            const isSelectionValid = (hasOption1 ? !!selectedOption1 : true) && (hasOption2 ? !!selectedOption2 : true);
            const isOutOfStock = Number(activeVariantInfo.stock || 0) <= 0;
            const canConfirm = !isVacationMode && isSelectionValid && !isOutOfStock && !isConfirming;
            return (
              <Pressable
                style={[
                  styles.confirmBtn,
                  canConfirm
                    ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                    : { backgroundColor: COLORS.background, borderColor: COLORS.gray300, borderWidth: 1 }
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm}
              >
                <Text style={[
                  styles.confirmText,
                  canConfirm ? { color: '#FFF' } : { color: COLORS.gray400 }
                ]}>
                  {isVacationMode ? 'Store on Vacation' : isOutOfStock ? 'Out of Stock' : confirmLabel}
                </Text>
              </Pressable>
            );
          })()}

        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    gap: 16,
  },
  modalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  modalStock: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSelections: {
    fontSize: 13,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 400,
  },
  optionSection: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 0,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    minWidth: 40,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.3,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    minWidth: 24,
    textAlign: 'center',
  },
  confirmBtn: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  confirmBtnOutlined: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.primary,
  },
  disabledBtn: {
    backgroundColor: '#D1D5DB',
    borderColor: 'transparent',
  },
  confirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmTextOutlined: {
    color: COLORS.primary,
  },
  optionChipDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  optionTextDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionLabelValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  colorCheck: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorChipDisabledLine: {
    position: 'absolute',
    width: '120%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    transform: [{ rotate: '-45deg' }],
  },
});
