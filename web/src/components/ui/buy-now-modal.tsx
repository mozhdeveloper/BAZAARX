import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { ProductVariant } from '@/stores/buyerStore';

interface BuyNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    images?: string[];
    variants?: ProductVariant[];
    stock?: number;
    colors?: string[];
    sizes?: string[];
  };
  onConfirm: (quantity: number, variant?: ProductVariant) => void;
}

export function BuyNowModal({ isOpen, onClose, product, onConfirm }: BuyNowModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.colors?.[0] || null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes?.[0] || null
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );

  const hasVariants = product.variants && product.variants.length > 0;
  const hasColors = product.colors && product.colors.length > 0;
  const hasSizes = product.sizes && product.sizes.length > 0;

  const currentPrice = selectedVariant?.price || product.price;
  const maxStock = selectedVariant ? (selectedVariant.stock ?? 0) : (product.stock || 99);

  const handleConfirm = () => {
    onConfirm(quantity, selectedVariant || undefined);
    onClose();
  };

  const incrementQuantity = () => {
    if (quantity < maxStock) {
      setQuantity(q => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl top-[55%]" aria-describedby={undefined}>
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Buy Now - {product.name}</DialogTitle>
        <div className="relative">
          {/* Product Image */}
          <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
            <img
              src={selectedVariant?.image || product.image}
              alt={product.name}
              className="w-full h-full object-contain p-4"
            />
            {product.originalPrice && product.originalPrice > currentPrice && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100)}% OFF
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Product Info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{product.name}</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-orange-500">
                ₱{currentPrice.toLocaleString()}
              </span>
              {product.originalPrice && product.originalPrice > currentPrice && (
                <span className="text-sm text-gray-400 line-through">
                  ₱{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Variants Selection */}
          {hasVariants && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.variants!.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stock === 0}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${selectedVariant?.id === variant.id
                        ? 'bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2'
                        : variant.stock === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {variant.name}
                    {variant.stock === 0 && ' (Out of stock)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {hasColors && !hasVariants && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Color</label>
              <div className="flex flex-wrap gap-2">
                {product.colors!.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${selectedColor === color
                        ? 'bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {hasSizes && !hasVariants && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Size</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`
                      min-w-[44px] h-11 px-3 rounded-xl text-sm font-medium transition-all
                      ${selectedSize === size
                        ? 'bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">Quantity</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-semibold text-gray-900">
                  {quantity}
                </span>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= maxStock}
                  className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-gray-500">
                {maxStock} pieces available
              </span>
            </div>
          </div>

          {/* Total and Buy Button */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-xl font-bold text-orange-500">
                ₱{(currentPrice * quantity).toLocaleString()}
              </span>
            </div>
            <Button
              onClick={handleConfirm}
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
