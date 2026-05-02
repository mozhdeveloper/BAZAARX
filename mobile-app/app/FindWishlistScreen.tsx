import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, User, ChevronRight, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import { LABELS } from '../src/constants/labels';
import { safeImageUri, PLACEHOLDER_AVATAR } from '../src/utils/imageUtils';
import { wishlistService, PublicRegistrySearchResult } from '../src/services/wishlistService';

export default function FindWishlistScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<PublicRegistrySearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);

        try {
            const found = await wishlistService.searchPublicRegistries(query);
            setResults(found);
        } catch (error) {
            console.error('[FindWishlistScreen] search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRegistry = (registry: PublicRegistrySearchResult) => {
        navigation.navigate('SharedWishlist', { wishlistId: registry.id });
    };

    const renderWishlistItem = useCallback(({ item }: { item: PublicRegistrySearchResult }) => (
        <Pressable style={styles.userCard} onPress={() => handleSelectRegistry(item)}>
            <Image source={{ uri: safeImageUri(undefined, PLACEHOLDER_AVATAR) }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.title}</Text>
                <Text style={styles.userLocation}>
                    {(item.category || item.event_type || 'Wishlist')} • {item.itemCount} Items
                </Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
        </Pressable>
    ), []);

    const keyExtractor = useCallback((item: PublicRegistrySearchResult) => item.id, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                        <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>{LABELS.FIND_WISHLIST}</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.input}
                        placeholder={LABELS.SEARCH_WISHLISTS}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoFocus
                    />
                    {query.length > 0 && (
                        <Pressable onPress={handleSearch} style={styles.searchBtn}>
                            <Text style={styles.searchBtnText}>Search</Text>
                        </Pressable>
                    )}
                </View>
                <Text style={styles.helperText}>Find shared {LABELS.WISHLIST_GIFTING} lists.</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    renderItem={renderWishlistItem}
                    ListEmptyComponent={
                        hasSearched ? (
                            <View style={styles.centerContainer}>
                                <Heart size={48} color="#D1D5DB" />
                                <Text style={styles.emptyTitle}>No wishlists found</Text>
                                <Text style={styles.emptyText}>Try searching for a different name.</Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    searchSection: { padding: 20 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 12,
        elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1F2937', fontWeight: '500' },
    searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 8 },
    searchBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    helperText: { fontSize: 13, color: '#6B7280', paddingLeft: 4, lineHeight: 20 },
    listContent: { paddingHorizontal: 20 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    loadingText: { marginTop: 12, color: '#6B7280' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
    emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2
    },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F3F4F6' },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
    userLocation: { fontSize: 13, color: '#6B7280' },
});
