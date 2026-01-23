import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../src/components/ProductCard';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { Pressable } from 'react-native';
import { COLORS } from '../src/constants/theme';

const { width } = Dimensions.get('window');

export default function WishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const { items, removeItem } = useWishlistStore();
    const { isGuest } = useAuthStore();
    const [showGuestModal, setShowGuestModal] = useState(false);

    useEffect(() => {
        if (isGuest) {
            setShowGuestModal(true);
        }
    }, [isGuest]);

    const handleProductPress = (product: any) => {
        navigation.navigate('ProductDetail', { product });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
                    </Pressable>
                    <Text style={styles.headerTitle}>My Wishlist</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {items.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Heart size={48} color="#D1D5DB" fill="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                        <Text style={styles.emptyText}>Tap the heart icon on products you like to save them here for later.</Text>
                        <Pressable style={styles.shopNowButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Shop' })}>
                            <ShoppingBag size={20} color="#FFF" />
                            <Text style={styles.shopNowText}>Start Shopping</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <Text style={styles.countText}>{items.length} Items Saved</Text>
                        <View style={styles.grid}>
                            {items.map((item) => (
                                <View key={item.id} style={styles.productWrapper}>
                                    <ProductCard
                                        product={item}
                                        onPress={() => handleProductPress(item)}
                                    />
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            <GuestLoginModal
                visible={showGuestModal}
                onClose={() => {
                    navigation.navigate('MainTabs', { screen: 'Home' });
                }}
                message="Sign up to save items to your wishlist."
                hideCloseButton={true}
                cancelText="Go back to Home"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingBottom: 20,
        marginBottom: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerIconButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        minHeight: '100%',
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    productWrapper: {
        width: (width - 48) / 2,
        marginBottom: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    shopNowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FF5722',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#FF5722',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    shopNowText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
});
