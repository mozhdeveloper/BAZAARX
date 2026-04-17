/**
 * ShippingMethodPicker.tsx
 *
 * BX-09-002 — Compact, expandable picker for shipping methods per seller group.
 * Renders inside CheckoutScreen's seller section.
 *
 * States:
 *  - Loading: shimmer placeholder
 *  - Error: red card with message
 *  - No options: gray card
 *  - Single method: auto-selected, no expand
 *  - Multiple methods: collapsed by default, tap to expand
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Check, ChevronDown, ChevronUp, Truck, AlertCircle, AlertTriangle } from 'lucide-react-native';
import type { ShippingMethodOption } from '@/services/shippingService';
import type { ShippingMethod } from '@/services/shippingService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ShippingMethodPickerProps {
  methods: ShippingMethodOption[];
  selectedMethod: ShippingMethod | null;
  onSelectMethod: (method: ShippingMethod) => void;
  isLoading: boolean;
  error: string | null;
  /** Non-blocking warning (e.g. seller missing shipping origin) */
  warning?: string | null;
  /** Called when user taps "Retry" on error state */
  onRetry?: () => void;
}

export default function ShippingMethodPicker({
  methods,
  selectedMethod,
  onSelectMethod,
  isLoading,
  error,
  warning,
  onRetry,
}: ShippingMethodPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse when methods change (e.g., address change triggers recalc)
  useEffect(() => {
    setIsExpanded(false);
  }, [methods]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.shimmerRow}>
          <View style={styles.shimmerBar} />
          <View style={[styles.shimmerBar, { width: '60%', marginTop: 4 }]} />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // No options
  if (methods.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyText}>No shipping options available for this route</Text>
      </View>
    );
  }

  // Resolve active method
  const active = methods.find(m => m.method === selectedMethod) || methods[0];
  const alternatives = methods.filter(m => m.method !== active.method);
  const hasAlternatives = alternatives.length > 0;

  return (
    <View style={styles.container}>
      {/* Always-visible selected method row */}
      <Pressable
        onPress={hasAlternatives ? toggleExpand : undefined}
        style={({ pressed }) => [
          styles.methodRow,
          styles.selectedRow,
          pressed && hasAlternatives && { opacity: 0.85 },
        ]}
      >
        <View style={styles.methodInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Truck size={14} color="#16A34A" />
            <Text style={styles.methodLabel}>{active.label}</Text>
          </View>
          <Text style={styles.methodDetails}>
            {active.fee === 0 ? 'FREE' : `₱${active.fee.toLocaleString()}`}
            {' · '}
            {active.estimatedDays}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Check size={16} color="#16A34A" />
          {hasAlternatives && (
            isExpanded
              ? <ChevronUp size={14} color="#9CA3AF" />
              : <ChevronDown size={14} color="#9CA3AF" />
          )}
        </View>
      </Pressable>

      {/* More options hint */}
      {hasAlternatives && !isExpanded && (
        <Pressable onPress={toggleExpand} style={styles.moreHint}>
          <Text style={styles.moreHintText}>
            {alternatives.length} more option{alternatives.length > 1 ? 's' : ''} available
          </Text>
        </Pressable>
      )}

      {/* Expandable alternative methods */}
      {isExpanded && alternatives.map(m => (
        <Pressable
          key={m.method}
          onPress={() => {
            onSelectMethod(m.method);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsExpanded(false);
          }}
          style={({ pressed }) => [
            styles.methodRow,
            styles.alternativeRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.methodInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Truck size={14} color="#6B7280" />
              <Text style={[styles.methodLabel, { color: '#374151' }]}>{m.label}</Text>
            </View>
            <Text style={styles.methodDetails}>
              {m.fee === 0 ? 'FREE' : `₱${m.fee.toLocaleString()}`}
              {' · '}
              {m.estimatedDays}
            </Text>
          </View>
          <View style={styles.radioOuter}>
            <View style={styles.radioInner} />
          </View>
        </Pressable>
      ))}

      {/* Soft warning banner (e.g. seller missing origin) */}
      {warning && (
        <View style={styles.warningContainer}>
          <AlertTriangle size={13} color="#92400E" />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  shimmerRow: {
    padding: 12,
    gap: 4,
  },
  shimmerBar: {
    height: 12,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    width: '80%',
  },
  errorContainer: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    padding: 10,
  },
  emptyContainer: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    padding: 12,
    textAlign: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedRow: {
    backgroundColor: '#F0FFF4',
  },
  alternativeRow: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  methodDetails: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 20, // align with label (icon width + gap)
  },
  moreHint: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  moreHintText: {
    fontSize: 11,
    color: '#6366F1',
    textAlign: 'center',
    fontWeight: '500',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 0,
    height: 0,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
});
