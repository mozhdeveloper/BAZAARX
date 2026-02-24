import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Pressable,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Timer, Zap, Store, BadgeCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Product } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlashSale'>;

const { width } = Dimensions.get('window');

interface SellerGroup {
    sellerName: string;
    sellerId: string;
    isVerified: boolean;
    products: Product[];
}

export default function FlashSaleScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const [groupedProducts, setGroupedProducts] = useState<SellerGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 12, seconds: 56 });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { hours, minutes, seconds } = prev;
                seconds--;
                if (seconds < 0) { seconds = 59; minutes--; }
                if (minutes < 0) { minutes = 59; hours--; }
                if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
                return { hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const loadProducts = async () => {
        try {
            const data = await productService.getProducts({ isActive: true, approvalStatus: 'approved' });
            // Process and group products
            const productsWithSellers = (data || []).map((row: any) => {
                const images = row.images?.map((img: any) => typeof img === 'string' ? img : img.image_url) || [];
                const primaryImage = images[0] || row.primary_image || '';
                return {
                    id: row.id,
                    name: row.name,
                    price: row.price,
                    originalPrice: row.original_price,
                    image: primaryImage,
                    category: row.category?.name || 'General',
                    seller: row.seller?.store_name || 'Generic Store',
                    sellerId: row.seller_id || row.seller?.id,
                    sellerVerified: !!row.seller?.verified_at,
                    stock: row.stock || 10,
                    sold: row.sold || 0,
                } as any as Product;
            });

            const groups = productsWithSellers.reduce((acc, product) => {
                const sName = product.seller || 'Unknown Seller';
                if (!acc[sName]) {
                    acc[sName] = {
                        sellerName: sName,
                        sellerId: product.sellerId || '',
                        isVerified: !!product.sellerVerified,
                        products: []
                    };
                }
                acc[sName].products.push(product);
                return acc;
            }, {} as Record<string, SellerGroup>);
            
            setGroupedProducts(Object.values(groups).filter(g => g.products.length > 0));

        } catch (err) {
            console.error('Failed to load flash sale products:', err);
        } finally {
            setLoading(false);
        }
    };

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
        <View style={styles.container}>
            <View style={{ flex: 1, paddingTop: insets.top }}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* Header */}
                <LinearGradient
                    colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={COLORS.textHeadline} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Zap size={20} color={COLORS.primary} fill={COLORS.primary} />
                        <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Flash Sale</Text>
                    </View>
                    <View style={styles.timerRow}>
                        <Timer size={16} color={COLORS.primary} strokeWidth={2.5} />
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.hours)}</Text>
                        </View>
                        <Text style={styles.timerSep}>:</Text>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.minutes)}</Text>
                        </View>
                        <Text style={styles.timerSep}>:</Text>
                        <View style={styles.timerBox}>
                            <Text style={styles.timerDigit}>{pad(timeLeft.seconds)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Products Area */}
                <ScrollView
                    style={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContainer}
                >
                    <View style={styles.heroBox}>
                        <Zap size={40} color="#EA580C" fill="#EA580C" style={styles.heroZap} />
                        <Text style={styles.heroTitle}>Limited Time Deals!</Text>
                        <Text style={styles.heroSub}>Exclusive offers created directly by verified sellers.</Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading deals...</Text>
                        </View>
                    ) : groupedProducts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Zap size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No flash sale products at the moment</Text>
                        </View>
                    ) : (
                        <View style={styles.gridContainer}>
                            {groupedProducts.flatMap(g => g.products).map((product) => (
                                <View key={product.id} style={styles.productCardContainer}>
                                    <ProductCard
                                        product={product}
                                        variant="flash"
                                        onPress={() => navigation.navigate('ProductDetail', { product })}
                                    />
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        paddingTop: 15,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
    },
    backBtn: { padding: 4, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textHeadline },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' },
    timerBox: {
        backgroundColor: COLORS.primary,
        borderRadius: 4,
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerDigit: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    timerSep: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold', paddingBottom: 2 },
    scrollContent: { flex: 1 },
    scrollContainer: { paddingBottom: 40 },
    heroBox: {
        padding: 30,
        alignItems: 'center',
    },
    heroZap: { marginBottom: 12, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
    heroTitle: { fontSize: 26, fontWeight: '900', color: '#7C2D12', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    heroSub: { fontSize: 14, color: '#9A3412', textAlign: 'center', paddingHorizontal: 20, fontWeight: '500' },
    loadingContainer: { alignItems: 'center', paddingVertical: 60 },
    loadingText: { fontSize: 16, color: '#6B7280' },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    gridContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    productCardContainer: {
        width: (width - 40 - 15) / 2, // 40 for container padding, 15 for gap
        marginBottom: 20,
    }
});
