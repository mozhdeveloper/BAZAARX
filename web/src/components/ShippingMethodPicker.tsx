/**
 * ShippingMethodPicker.tsx
 *
 * BX-09-002 — Web version of shipping method picker for selecting per-seller shipping options.
 * Renders inside checkout's seller group section.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, AlertCircle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { ShippingMethodOption } from '@/types/shipping.types';

interface ShippingMethodPickerProps {
  methods: ShippingMethodOption[];
  selectedMethod: string | null; // Changed: method code (e.g. 'standard'), not the full object
  onSelectMethod: (methodCode: string) => void; // Changed: pass method code to parent
  isLoading: boolean;
  error: string | null;
  warning?: string | null;
  onRetry?: () => void;
}

export function ShippingMethodPicker({
  methods,
  selectedMethod,
  onSelectMethod,
  isLoading,
  error,
  warning,
  onRetry,
}: ShippingMethodPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // No options
  if (methods.length === 0) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">No shipping options available for this route</p>
      </div>
    );
  }

  // Find active method by code, fallback to first method
  const active = methods.find(m => m.method === selectedMethod) || methods[0];
  const alternatives = methods.filter(m => m.method !== active.method);
  const hasAlternatives = alternatives.length > 0;

  return (
    <div className="space-y-2">
      {/* Main selected method */}
      <button
        type="button"
        onClick={() => hasAlternatives && setIsExpanded(!isExpanded)}
        disabled={!hasAlternatives}
        className="w-full text-left border-2 border-green-200 bg-green-50 rounded-lg p-4 hover:border-green-300 transition-colors disabled:hover:border-green-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Truck size={16} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">{active.label}</p>
              <p className="text-sm text-gray-600">
                {active.fee === 0 ? 'FREE' : `₱${active.fee.toLocaleString()}`}
                {' · '}
                {active.estimatedDays}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} className="text-green-600" />
            {hasAlternatives && (
              isExpanded
                ? <ChevronUp size={16} className="text-gray-400" />
                : <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {/* More options hint */}
      {hasAlternatives && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium"
        >
          {alternatives.length} more option{alternatives.length > 1 ? 's' : ''} available
        </button>
      )}

      {/* Alternative options */}
      <AnimatePresence>
        {isExpanded && hasAlternatives && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {alternatives.map((method) => (
              <motion.button
                type="button"
                key={method.method}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => {
                  onSelectMethod(method.method);
                  setIsExpanded(false);
                }}
                className="w-full text-left border border-gray-200 bg-white rounded-lg p-4 hover:border-brand-primary hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Truck size={16} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{method.label}</p>
                      <p className="text-sm text-gray-600">
                        {method.fee === 0 ? 'FREE' : `₱${method.fee.toLocaleString()}`}
                        {' · '}
                        {method.estimatedDays}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning (non-blocking) */}
      {warning && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">{warning}</p>
        </div>
      )}
    </div>
  );
}
