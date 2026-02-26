import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Pressable,
    Dimensions,
    ActivityIndicator,
    StatusBar,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Timer, Zap, Store, Star, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProductCard } from '../src/components/ProductCard';
import { productService } from '../src/services/productService';
import { discountService } from '../src/services/discountService';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Product } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FlashSale'>;

const { width } = Dimensions.get('window');

interface BadgeGroup {
    badge: string;
    products: Product[];
    color: string;
}

export default function FlashSaleScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const [badgeGroups, setBadgeGroups] = useState<BadgeGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (badgeGroups.length === 0) return;

        const updateTimer = () => {
            const allProducts = badgeGroups.flatMap(g => g.products);
            const now = new Date().getTime();
            const endTimes = allProducts
                .map(p => new Date((p as any).campaignEndsAt).getTime())
                .filter(t => t > now)
                .sort((a, b) => a - b);

            if (endTimes.length === 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const diff = endTimes[0] - now;
            setTimeLeft({
                hours: Math.floor(diff / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [badgeGroups]);

    const loadProducts = async () => {
        try {
            const data = await discountService.getFlashSaleProducts();

            // Deduplicate by product ID — a product may appear in multiple campaigns
            const seen = new Set<string>();
            const uniqueData = (data || []).filter((p: any) => {
                if (seen.has(p.id)) return false;
                seen.add(p.id);
                return true;
            });
            
            const groups = uniqueData.reduce((acc: any, product: any) => {
                const badge = product.campaignBadge || 'Flash Sale';
                if (!acc[badge]) {
                    acc[badge] = {
                        badge,
                        color: product.campaignBadgeColor || COLORS.primary,
                        products: []
                    };
                }
                acc[badge].products.push(product);
                return acc;
            }, {} as Record<string, BadgeGroup>);
            
            // Sort groups: Flash Sale first or by most products
            const sortedGroups = Object.values(groups)
                .filter((g: any) => g.products.length > 0)
                .sort((a: any, b: any) => b.products.length - a.products.length) as BadgeGroup[];
            
            setBadgeGroups(sortedGroups);

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
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Loading deals...</Text>
                        </View>
                    ) : badgeGroups.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Zap size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No flash sale products at the moment</Text>
                        </View>
                    ) : (
                        <View style={styles.groupsWrapper}>
                            {badgeGroups.map((group) => (
                                <View key={group.badge} style={styles.badgeSection}>
                                    <View style={styles.sectionHeader}>
                                        <View style={[styles.badgeIndicator, { backgroundColor: group.color }]} />
                                        <Text style={styles.sectionTitle}>{group.badge}</Text>
                                        <View style={styles.sectionLine} />
                                    </View>
                                    
                                    <View style={styles.productGrid}>
                                        {group.products.map((product) => (
                                            <View key={product.id} style={styles.productItem}>
                                                <ProductCard
                                                    product={product}
                                                    variant="flash"
                                                    onPress={() => navigation.navigate('ProductDetail', { product })}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const COLUMN_GAP = 16;
const CONTAINER_PADDING = 20;
const ITEM_WIDTH = (width - (CONTAINER_PADDING * 2) - COLUMN_GAP) / 2;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
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
    loadingContainer: { alignItems: 'center', paddingVertical: 60, flex: 1 },
    loadingText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 16, color: '#6B7280' },
    groupsWrapper: { paddingHorizontal: 0 },
    badgeSection: { marginBottom: 32 },
    sectionHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: CONTAINER_PADDING,
        marginBottom: 16,
        gap: 12,
    },
    badgeIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textHeadline,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
        marginLeft: 8,
    },
    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: CONTAINER_PADDING,
        justifyContent: 'space-between',
    },
    productItem: {
        width: ITEM_WIDTH,
        marginBottom: 20,
    }
});
