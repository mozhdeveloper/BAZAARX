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
    },
    quantity: number
  ) => void;
  confirmLabel?: string;
  isBuyNow?: boolean;
  hideQuantity?: boolean;
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

export const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
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
}) => {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(500)).current;

  // --- Variant Logic Extraction ---

  // Helpers to safely get product variants array
  // Handle both Product and CartItem (which might have different structures)
  // Use provided variants if available, otherwise fallback to product.variants
  const variants = providedVariants || (product as any).variants || [];
  const hasStructuredVariants = variants.length > 0;

  const variantLabel1 = product.variant_label_1 || 'Color';
  const variantLabel2 = product.variant_label_2 || 'Size';

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
      ? [...new Set(variants.map((v: any) => v.option_1_value || v.color).filter(Boolean))]
      : (product.option1Values || product.colors || []);
    return parseOptions(raw);
  }, [hasStructuredVariants, variants, product.option1Values, product.colors, parseOptions]);

  const option2Values = useMemo(() => {
    const raw = hasStructuredVariants
      ? [...new Set(variants.map((v: any) => v.option_2_value || v.size).filter(Boolean))]
      : (product.option2Values || product.sizes || []);
    return parseOptions(raw);
  }, [hasStructuredVariants, variants, product.option2Values, product.sizes, parseOptions]);

  const hasOption1 = option1Values.length > 0;
  const hasOption2 = option2Values.length > 0;

  // Selection State
  const [selectedOption1, setSelectedOption1] = useState<string | null>(null);
  const [selectedOption2, setSelectedOption2] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(initialQuantity);

  // Track previous visibility to catch the opening moment
  const prevVisibleRef = useRef(visible);

  useEffect(() => {
    const wasClosed = !prevVisibleRef.current && visible;

    if (visible) {
      if (wasClosed) {
        // Only run initialization when the modal is freshly opened
        const initOp1 = initialSelectedVariant?.option1Value || initialSelectedVariant?.color || (hasOption1 ? option1Values[0] : null);
        const initOp2 = initialSelectedVariant?.option2Value || initialSelectedVariant?.size || (hasOption2 ? option2Values[0] : null);

        setSelectedOption1(initOp1);
        setSelectedOption2(initOp2);
        setQuantity(initialQuantity);
      }

      // Always animate in if visible (handles potential interrupted animations)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(500);
    }

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

      const vOption1 = normalize(v.option_1_value || v.color);
      const vOption2 = normalize(v.option_2_value || v.size);

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

  const handleConfirm = () => {
    // Validation
    if ((hasOption1 && !selectedOption1) || (hasOption2 && !selectedOption2)) {
      return;
    }

    onConfirm({
      option1Value: selectedOption1 || undefined,
      option2Value: selectedOption2 || undefined,
      variantId: activeVariantInfo.variantId,
      price: activeVariantInfo.price,
      stock: activeVariantInfo.stock,
    }, quantity);

    handleCloseInternal();
  };

  // Check if an option should be disabled based on the other selected option
  const isOptionDisabled = (type: 1 | 2, value: string) => {
    if (!hasStructuredVariants) return false;

    // Use same normalization for consistency
    const normalize = (val: any) => String(val || '').trim().toLowerCase();
    const targetVal = normalize(value);

    // If checking Option 1, we look at Selected Option 2
    if (type === 1) {
      if (hasOption2 && !selectedOption2) {
        return !variants.some((v: any) => {
          const val = v.option_1_value || v.color;
          return normalize(val) === targetVal && Number(v.stock || 0) > 0;
        });
      }

      if (!hasOption2) {
        return !variants.some((v: any) => {
          const val = v.option_1_value || v.color;
          return normalize(val) === targetVal && Number(v.stock || 0) > 0;
        });
      }

      const normSel2 = normalize(selectedOption2);
      const matchingVariant = variants.find((v: any) => {
        const v1 = v.option_1_value || v.color;
        const v2 = v.option_2_value || v.size;
        return normalize(v1) === targetVal && normalize(v2) === normSel2;
      });
      return !matchingVariant || Number(matchingVariant.stock || 0) <= 0;
    }

    // If checking Option 2, we look at Selected Option 1
    if (type === 2) {
      if (hasOption1 && !selectedOption1) {
        return !variants.some((v: any) => {
          const val = v.option_2_value || v.size;
          return normalize(val) === targetVal && Number(v.stock || 0) > 0;
        });
      }

      if (!hasOption1) {
        return !variants.some((v: any) => {
          const val = v.option_2_value || v.size;
          return normalize(val) === targetVal && Number(v.stock || 0) > 0;
        });
      }

      const normSel1 = normalize(selectedOption1);
      const matchingVariant = variants.find((v: any) => {
        const v1 = v.option_1_value || v.color;
        const v2 = v.option_2_value || v.size;
        return normalize(v1) === normSel1 && normalize(v2) === targetVal;
      });
      return !matchingVariant || Number(matchingVariant.stock || 0) <= 0;
    }

    return false;
  };

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
              <Text style={styles.modalPrice}>₱{(activeVariantInfo.price ?? 0).toLocaleString()}</Text>
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
                <Text style={styles.optionLabel}>{variantLabel1}</Text>
                <View style={styles.optionGrid}>
                  {option1Values.map((val: string, i: number) => {
                    const isColor = variantLabel1.toLowerCase() === 'color';
                    const isSelected = selectedOption1 === val;
                    const isDisabled = isOptionDisabled(1, val);

                    return (
                      <Pressable
                        key={`op1-${i}`}
                        onPress={() => !isDisabled && setSelectedOption1(val)}
                        style={[
                          styles.optionChip,
                          isColor && { backgroundColor: getColorHex(val) },
                          isSelected && styles.optionChipSelected,
                          isSelected && isColor && { borderColor: BRAND_COLOR, borderWidth: 3 },
                          isDisabled && styles.optionChipDisabled
                        ]}
                      >
                        {!isColor && (
                          <Text style={[
                            styles.optionText,
                            isSelected && { color: '#FFF' },
                            isDisabled && styles.optionTextDisabled
                          ]}>{val}</Text>
                        )}
                        {isSelected && !isColor && (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_COLOR, borderRadius: 8, zIndex: -1 }]} />
                        )}
                        {isSelected && isColor && (
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                        )}
                        {/* Optional: Add X or line-through for disabled colors if needed, usually opacity is enough */}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* OPTION 2 */}
            {hasOption2 && (
              <View style={styles.optionSection}>
                <Text style={styles.optionLabel}>{variantLabel2}</Text>
                <View style={styles.optionGrid}>
                  {option2Values.map((val: string, i: number) => {
                    const isSelected = selectedOption2 === val;
                    const isDisabled = isOptionDisabled(2, val);

                    return (
                      <Pressable
                        key={`op2-${i}`}
                        onPress={() => !isDisabled && setSelectedOption2(val)}
                        style={[
                          styles.optionChip,
                          isSelected && styles.optionChipSelected,
                          isDisabled && styles.optionChipDisabled
                        ]}
                      >
                        <Text style={[
                          styles.optionText,
                          isSelected && { color: '#FFF' },
                          isDisabled && styles.optionTextDisabled
                        ]}>{val}</Text>
                        {isSelected && (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_COLOR, borderRadius: 8, zIndex: -1 }]} />
                        )}
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
                      const maxStock = activeVariantInfo.stock ?? 99;
                      if (quantity < maxStock) {
                        setQuantity(prev => prev + 1);
                      }
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
          <Pressable
            style={[
              styles.confirmBtn,
              !isBuyNow && styles.confirmBtnOutlined,
              ((hasOption1 && !selectedOption1) || (hasOption2 && !selectedOption2)) && styles.disabledBtn
            ]}
            onPress={handleConfirm}
            disabled={(hasOption1 && !selectedOption1) || (hasOption2 && !selectedOption2)}
          >
            <Text style={[
              styles.confirmText,
              !isBuyNow && styles.confirmTextOutlined
            ]}>{confirmLabel}</Text>
          </Pressable>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
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
    marginBottom: 10,
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
    backgroundColor: '#FFF7ED',
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  qtyBtnDisabled: {
    borderColor: '#D1D5DB',
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
});
