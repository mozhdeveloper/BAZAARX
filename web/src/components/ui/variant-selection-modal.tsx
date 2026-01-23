import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { ProductVariant } from '@/types/database.types';

interface VariantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        name: string;
        price: number;
        image: string;
        variants: ProductVariant[];
        sizes: string[];
        colors: string[];
    };
    onConfirm: (variant: ProductVariant | any, quantity: number) => void;
}

export function VariantSelectionModal({
    isOpen,
    onClose,
    product,
    onConfirm,
}: VariantSelectionModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

    // For products with separate size/color arrays (unstructured variants)
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelectedVariant(null);
            setSelectedSize(null);
            setSelectedColor(null);
        }
    }, [isOpen, product]);

    const hasVariants = product.variants && product.variants.length > 0;
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColors = product.colors && product.colors.length > 0;

    const handleIncrement = () => setQuantity((q) => q + 1);
    const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

    const handleConfirm = () => {
        if (hasVariants) {
            if (selectedVariant) {
                onConfirm(selectedVariant, quantity);
                onClose();
            }
        } else if (hasSizes || hasColors) {
            if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) {
                return; // wait for selection
            }
            // Construct a pseudo-variant object for unstructured options
            // This matches the structure expected by addToCart, or we can pass a custom object
            // The implementation plan says "Construct a result object"
            const variantObj = {
                name: [selectedSize, selectedColor].filter(Boolean).join(' / '),
                price: product.price, // Base price since unstructured options usually don't have separate prices in this schema
                id: `custom-${selectedSize || ''}-${selectedColor || ''}`, // unique key
                options: {
                    size: selectedSize,
                    color: selectedColor
                }
            };
            onConfirm(variantObj, quantity);
            onClose();
        }
    };

    const isConfirmDisabled = () => {
        if (hasVariants) return !selectedVariant;
        if (hasSizes && !selectedSize) return true;
        if (hasColors && !selectedColor) return true;
        return false;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle>Select Options</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 py-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900 line-clamp-2">
                            {product.name}
                        </h3>
                        <p className="text-lg font-bold text-[#FF5722] mt-1">
                            ₱
                            {selectedVariant
                                ? selectedVariant.price.toLocaleString()
                                : product.price.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Structured Variants */}
                    {hasVariants && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Variation</h4>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedVariant?.id === v.id
                                                ? 'border-[#FF5722] text-[#FF5722] bg-[#FF5722]/5'
                                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                            } ${v.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={v.stock === 0}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sizes (Unstructured) */}
                    {hasSizes && !hasVariants && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Size</h4>
                            <div className="flex flex-wrap gap-2">
                                {product.sizes.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedSize === size
                                                ? 'border-[#FF5722] text-[#FF5722] bg-[#FF5722]/5'
                                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Colors (Unstructured) */}
                    {hasColors && !hasVariants && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Color</h4>
                            <div className="flex flex-wrap gap-2">
                                {product.colors.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`px-3 py-1.5 text-sm rounded-md border transition-all ${selectedColor === color
                                                ? 'border-[#FF5722] text-[#FF5722] bg-[#FF5722]/5'
                                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                        <span className="text-sm font-medium text-gray-700">Quantity</span>
                        <div className="flex items-center border border-gray-200 rounded-lg">
                            <button
                                onClick={handleDecrement}
                                className="p-2 hover:bg-gray-50 text-gray-600 transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center text-sm font-medium text-gray-900">
                                {quantity}
                            </span>
                            <button
                                onClick={handleIncrement}
                                className="p-2 hover:bg-gray-50 text-gray-600 transition-colors"
                                disabled={selectedVariant ? quantity >= selectedVariant.stock : false}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 bg-[#FF5722] hover:bg-[#E64A19] text-white gap-2"
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled()}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
