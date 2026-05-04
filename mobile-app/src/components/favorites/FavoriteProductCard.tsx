import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Trash2, ShoppingCart } from 'lucide-react-native';
import { safeImageUri, PLACEHOLDER_PRODUCT } from '../../utils/imageUtils';
import { COLORS } from '../../constants/theme';

interface FavoriteProductCardProps {
    product: any;
    discount?: any;
    onRemove: () => void;
    onPress: () => void;
    onAddToCart: (quantity: number) => void;
    isInCart?: boolean;
}

export const FavoriteProductCard: React.FC<FavoriteProductCardProps> = ({ 
    product, 
    discount, 
    onRemove, 
    onPress,
    onAddToCart,
    isInCart = false
}) => {
    const [quantity, setQuantity] = React.useState(1);
    const basePrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0));
    
    // Calculate discounted price
    let regularPrice = basePrice;
    let originalPrice = basePrice;
    let hasDiscount = false;
    let discountPercent = 0;

    if (discount) {
        hasDiscount = true;
        regularPrice = discount.discountedPrice;
        originalPrice = discount.originalPrice || basePrice;
        if (originalPrice > regularPrice) {
            discountPercent = Math.round(((originalPrice - regularPrice) / originalPrice) * 100);
        }
    }
    
    const handleAddToCart = (e: any) => {
        e.stopPropagation();
        onAddToCart(quantity);
    };

    const incrementQty = (e: any) => {
        e.stopPropagation();
        setQuantity(prev => Math.min(prev + 1, product.stock || 99));
    };

    const decrementQty = (e: any) => {
        e.stopPropagation();
        setQuantity(prev => Math.max(1, prev - 1));
    };

    return (
        <Pressable 
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed
            ]}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: safeImageUri(product?.images?.[0]?.image_url || product?.primary_image || product?.image, PLACEHOLDER_PRODUCT) }}
                    style={styles.image}
                    contentFit="cover"
                />
            </View>
            
            <View style={styles.infoContainer}>
                <View>
                    <Text style={styles.name} numberOfLines={2}>
                        {product.name}
                    </Text>
                    <Text style={styles.sellerName}>
                        {product.seller?.store_name || 'Verified Seller'}
                    </Text>
                </View>

                <View style={styles.priceContainer}>
                    {hasDiscount ? (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={[styles.price, { color: '#DC2626' }]}>
                                    ₱{regularPrice.toLocaleString()}
                                </Text>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>-{discountPercent}%</Text>
                                </View>
                            </View>
                            <Text style={styles.originalPrice}>
                                ₱{originalPrice.toLocaleString()}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.price}>
                            ₱{regularPrice.toLocaleString()}
                        </Text>
                    )}
                </View>
                
                <View style={styles.actions}>
                    <View style={styles.quantityContainer}>
                        <Pressable onPress={decrementQty} style={styles.qtyBtn}>
                            <Text style={styles.qtyBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <Pressable onPress={incrementQty} style={styles.qtyBtn}>
                            <Text style={styles.qtyBtnText}>+</Text>
                        </Pressable>
                    </View>

                    <View style={styles.rightActions}>
                        <Pressable 
                            onPress={onRemove}
                            style={styles.actionBtn}
                        >
                            <Trash2 size={16} color="#DC2626" />
                        </Pressable>
                        <Pressable 
                            onPress={handleAddToCart}
                            style={[styles.cartBtn, isInCart && styles.inCartBtn]}
                        >
                            <ShoppingCart size={16} color={isInCart ? '#9CA3AF' : COLORS.primary} />
                            <Text style={[styles.cartBtnText, isInCart && styles.inCartBtnText]}>
                                {isInCart ? 'In Cart' : 'Add'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        marginLeft: 16,
        flex: 1,
        justifyContent: 'space-between',
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    sellerName: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    priceContainer: {
        marginTop: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textHeadline,
    },
    originalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    discountBadge: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    discountText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 8,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 4,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: {
        fontSize: 18,
        color: '#4B5563',
        fontWeight: '500',
    },
    qtyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        minWidth: 20,
        textAlign: 'center',
    },
    actionBtn: {
        backgroundColor: '#FEF2F2',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    cartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FDF2E9',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE6D2',
        gap: 4,
    },
    inCartBtn: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    cartBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    inCartBtnText: {
        color: '#9CA3AF',
    },
});
