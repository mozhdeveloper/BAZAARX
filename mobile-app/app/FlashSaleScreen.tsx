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
import { ArrowLeft, Timer, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Product } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlashSale'>;

const { width } = Dimensions.get('window');

export default function FlashSaleScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const [products, setProducts] = useState<Product[]>([]);
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
            const data = await productService.getProducts();
            // Simulate flash sale: show discounted products
            const flashProducts = data.map(p => ({
                ...p,
                original_price: p.original_price || Math.round(p.price * 1.5),
                category: typeof p.category === 'string' ? p.category : p.category?.name || 'General',
            })) as any as Product[];
            setProducts(flashProducts);
        } catch (err) {
            console.error('Failed to load flash sale products:', err);
        } finally {
            setLoading(false);
        }
    };

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
        <LinearGradient
            colors={['#FFE5CC', '#FFE5CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.container}
        >
            <View style={{ flex: 1, paddingTop: insets.top }}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Zap size={20} color={COLORS.primary} fill={COLORS.primary} />
                        <Text style={styles.headerTitle}>Flash Sale</Text>
                    </View>
                    <View style={styles.timerRow}>
                        <Timer size={16} color="#1F2937" />
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
                </View>

                {/* Products Grid */}
                <ScrollView
                    style={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridContainer}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading deals...</Text>
                        </View>
                    ) : products.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Zap size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No flash sale products at the moment</Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {products.map((product) => (
                                <View key={product.id} style={styles.productCard}>
                                    <ProductCard
                                        product={product}
                                        onPress={() => navigation.navigate('ProductDetail', { product })}
                                    />
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: { padding: 4, marginRight: 12 },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timerBox: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    timerDigit: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
    timerSep: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
    scrollContent: { flex: 1 },
    gridContainer: { padding: 16 },
    loadingContainer: { alignItems: 'center', paddingVertical: 60 },
    loadingText: { fontSize: 16, color: '#6B7280' },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    productCard: {
        width: (width - 48) / 2,
        marginBottom: 16,
        backgroundColor: '#FFF',
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
});
