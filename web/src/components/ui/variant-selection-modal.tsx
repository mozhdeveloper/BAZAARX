import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { ProductVariant } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface VariantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        name: string;
        price: number;
        image: string;
        variants: ProductVariant[];
        variantLabel1Values: string[];
        variantLabel2Values: string[];
    };
    onConfirm: (variant: ProductVariant | any, quantity: number) => void;
    buttonText?: string;
    initialSelectedVariant?: any;
    initialQuantity?: number;
}

export function VariantSelectionModal({
    isOpen,
    onClose,
    product,
    onConfirm,
    buttonText = 'Add to Cart',
    initialSelectedVariant,
    initialQuantity,
}: VariantSelectionModalProps) {
    console.log('🎨 NEW MODAL LOADED - v2.0 with separate variant sections');
    console.log('Product data:', {
        name: product.name,
        variants: product.variants,
        variantCount: product.variants?.length
    });

    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [currentImage, setCurrentImage] = useState<string>(product.image);
    const [currentPrice, setCurrentPrice] = useState<number>(product.price);
    const [currentOriginalPrice, setCurrentOriginalPrice] = useState<number | null>((product as any).originalPrice || null);
    const [currentStock, setCurrentStock] = useState<number>(0);

    const isNonEmptyString = (value: unknown): value is string =>
        typeof value === "string" && value.length > 0;

    const getVariantLabel1 = (variant: any): string | null => {
        const label =
            variant?.option_1_value ??
            variant?.variantLabel1Value ??
            variant?.size ??
            null;
        return isNonEmptyString(label) ? label : null;
    };

    const getVariantLabel2 = (variant: any): string | null => {
        const label =
            variant?.option_2_value ??
            variant?.variantLabel2Value ??
            variant?.color ??
            null;
        return isNonEmptyString(label) ? label : null;
    };

    // Extract unique colors and sizes from variants
    const hasVariants = product.variants && product.variants.length > 0;

    const uniqueColors = hasVariants
        ? Array.from(
            new Set(
                product.variants
                    .map((v) => getVariantLabel2(v))
                    .filter(isNonEmptyString),
            ),
        )
        : [];

    const uniqueSizes = hasVariants
        ? Array.from(
            new Set(
                product.variants
                    .map((v) => getVariantLabel1(v))
                    .filter(isNonEmptyString),
            ),
        )
        : [];

    const hasColorOptions = uniqueColors.length > 0;
    const hasSizeOptions = uniqueSizes.length > 0;

    console.log('📊 Modal Data:', {
        hasVariants,
        uniqueColors,
        uniqueSizes,
        selectedVariantLabel1: selectedColor,
        selectedVariantLabel2: selectedSize,
        currentImage,
        currentPrice
    });

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(initialQuantity || 1);
            setCurrentImage(product.image);
            setCurrentPrice(product.price);
            setCurrentOriginalPrice((product as any).originalPrice || null);

            // Auto-select based on initial variant if provided, otherwise first options
            if (initialSelectedVariant) {
                const label1 = getVariantLabel1(initialSelectedVariant);
                const label2 = getVariantLabel2(initialSelectedVariant);
                if (label2) setSelectedColor(label2);
                if (label1) setSelectedSize(label1);
            } else {
                if (uniqueColors.length > 0) {
                    setSelectedColor(uniqueColors[0]);
                }
                if (uniqueSizes.length > 0) {
                    setSelectedSize(uniqueSizes[0]);
                }
            }
        }
    }, [isOpen, product, initialSelectedVariant, initialQuantity]);

    // Update variant info when selection changes
    useEffect(() => {
        if (!hasVariants) return;
        if (hasColorOptions && !selectedColor) return;
        if (hasSizeOptions && !selectedSize) return;

        const matchedVariant =
            product.variants.find((v) => {
                const label1 = getVariantLabel1(v);
                const label2 = getVariantLabel2(v);
                const colorMatch = !hasColorOptions || label2 === selectedColor;
                const sizeMatch = !hasSizeOptions || label1 === selectedSize;
                return colorMatch && sizeMatch;
            }) || product.variants[0];

        console.log('🔄 Selection changed:', {
            selectedColor,
            selectedSize,
            matchedVariant,
            oldImage: currentImage,
            newImage: matchedVariant?.thumbnail_url || product.image
        });

        if (matchedVariant) {
            setCurrentPrice(matchedVariant.price);
            setCurrentOriginalPrice((matchedVariant as any).originalPrice ?? null);
            setCurrentStock(matchedVariant.stock);
            // Use variant thumbnail if available, otherwise fall back to product image
            const newImage = matchedVariant.thumbnail_url || product.image;
            setCurrentImage(newImage);
            console.log('✅ Image updated to:', newImage);

            // Reset quantity if exceeds stock
            if (quantity > matchedVariant.stock) {
                setQuantity(Math.min(1, matchedVariant.stock));
            }
        }
    }, [
        selectedColor,
        selectedSize,
        product.variants,
        hasVariants,
        hasColorOptions,
        hasSizeOptions,
    ]);

    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
    };

    const handleSizeSelect = (size: string) => {
        setSelectedSize(size);
    };

    const handleIncrement = () => {
        setQuantity(q => Math.min(q + 1, currentStock || 999));
    };

    const handleDecrement = () => {
        setQuantity(q => Math.max(1, q - 1));
    };

    const handleConfirm = () => {
        if (!hasVariants) {
            onConfirm({ price: product.price }, quantity);
            onClose();
            return;
        }

        const selectedVariant =
            product.variants.find((v) => {
                const label1 = getVariantLabel1(v);
                const label2 = getVariantLabel2(v);
                const colorMatch = !hasColorOptions || label2 === selectedColor;
                const sizeMatch = !hasSizeOptions || label1 === selectedSize;
                return colorMatch && sizeMatch;
            }) || product.variants[0];

        if (selectedVariant) {
            onConfirm(selectedVariant, quantity);
            onClose();
        }
    };

    const isDisabled =
        hasVariants &&
        ((hasColorOptions && !selectedColor) ||
            (hasSizeOptions && !selectedSize) ||
            currentStock === 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <DialogTitle className="sr-only">
                    {buttonText} - {product.name}
                </DialogTitle>
                {/* Product Image - Compact at top */}
                <div className="w-full h-64 bg-gray-50 relative flex-shrink-0">


                    <img
                        src={currentImage}
                        alt={product.name}
                        className="w-full h-full object-contain"
                    />

                </div>

                {/* Content - Scrollable */}
                <div className="p-5 space-y-3 overflow-y-auto flex-1 scrollbar-hide">
                    {/* Title and Price */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                            {product.name}
                        </h3>
                        <div className="flex items-baseline justify-between mt-1">
                            <p className="text-xl font-bold text-[var(--brand-accent)]">
                                ₱{currentPrice.toLocaleString()}
                            </p>
                            {hasVariants && currentStock > 0 && (
                                <p className="text-sm text-green-600">
                                    {currentStock} pieces available
                                </p>
                            )}
                            {hasVariants && currentStock === 0 && (
                                <p className="text-sm text-red-600 font-medium">
                                    Out of stock
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Color Selection */}
                    {uniqueColors.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold tracking-wider text-gray-900 mb-2">
                                Color: {selectedColor && <span className="ml-1 font-medium text-[var(--text-muted)]">{selectedColor}</span>}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {uniqueColors.map((color) => {
                                    // Get variant with this color to show its image
                                    const colorVariant = product.variants.find(
                                        (v) => getVariantLabel2(v) === color,
                                    );
                                    const isSelected = selectedColor === color;

                                    return (
                                        <button
                                            key={color}
                                            onClick={() => handleColorSelect(color)}
                                            className={`relative overflow-hidden rounded-lg border transition-all focus:outline-none ${isSelected
                                                ? 'border-[var(--brand-accent)]'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {colorVariant?.thumbnail_url ? (
                                                <div className="w-12 h-12">
                                                    <img
                                                        src={colorVariant.thumbnail_url}
                                                        alt={color}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                                                    isSelected ? "text-[var(--brand-accent)]" : "text-gray-900"
                                                )}>
                                                    {color}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Size Selection */}
                    {uniqueSizes.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold tracking-wider text-gray-900 mb-2">
                                Size: {selectedSize && <span className="ml-1 font-medium text-[var(--text-muted)]">{selectedSize}</span>}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {uniqueSizes.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => handleSizeSelect(size)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all focus:outline-none ${selectedSize === size
                                            ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/5 text-[var(--brand-accent)]'
                                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity & Total Row */}
                    <div className="flex items-center justify-between py-4 pb-2 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDecrement}
                                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-base transition-colors focus:outline-none"
                                disabled={quantity <= 1}
                            >
                                <Minus className="w-4 h-4 text-gray-600 hover:text-red-500" />
                            </button>
                            <span className="text-base font-semibold text-gray-900 min-w-[2rem] text-center">
                                {quantity}
                            </span>
                            <button
                                onClick={handleIncrement}
                                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-base transition-colors disabled:opacity-50 focus:outline-none"
                                disabled={quantity >= currentStock}
                            >
                                <Plus className="w-4 h-4 text-gray-600 hover:text-green-500" />
                            </button>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-[var(--price-standard)]">
                                ₱{(currentPrice * quantity).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleConfirm}
                        disabled={isDisabled}
                        className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white py-6 text-base font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {buttonText}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
